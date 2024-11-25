// import mongoose from 'mongoose';
// import { connectMongoDB } from '../../../database/conection.js';
import moment from 'moment';
import { ZERO_ADDRESS, getMapToken } from '../../../configs/addresses.js';
import ERC20 from '../../../modules/wallet/transfer/ERC20.js';
import Native from '../../../modules/wallet/transfer/Native.js';
import { FEE_WITHDRAW_TOKEN } from '../../../utils/constant.js';
import { NAME_JOB, STATUS_JOB, SYMBOL_TOKEN, TYPE_TEMPLATE } from '../../../utils/enum.js';
import { formatFloorNearest, formatFloorNumber, weiToEther } from '../../../utils/format.js';
import { randomDatetimesFromRange, randomFloatBetween } from '../../../utils/random.js';
import { assetsRecoveryToSource } from '../../handlers/assetsRecovery.js';
import { getHoldingAmountBot, getWalletByIndexOffChain } from '../../handlers/common.js';
import { cancelExecuteAndReschedule, maxNumberDecimal } from '../../handlers/functions.js';
import ExecuteTemplateModel from '../../models/ExecuteTemplate.js';
import { saveWalletsByIndexes } from '../../models/Wallet.js';
import { generateTemplateExecuteSpecific } from '../../templates/generateTemplateExecute.js';
import agenda from '../agenda.js';
import TemplateModel from '../../models/Template.js';

export const scheduleNextJob = async ({ job, amountOut }) => {
  amountOut = amountOut ? parseFloat(maxNumberDecimal(amountOut)) : null;
  try {
    const { chain_id, schedule_id, is_repeat, id_execute_template, job_index } = job.attrs.data;
    const executeTemplate = await ExecuteTemplateModel.findById(id_execute_template);

    const date = executeTemplate.date;

    let maxIndexJob = Math.max(...executeTemplate.jobs.map(o => o.index));

    if (job_index < maxIndexJob) {
      let native = new Native({
        chainId: chain_id,
      });

      let jobNext = executeTemplate.jobs.find(j => j.index == job_index + 1);
      let indexNext = executeTemplate.jobs.findIndex(j => j.index == job_index + 1);

      const address_in =
        jobNext.index_wallet_in == null
          ? null
          : getWalletByIndexOffChain({ indexWallet: jobNext.index_wallet_in }).address;
      const address_out =
        jobNext.index_wallet_out == null
          ? null
          : getWalletByIndexOffChain({ indexWallet: jobNext.index_wallet_out }).address;
      let data = {
        date,
        schedule_id,
        is_repeat,
        id_execute_template,
        job_index: job_index + 1,
        chain_id,
        i_index_wallets_in: jobNext.i_index_wallets_in,
        i_index_wallets_out: jobNext.i_index_wallets_out,
        index_wallet_in: jobNext.index_wallet_in,
        index_wallet_out: jobNext.index_wallet_out,
        address_wallet_in: address_in,
        address_wallet_out: address_out,
        symbol_token_in: jobNext.symbol_token_in,
        symbol_token_out: jobNext.symbol_token_out,
        is_split: jobNext?.is_split || false,
        index_wallet_split: jobNext?.index_wallet_split,
        is_leave_an_amount: jobNext?.is_leave_an_amount || false,
        is_gap: jobNext.is_gap || false,
        index_wallet_gap: jobNext.index_wallet_gap,
      };

      if (amountOut && job.attrs.data.symbol_token_out == jobNext.symbol_token_in) {
        data.amount = formatFloorNearest(amountOut);
      } else {
        const walletInNext = getWalletByIndexOffChain({ indexWallet: data.index_wallet_in });
        const tokenInNext = getMapToken(chain_id, data.symbol_token_in);
        if (!tokenInNext) throw { error: 'Token not supported' };
        let erc20 = new ERC20({ chainId: chain_id, token: tokenInNext.address });
        const balanceTokenWei = await erc20.balanceOf({ address: walletInNext.address });

        if (data.index_wallet_in == null && data.index_wallet_out != null /* - Withdraw utt -  */) {
          data.amount = parseFloat(job.attrs.data.amount) - FEE_WITHDRAW_TOKEN;
          data.amount = data.amount > 0 ? formatFloorNearest(data.amount) : 0;
        } else if (tokenInNext.address == ZERO_ADDRESS) {
          const balanceNativeInNextWei = await native.balanceOf({ address: walletInNext.address });
          const balanceNativeInNextEther = parseFloat(maxNumberDecimal(weiToEther(balanceNativeInNextWei)));
          data.amount = formatFloorNearest(balanceNativeInNextEther);
        } else if (data.symbol_token_in == SYMBOL_TOKEN.LCR) {
          const holdingAmount = await getHoldingAmountBot({ chainId: chain_id, index: data.index_wallet_in });
          const balanceTokenEther = parseFloat(maxNumberDecimal(weiToEther(balanceTokenWei)));
          const balanceTokenDeductedEther = balanceTokenEther - holdingAmount;
          data.amount = formatFloorNearest(balanceTokenDeductedEther);
        } else {
          data.amount = formatFloorNearest(weiToEther(balanceTokenWei));
        }
      }

      if (jobNext?.is_split && Number.isInteger(jobNext.index_wallet_split)) {
        const filter =
          jobNext.symbol_token_out == SYMBOL_TOKEN.LCR
            ? { is_active: true, type: { $in: [TYPE_TEMPLATE.split_buy] } }
            : { is_active: true, type: { $in: [TYPE_TEMPLATE.split_sell] } };

        const countTemplate = await TemplateModel.count(filter);

        if (countTemplate <= 0) throw { error: 'Split_Schdedule_Next: Templates data is empty' };

        let template = await TemplateModel.findOne(filter);

        const numberSplit = randomFloatBetween(0.2, 0.5);
        const amountSplit = formatFloorNumber(parseFloat(data.amount) * numberSplit);
        data.amount = formatFloorNumber(parseFloat(data.amount) - amountSplit);

        await generateTemplateExecuteSpecific({
          scheduleId: schedule_id,
          executeId: null,
          isRepeat: is_repeat,
          chainId: chain_id,
          date: date,
          templateId: template._id,
          indexWallets: [jobNext.index_wallet_split],
          amount: amountSplit,
          queue: agenda,
          isFreeCoin: false,
        });
      }

      if (jobNext?.is_gap && Number.isInteger(jobNext.index_wallet_gap)) {
        const filter =
          jobNext.symbol_token_out == SYMBOL_TOKEN.LCR
            ? { is_active: true, type: { $in: [TYPE_TEMPLATE.gaps_seller] } }
            : { is_active: true, type: { $in: [TYPE_TEMPLATE.gaps_buyer] } };

        const countTemplate = await TemplateModel.count(filter);

        if (countTemplate <= 0) throw { error: 'Gap_Schdedule_Next: Templates data is empty' };

        let template = await TemplateModel.findOne(filter);

        const numberGap = randomFloatBetween(0.2, 0.4);
        const amountGap = formatFloorNumber(parseFloat(data.amount) * numberGap);
        data.amount = formatFloorNumber(parseFloat(data.amount) - amountGap);

        await generateTemplateExecuteSpecific({
          scheduleId: schedule_id,
          executeId: null,
          isRepeat: is_repeat,
          chainId: chain_id,
          date: date,
          templateId: template._id,
          indexWallets: [jobNext.index_wallet_gap],
          amount: amountGap,
          queue: agenda,
          isFreeCoin: false,
        });
      }

      if (jobNext?.is_leave_an_amount) {
        const numberPercent = randomFloatBetween(0.4, 0.6);
        const amountPercent = formatFloorNumber(parseFloat(data.amount) * numberPercent);
        data.amount = formatFloorNumber(parseFloat(data.amount) - amountPercent);
      }

      if (jobNext?.name_job === NAME_JOB.onChain.swap_token_to_token_our_dex) {
        const percentSwap = randomFloatBetween(0.92, 0.96);
        const amountSwap = formatFloorNumber(parseFloat(data.amount) * percentSwap);
        data.amount = amountSwap;
      }

      let timeSchedule = randomDatetimesFromRange(moment().add(5, 'minutes'), moment().add(30, 'minutes'), 1)[0];
      // let timeSchedule = moment().add(1, 'minute');
      let schedule = await agenda.schedule(timeSchedule, jobNext.name_job, data);
      schedule.attrs.data.job_id = schedule.attrs._id;
      await schedule.save();

      let resultUpdateCurrent = await ExecuteTemplateModel.updateOne(
        { _id: id_execute_template },
        {
          $set: {
            'jobs.$[i].amountOut': amountOut,
          },
        },
        { arrayFilters: [{ 'i.index': job_index }], upsert: true, new: true, setDefaultsOnInsert: true },
      );

      if (!resultUpdateCurrent) throw { error: 'Update current execute template fail' };

      let resultUpdateNext = await ExecuteTemplateModel.updateOne(
        { _id: id_execute_template },
        {
          $set: {
            'stop_current': job_index,
            'status': STATUS_JOB.running,
            'jobs.$[i].date': date,
            'jobs.$[i].job_id': schedule.attrs._id,
            'jobs.$[i].run_at': schedule.attrs.nextRunAt,
            'jobs.$[i].schedule_id': data.schedule_id,
            'jobs.$[i].is_repeat': data.is_repeat,
            'jobs.$[i].id_execute_template': data.id_execute_template,
            'jobs.$[i].job_index': data.job_index,
            'jobs.$[i].chain_id': data.chain_id,
            'jobs.$[i].i_index_wallets_in': data.i_index_wallets_in,
            'jobs.$[i].i_index_wallets_out': data.i_index_wallets_out,
            'jobs.$[i].index_wallet_in': data.index_wallet_in,
            'jobs.$[i].index_wallet_out': data.index_wallet_out,
            'jobs.$[i].address_wallet_in': data.address_wallet_in,
            'jobs.$[i].address_wallet_out': data.address_wallet_out,
            'jobs.$[i].symbol_token_in': data.symbol_token_in,
            'jobs.$[i].symbol_token_out': data.symbol_token_out,
            'jobs.$[i].is_split': data.is_split,
            'jobs.$[i].index_wallet_split': data.index_wallet_split,
            'jobs.$[i].is_leave_an_amount': data.is_leave_an_amount,
            'jobs.$[i].is_gap': data.is_gap,
            'jobs.$[i].index_wallet_gap': data.index_wallet_gap,
            'jobs.$[i].amount': data.amount,
          },
        },
        { arrayFilters: [{ 'i.index': indexNext }], upsert: true, new: true, setDefaultsOnInsert: true },
      );
      if (!resultUpdateNext) throw { error: 'Update execute template fail' };
    } else {
      let resultUpdate = await ExecuteTemplateModel.updateOne(
        { _id: id_execute_template },
        {
          $set: {
            'stop_current': job_index,
            'is_done': true,
            'status': STATUS_JOB.completed,
            'error': null,
            'jobs.$[i].amountOut': amountOut,
          },
        },
        { arrayFilters: [{ 'i.index': job_index }], upsert: true, new: true, setDefaultsOnInsert: true },
        {},
      );
      if (!resultUpdate) throw { error: 'Update execute template fail' };
      await assetsRecoveryToSource({
        chainId: chain_id,
        indexWallets: executeTemplate.index_wallets,
        idExecuteTemplate: id_execute_template,
      });
      await saveWalletsByIndexes({ chainId: chain_id, indexWallets: executeTemplate.index_wallets, is_using: false });
    }

    return {
      status: true,
      error: null,
    };
  } catch (error) {
    return {
      status: false,
      error,
    };
  }
};

export const rescheduleFailedJob = async ({ job, error }) => {
  try {
    const { id_execute_template, job_index } = job.attrs.data;
    await ExecuteTemplateModel.findByIdAndUpdate(id_execute_template, {
      stop_current: job_index,
      status: STATUS_JOB.rescheduled,
      error,
    });

    if (!job?.attrs?.failCount || job?.attrs?.failCount < 5) {
      const runAt = moment(randomDatetimesFromRange(moment().add(5, 'minutes'), moment().add(10, 'minutes'), 1)[0]);
      await job.schedule(runAt);
      await job.save();
    } else {
      const { status, error } = await cancelExecuteAndReschedule({ id_execute_template, job_index, error });
      if (!status) throw { error };
    }

    await job.save();
    return {
      status: true,
      error: null,
    };
  } catch (error) {
    return {
      status: false,
      error,
    };
  }
};

// scheduleNextJob({
//   attrs: {
//     data: {
//       id_execute_template: new mongoose.Types.ObjectId('64926f38fc9ac5d61371517a'),
//       job_index: 0,
//       chain_id: 97,
//       amount: 0.974227470288834,
//       index_wallet_in: null,
//       index_wallet_out: 7,
//       symbol_token_in: 'BNB',
//       symbol_token_out: 'BNB',
//     },
//   },
// });
