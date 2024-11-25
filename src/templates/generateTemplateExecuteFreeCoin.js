import moment from 'moment';
import mongoose from 'mongoose';
import { LIST_AMOUNTS_IN_FREE_COIN } from '../../utils/constant.js';
import { STATUS_JOB, SYMBOL_NATIVE, SYMBOL_TOKEN, TYPE_TEMPLATE } from '../../utils/enum.js';
import { arrayRange } from '../../utils/index.js';
import {
  randomDatetimesFromRange,
  randomFloatBetween,
  randomMultipleFromArray,
  randomOneFromArray,
} from '../../utils/random.js';
import { fecthPriceFLCR, fecthPriceTokenByBinance } from '../handlers/common.js';
import agendaFreeCoin from '../jobs/agendaFreeCoin.js';
import ExecuteTemplateFreeCoinModel from '../models/ExecuteTemplateFreeCoin.js';
import ScheduleExecuteFreeCoinModel from '../models/ScheduleExecuteFreeCoin.js';
import TemplateModel from '../models/Template.js';
import WalletModel, { saveWalletsByIndexes } from '../models/Wallet.js';

export const generateTemplateExecuteFreeCoin = async ({
  chainId,
  scheduleId,
  isRepeat,
  kpiUAW,
  numberNewWallets,
  amountMin,
  amountMax,
  date,
  indexWalletsUsed,
  session,
}) => {
  let agendaJobs = [];

  try {
    let listIdExecuteTemplate = [];
    let totalWallet = 0;
    let totalUAW = 0;
    indexWalletsUsed = indexWalletsUsed ? indexWalletsUsed : [];
    let selectedTemplates = [];
    let amountsIn = [];

    const filter = { is_active: true, type: TYPE_TEMPLATE.free_coin_balance };

    let countTemplate = await TemplateModel.count(filter);
    if (countTemplate <= 0) throw { error: 'Templates data is empty' };

    let templates = await TemplateModel.find(filter);

    const priceNative = await fecthPriceTokenByBinance({ chainId, symbolToken: SYMBOL_NATIVE[chainId] }); // price Native/USDT
    const rateFLCR_Native = await fecthPriceFLCR({ chainId }); // price FLCR/Native
    const priceLCR = parseFloat(rateFLCR_Native) * parseFloat(priceNative); // price LCR

    let indexTemplate = 0;
    console.log('\n[Free Coin] Start Generate Template Execute....\n');
    while (totalUAW < kpiUAW) {
      indexTemplate = indexTemplate > templates.length - 1 ? 0 : indexTemplate;
      let template = templates[indexTemplate];
      selectedTemplates.push(template);
      const firtJob = template.jobs.at(0);
      const list_amounts_in = LIST_AMOUNTS_IN_FREE_COIN.filter(amount => amountMin <= amount && amount <= amountMax);
      let randomAmount = randomOneFromArray(list_amounts_in);
      let delta = randomFloatBetween(-0.0234245, 0.053624234);
      let amountIn = !randomAmount ? LIST_AMOUNTS_IN_FREE_COIN.at(0) : randomAmount; // if symbol token in is USDT
      amountIn += delta;
      if (firtJob.symbol_token_in == SYMBOL_TOKEN.LCR) amountIn = randomAmount / priceLCR;
      if (firtJob.symbol_token_in == SYMBOL_NATIVE[chainId]) amountIn = randomAmount / priceNative;

      amountsIn.push(amountIn);

      totalWallet += template.number_wallets;
      totalUAW += template.number_uaw;

      indexTemplate++;
    }
    console.log('\n[Free Coin] Choose Templates and Amounts Done!\n');

    console.log('\n[Free Coin] Choose Index Wallets...\n');
    // Choose a wallet using the new wallet conditions and the rest use the old wallet <=> KPI UAW
    let indexMaxCurrent = await WalletModel.find({ chain_id: chainId }).sort({ index: -1 }).limit(1);
    if (indexMaxCurrent.length <= 0) indexMaxCurrent = 0;
    if (indexMaxCurrent.length > 0) indexMaxCurrent = indexMaxCurrent[0].index;
    let indexNewStart = indexMaxCurrent;
    let indexNewEnd = indexMaxCurrent + numberNewWallets;
    let allIndexWallets = arrayRange({ start: indexNewStart, stop: indexNewEnd, step: 1 });

    if (allIndexWallets.length < totalWallet) {
      let limit = totalWallet - allIndexWallets.length;
      const walletsOld = await WalletModel.aggregate([
        { $match: { index: { $nin: indexWalletsUsed }, is_using: false, chain_id: chainId } },
        { $sample: { size: parseInt(limit) } },
      ]);
      let indexNeedMore = walletsOld.map(wallet => wallet.index);
      if (indexNeedMore.length < limit) {
        let numberWalletsNewNeedMore = limit - indexNeedMore.length;
        indexNewStart = indexNewEnd + 1;
        indexNewEnd = indexNewStart + numberWalletsNewNeedMore;
        let indexNewNeedMore = arrayRange({ start: indexNewStart, stop: indexNewEnd, step: 1 });
        indexNeedMore = indexNeedMore.concat(indexNewNeedMore);
      }
      allIndexWallets = allIndexWallets.concat(indexNeedMore);
    }
    console.log('\n[Free Coin] Choose Index Wallets Done!\n');
    //////////////////////////////////////////////////////////////////////////////////

    console.log('\n[Free Coin] Generate Times Schedule...\n');
    let scheduleRandomTimeExecute = randomDatetimesFromRange(
      moment().add(30, 'seconds'),
      moment(date).add(19, 'hours'),
      selectedTemplates.length,
    );
    console.log('\n[Free Coin] Generate Times Schedule Done!\n');

    console.log('\n[Free Coin] Schedule Jobs In Queue...\n');
    for (let i = 0; i < selectedTemplates.length; i++) {
      const template = selectedTemplates[i];
      const amountIn = parseFloat(amountsIn[i]);
      let indexWallets = randomMultipleFromArray(allIndexWallets, template.number_wallets);

      const id_execute_template = new mongoose.Types.ObjectId();
      listIdExecuteTemplate.push(id_execute_template);
      let jobs = await Promise.all(
        template.jobs.map(async template => {
          let obj = {
            date,
            schedule_id: scheduleId,
            is_repeat: isRepeat,
            name_job: template.name_job,
            index: template.index,
            i_index_wallets_in: template.i_index_wallets_in,
            i_index_wallets_out: template.i_index_wallets_out,
            index_wallet_in: template.i_index_wallets_in == null ? null : indexWallets[template.i_index_wallets_in],
            index_wallet_out: template.i_index_wallets_out == null ? null : indexWallets[template.i_index_wallets_out],
            address_wallet_in: null,
            address_wallet_out: null,
            symbol_token_in: template.symbol_token_in,
            symbol_token_out: template.symbol_token_out,
          };
          if (template.index == 0) {
            const data = {
              date,
              id_execute_template,
              schedule_id: scheduleId,
              is_repeat: isRepeat,
              chain_id: chainId,
              index_wallet_in: obj.index_wallet_in,
              index_wallet_out: obj.index_wallet_out,
              address_wallet_in: null,
              address_wallet_out: null,
              symbol_token_in: template.symbol_token_in,
              symbol_token_out: template.symbol_token_out,
              amount: amountIn,
              job_index: template.index,
            };

            let schedule = await agendaFreeCoin.schedule(scheduleRandomTimeExecute[i], template.name_job, { ...data });
            schedule.attrs.data.job_id = schedule.attrs._id;
            await schedule.save();
            obj.job_id = schedule.attrs._id;
            obj.run_at = schedule.attrs.nextRunAt;
            obj.amount = amountIn;
            agendaJobs.push(schedule.attrs._id);
          }
          return obj;
        }),
      );

      let newExecuteTemplate = new ExecuteTemplateFreeCoinModel({
        _id: id_execute_template,
        schedule_id: scheduleId,
        is_repeat: isRepeat,
        chain_id: chainId,
        date,
        template: template.name,
        template_id: template._id,
        index_wallets: indexWallets,
        jobs: jobs,
        status: STATUS_JOB.queued,
      });

      await newExecuteTemplate.save({ session });

      allIndexWallets = allIndexWallets.filter(w => !indexWallets.includes(w));
      indexWalletsUsed = indexWalletsUsed.concat(indexWallets);
    }
    console.log('\n[Free Coin] Schedule Jobs In Queue Done!\n');

    let schedule = await ScheduleExecuteFreeCoinModel.findById(scheduleId);

    console.log('\n[Free Coin] Update `list_index_wallets_used` and `list_id_execute_template` To Schedule...\n');
    if (schedule) {
      const newListIndexWalletsUsed = [...new Set([...schedule.list_index_wallets_used, ...indexWalletsUsed])];
      const newListIdExecuteTemplate = schedule.list_id_execute_template.concat(listIdExecuteTemplate);
      await schedule.updateOne(
        { list_index_wallets_used: newListIndexWalletsUsed, list_id_execute_template: newListIdExecuteTemplate },
        { session },
      );
    }
    console.log('\n[Free Coin] Update `list_index_wallets_used` and `list_id_execute_template` To Schedule Done!\n');

    console.log('\nUpdate Wallets To Using...\n');
    await saveWalletsByIndexes({ chainId, indexWallets: indexWalletsUsed, is_using: true, session });
    await saveWalletsByIndexes({ chainId, indexWallets: allIndexWallets, is_using: false, session });
    console.log('\n[Free Coin] Update Wallets To Using Done!\n');

    return {
      status: true,
      error: null,
      agendaJobs,
      indexWalletsUsed,
      listIdExecuteTemplate,
    };
  } catch (error) {
    return {
      status: false,
      error,
      agendaJobs,
      indexWalletsUsed: [],
      listIdExecuteTemplate: [],
    };
  }
};
