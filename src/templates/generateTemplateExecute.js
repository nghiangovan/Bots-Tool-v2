import moment from 'moment';
import mongoose from 'mongoose';
import { NAME_JOB, STATUS_JOB, SYMBOL_NATIVE, SYMBOL_TOKEN, TYPE_TEMPLATE } from '../../utils/enum.js';
import { arrayRange } from '../../utils/index.js';
import {
  geoRandom,
  normalizeRandom,
  randomDatetimesFromRange,
  randomIntBetween,
  randomMultipleFromArray,
  shuffle,
} from '../../utils/random.js';
import { fecthPriceLCR_USDT, fecthPriceNative_USDT, getWalletByIndexOffChain } from '../handlers/common.js';
import agenda from '../jobs/agenda.js';
import ExecuteTemplateModel from '../models/ExecuteTemplate.js';
import ExecuteTemplateFreeCoinModel from '../models/ExecuteTemplateFreeCoin.js';
import ScheduleExecuteAutoModel from '../models/ScheduleExecuteAuto.js';
import ScheduleExecuteFreeCoinModel from '../models/ScheduleExecuteFreeCoin.js';
import ScheduleExecuteManualModel from '../models/ScheduleTemplateManual.js';
import TemplateModel from '../models/Template.js';
import WalletModel, { saveWalletsByIndexes } from '../models/Wallet.js';
// import { connectMongoDB } from '../../database/conection.js';

export const generateTemplateExecute = async ({
  chainId,
  scheduleId,
  isRepeat,
  kpiUAW,
  kpiVolume,
  numberNewWallets,
  date,
  indexWalletsUsed,
  session,
}) => {
  let agendaJobs = [];
  let listIdExecuteTemplate = [];
  chainId = String(chainId);
  const chain_id = chainId;

  try {
    let totalWallet = 0;
    let totalUAW = 0;
    indexWalletsUsed = indexWalletsUsed ? indexWalletsUsed : [];
    let selectedTemplates = [];

    // const formatDate = moment(date, FORMAT_DATE);
    // const day = formatDate.date();
    // const typeNumbder = checkOddOrEvenNumber(day);
    // const filter =
    //   typeNumbder == 'even'
    //     ? { is_active: true, type: { $in: [TYPE_TEMPLATE.balance, TYPE_TEMPLATE.gaps_seller] } }
    //     : { is_active: true, type: { $in: [TYPE_TEMPLATE.balance, TYPE_TEMPLATE.gaps_buyer] } };

    const filter = { is_active: true, type: { $in: [TYPE_TEMPLATE.balance] } };

    let countTemplate = await TemplateModel.count(filter);
    if (countTemplate <= 0) throw { error: 'Templates data is empty' };

    let templates = await TemplateModel.find(filter).sort({ _id: 1 });
    const priceNative = await fecthPriceNative_USDT({ chainId }); // price Native/USDT
    const priceLCR = await fecthPriceLCR_USDT({ chainId }); // price LCR/USDT

    let indexTemplate = 0;
    let countSwap = 0;
    console.log('\nStart Generate Template Execute....\n');
    while (totalUAW < kpiUAW) {
      indexTemplate = indexTemplate > templates.length - 1 ? 0 : indexTemplate;
      let template = templates[indexTemplate];
      selectedTemplates.push(template);

      const countSwapOfTemplate = template.jobs.filter(i => i.name_job == NAME_JOB.onChain.swap_token_to_token_our_dex);
      if (countSwapOfTemplate.length > 0) countSwap += countSwapOfTemplate.length;

      totalWallet += template.number_wallets;
      totalUAW += template.number_uaw;

      indexTemplate++;
    }
    console.log('\nChoose Templates and Amounts Done!\n');

    let randomSelectJobSwap = [];
    let mapRandomSelectJobSwap = {};
    let numberGapSwap = 0;
    const randomGapSwap = randomIntBetween(-10, 10);
    if (randomGapSwap != 0) {
      const filterJobSwap = shuffle(
        (
          await Promise.all(
            selectedTemplates.map((template, indexTemplate) => {
              const job_name = NAME_JOB.onChain.swap_token_to_token_our_dex;
              const jobs =
                randomGapSwap > 0
                  ? template.jobs.filter(job => job.name_job == job_name && job.symbol_token_out == SYMBOL_TOKEN.LCR)
                  : template.jobs.filter(job => job.name_job == job_name && job.symbol_token_in == SYMBOL_TOKEN.LCR);
              return jobs.map(job => ({ indexTemplate, job_index: job.index }));
            }),
          )
        ).flat(1),
      );
      randomSelectJobSwap = randomMultipleFromArray(
        filterJobSwap,
        Math.round(0.01 * Math.abs(randomGapSwap) * filterJobSwap.length),
      );
      numberGapSwap = randomSelectJobSwap.length || 0;
      totalWallet += numberGapSwap;
      randomSelectJobSwap.map(job => {
        const data = mapRandomSelectJobSwap[job.indexTemplate];
        mapRandomSelectJobSwap[job.indexTemplate] = data ? data.concat(job) : [job];
      });
    }

    console.log('\nChoose Index Wallets...\n');
    // Choose a wallet using the new wallet conditions and the rest use the old wallet <=> KPI UAW
    let indexMaxCurrent = await WalletModel.find({ chain_id }).sort({ index: -1 }).limit(1);
    if (indexMaxCurrent.length <= 0) indexMaxCurrent = 0;
    if (indexMaxCurrent.length > 0) indexMaxCurrent = indexMaxCurrent[0].index;
    let indexNewStart = indexMaxCurrent;
    let indexNewEnd = indexMaxCurrent + numberNewWallets;
    let allIndexWallets = arrayRange({ start: indexNewStart, stop: indexNewEnd, step: 1 });

    if (allIndexWallets.length < totalWallet) {
      let limit = totalWallet - allIndexWallets.length;
      const walletsOld = await WalletModel.aggregate([
        { $match: { index: { $nin: indexWalletsUsed }, is_using: false, chain_id } },
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
    console.log('\nChoose Index Wallets Done!\n');
    //////////////////////////////////////////////////////////////////////////////////

    console.log('\nGenerate Times Schedule...\n');
    const start_time_day = moment(date).diff(moment(), 'minutes') > 0 ? moment(date) : moment();
    const start_time = start_time_day.add(10, 'minutes');
    const end_time = moment(date).add(20, 'hours');
    let scheduleRandomTimeExecute = randomDatetimesFromRange(start_time, end_time, selectedTemplates.length);
    console.log('\nGenerate Times Schedule Done!\n');

    console.log('\nSchedule Jobs In Queue...\n');
    const average = parseFloat(kpiVolume) / countSwap;
    for (let i = 0; i < selectedTemplates.length; i++) {
      const template = selectedTemplates[i];

      const randomAmount = normalizeRandom(geoRandom(average));
      let amountIn = parseFloat(randomAmount);
      const firtJob = template.jobs.at(0);
      if (firtJob.symbol_token_in == SYMBOL_TOKEN.LCR) amountIn = parseFloat(randomAmount) / priceLCR;
      if (firtJob.symbol_token_in == SYMBOL_NATIVE[chainId]) amountIn = parseFloat(randomAmount) / priceNative;

      const numberWallets = template.number_wallets;

      const listJobs = mapRandomSelectJobSwap[i];
      let mapIndexJobGap = {};
      if (listJobs) listJobs.map((it, ix) => (mapIndexJobGap[it.job_index] = numberWallets + ix));
      const walletMore = listJobs ? listJobs.length : 0;

      let indexWallets = randomMultipleFromArray(allIndexWallets, numberWallets + walletMore);

      const id_execute_template = new mongoose.Types.ObjectId();
      listIdExecuteTemplate.push(id_execute_template);

      let indexsWalletSplit = [];
      let jobs = await Promise.all(
        template.jobs.map(async t => {
          const index_wallet_split = t.i_index_wallet_split == null ? null : indexWallets[t.i_index_wallet_split];
          if (index_wallet_split != null) indexsWalletSplit.push(index_wallet_split);
          let obj = {
            date,
            schedule_id: scheduleId,
            is_repeat: isRepeat,
            name_job: t.name_job,
            index: t.index,
            i_index_wallets_in: t.i_index_wallets_in,
            i_index_wallets_out: t.i_index_wallets_out,
            index_wallet_in: t.i_index_wallets_in == null ? null : indexWallets[t.i_index_wallets_in],
            index_wallet_out: t.i_index_wallets_out == null ? null : indexWallets[t.i_index_wallets_out],
            address_wallet_in: null,
            address_wallet_out: null,
            symbol_token_in: t.symbol_token_in,
            symbol_token_out: t.symbol_token_out,
            is_split: t?.is_split || false,
            index_wallet_split,
            is_leave_an_amount: t?.is_leave_an_amount || false,
            is_gap: !!mapIndexJobGap[t.index],
            index_wallet_gap: indexWallets[mapIndexJobGap[t.index]] || null,
          };
          if (t.index == 0) {
            const data = {
              date,
              id_execute_template,
              schedule_id: scheduleId,
              is_repeat: isRepeat,
              chain_id,
              index_wallet_in: obj.index_wallet_in,
              index_wallet_out: obj.index_wallet_out,
              address_wallet_in: null,
              address_wallet_out: null,
              symbol_token_in: t.symbol_token_in,
              symbol_token_out: t.symbol_token_out,
              amount: amountIn,
              job_index: t.index,
            };

            let schedule = await agenda.schedule(scheduleRandomTimeExecute[i], t.name_job, { ...data });
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

      let indexWalletsSave = indexWallets;

      if (indexsWalletSplit.length > 0) indexWalletsSave = indexWallets.filter(w => !indexsWalletSplit.includes(w));

      let indexWalletsGap = Object.keys(mapIndexJobGap).map(key => indexWallets[mapIndexJobGap[key]]);
      if (indexWalletsGap.length > 0) indexWalletsSave = indexWalletsSave.filter(w => !indexWalletsGap.includes(w));

      let newExecuteTemplate = new ExecuteTemplateModel({
        _id: id_execute_template,
        schedule_id: scheduleId,
        is_repeat: isRepeat,
        chain_id,
        date,
        template: template.name,
        template_id: template._id,
        index_wallets: indexWalletsSave,
        jobs: jobs,
        status: STATUS_JOB.queued,
      });

      await newExecuteTemplate.save();

      allIndexWallets = allIndexWallets.filter(w => !indexWallets.includes(w));
      indexWalletsUsed = indexWalletsUsed.concat(indexWallets);
    }
    console.log('\nSchedule Jobs In Queue Done!\n');

    let schedule = null;
    if (isRepeat == true) {
      schedule = await ScheduleExecuteAutoModel.findById(scheduleId);
    } else if (isRepeat == false) {
      schedule = await ScheduleExecuteManualModel.findById(scheduleId);
    }

    console.log('\nUpdate `list_index_wallets_used` and `list_id_execute_template` To Schedule...\n');
    if (schedule) {
      const newListIndexWalletsUsed = [...new Set([...schedule.list_index_wallets_used, ...indexWalletsUsed])];
      const newListIdExecuteTemplate = schedule.list_id_execute_template.concat(listIdExecuteTemplate);
      await schedule.updateOne(
        {
          list_index_wallets_used: newListIndexWalletsUsed,
          list_id_execute_template: newListIdExecuteTemplate,
          random_gaps_buy_sell: randomGapSwap,
        },
        { session },
      );
    }
    console.log('\nUpdate `list_index_wallets_used` and `list_id_execute_template` To Schedule Done!\n');

    console.log('\nUpdate Wallets To Using...\n');
    await saveWalletsByIndexes({ chainId, indexWallets: indexWalletsUsed, is_using: true, session });
    await saveWalletsByIndexes({ chainId, indexWallets: allIndexWallets, is_using: false, session });
    console.log('\nUpdate Wallets To Using Done!\n');

    // console.log(`Buff Gas For indexWalletsUsed...`);
    // await buffGasFeeBatchForIndexWallets({ chainId, indexWallets: indexWalletsUsed });
    // console.log('Buff Gas For indexWalletsUsed Done!');

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

export const generateTemplateExecuteSpecific = async ({
  scheduleId,
  executeId,
  isRepeat,
  chainId,
  date,
  templateId,
  indexWallets,
  amount,
  queue,
  runAt,
  isFreeCoin = false,
}) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  let agendaJobs = [];
  chainId = String(chainId);
  const chain_id = chainId;

  try {
    runAt = runAt || moment(randomDatetimesFromRange(moment().add(10, 'minutes'), moment().add(15, 'minutes'), 1)[0]);

    const template = await TemplateModel.findById(templateId);
    if (!template) throw { error: 'Template not found!' };

    const execute = executeId ? await ExecuteTemplateModel.findById(executeId) : null;

    if (!indexWallets || indexWallets?.length <= 0) {
      let indexMaxCurrent = await WalletModel.findOne({ chain_id }).sort({ index: -1 }).limit(1);
      if (!indexMaxCurrent) indexMaxCurrent = 0;
      if (indexMaxCurrent) indexMaxCurrent = indexMaxCurrent?.index;
      const start = indexMaxCurrent + 1;
      const stop = start + template.number_wallets;
      indexWallets = arrayRange({ start, stop, step: 1 });
    }

    const amountIn = amount;

    const id_execute_template = new mongoose.Types.ObjectId();
    let jobs = await Promise.all(
      template.jobs.map(async t => {
        const index_wallet_in = t.i_index_wallets_in == null ? null : indexWallets[t.i_index_wallets_in];
        const index_wallet_out = t.i_index_wallets_out == null ? null : indexWallets[t.i_index_wallets_out];
        const address_in =
          index_wallet_in == null ? null : getWalletByIndexOffChain({ indexWallet: index_wallet_in }).address;
        const address_out =
          index_wallet_out == null ? null : getWalletByIndexOffChain({ indexWallet: index_wallet_out }).address;
        let obj = {
          date,
          schedule_id: scheduleId,
          is_repeat: isRepeat,
          name_job: t.name_job,
          index: t.index,
          i_index_wallets_in: t.i_index_wallets_in,
          i_index_wallets_out: t.i_index_wallets_out,
          index_wallet_in,
          index_wallet_out,
          address_wallet_in: address_in,
          address_wallet_out: address_out,
          symbol_token_in: t.symbol_token_in,
          symbol_token_out: t.symbol_token_out,
          is_split: t?.is_split || false,
          index_wallet_split: execute?.jobs[t.index]?.index_wallet_split || null,
          is_leave_an_amount: t?.is_leave_an_amount || false,
          is_gap: !!execute?.jobs[t.index]?.is_gap || false,
          index_wallet_gap: execute?.jobs[t.index]?.index_wallet_gap || null,
        };

        if (execute && execute.stop_current >= t.index) obj = { ...obj, is_split: false, is_gap: false };

        if (t.index == 0) {
          const data = {
            date,
            id_execute_template,
            schedule_id: scheduleId,
            is_repeat: isRepeat,
            chain_id,
            index_wallet_in: obj.index_wallet_in,
            index_wallet_out: obj.index_wallet_out,
            address_wallet_in: address_in,
            address_wallet_out: address_out,
            symbol_token_in: t.symbol_token_in,
            symbol_token_out: t.symbol_token_out,
            amount: amountIn,
            job_index: t.index,
          };

          let schedule = await queue.schedule(runAt, t.name_job, { ...data });
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

    if (isFreeCoin) {
      let newExecuteTemplateFreeCoin = new ExecuteTemplateFreeCoinModel({
        _id: id_execute_template,
        schedule_id: scheduleId,
        is_repeat: isRepeat,
        is_reschedule: true,
        chain_id,
        date,
        template: template.name,
        index_wallets: indexWallets,
        jobs: jobs,
        status: STATUS_JOB.queued,
      });
      await newExecuteTemplateFreeCoin.save({ session });
    } else {
      let newExecuteTemplate = new ExecuteTemplateModel({
        _id: id_execute_template,
        schedule_id: scheduleId,
        is_repeat: isRepeat,
        chain_id,
        date,
        template: template.name,
        template_id: template._id,
        index_wallets: indexWallets,
        jobs: jobs,
        status: STATUS_JOB.queued,
      });
      await newExecuteTemplate.save({ session });
    }

    let schedule = null;
    if (isFreeCoin) {
      schedule = await ScheduleExecuteFreeCoinModel.findById(scheduleId);
    } else if (!isFreeCoin && isRepeat == true) {
      schedule = await ScheduleExecuteAutoModel.findById(scheduleId);
    } else if (!isFreeCoin && isRepeat == false) {
      schedule = await ScheduleExecuteManualModel.findById(scheduleId);
    }

    if (schedule) {
      const newListIdExecuteTemplate = schedule.list_id_execute_template.concat([id_execute_template]);
      await schedule.updateOne({ list_id_execute_template: newListIdExecuteTemplate }, { session });
    } else throw { error: 'Schedule not found!' };

    await saveWalletsByIndexes({ chainId, indexWallets, is_using: true, session });

    await session.commitTransaction();

    return {
      status: true,
      error: null,
    };
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();
    await queue.cancel({ _id: { $in: agendaJobs } });
    return {
      status: false,
      error,
    };
  }
};

// connectMongoDB();

// generateTemplateExecute({
//   chainId: 56,
//   scheduleId: null,
//   isRepeat: true,
//   kpiUAW: 3967,
//   kpiVolume: 129124,
//   numberNewWallets: 0,
//   amountMin: 4,
//   amountMax: 100,
//   date: '2023-10-23',
//   session: null,
// });
