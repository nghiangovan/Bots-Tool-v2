import moment from 'moment';
import mongoose from 'mongoose';
import { NAME_JOB, STATUS_JOB } from '../../utils/enum.js';
import {
  randomDatetimesFromRange,
  randomIntBetween,
  randomMultipleFromArray,
  randomOneFromArray,
} from '../../utils/random.js';
import agendaDex from '../dex/agendaDex.js';
import ExecuteDexModel from '../models/ExecuteDex.js';
import ScheduleDexModel from '../models/ScheduleDex.js';
import WalletExecuteDexModel, { saveWalletsExecuteDexByIndexes } from '../models/WalletExecuteDex.js';
import { arrayRange } from '../../utils/index.js';
// import { connectMongoDB } from '../../database/conection.js';

export const arrayRangeLte = ({ start, stop, step }) =>
  Array.from({ length: Math.floor((stop - 1 - start) / step) + 1 }, (_, i) => start + i * step);

export const generateExecuteDex = async ({
  date,
  chainId,
  scheduleId,
  isRepeat,
  kpiUAW,
  kpiVolume,
  numberNewWallets,
  indexWalletsUsed: index_1_wallets_used,
  session,
}) => {
  let agendaJobs = [];
  let listIdExecute = [];
  chainId = String(chainId);
  const chain_id = chainId;

  try {
    let totalWallet = 0;
    let totalUAW = 0;
    let numderExecutes = 0;
    index_1_wallets_used = index_1_wallets_used ? index_1_wallets_used : [];

    let countSwap = 0;
    const numberSwapsExecute = 4;
    const numberWalletsExecute = 4;
    const numberUawExecute = 4;
    while (totalUAW < kpiUAW) {
      countSwap += numberSwapsExecute;
      totalWallet += numberWalletsExecute;
      totalUAW += numberUawExecute;
      numderExecutes++;
    }

    let schedule = await ScheduleDexModel.findById(scheduleId);

    const random_gaps_buy_sell = schedule?.random_gaps_buy_sell;
    const randomGapSwap = Number.isInteger(random_gaps_buy_sell) ? random_gaps_buy_sell : randomIntBetween(-7, 7);
    let randomSelectGap = null;
    if (randomGapSwap != 0) {
      randomSelectGap = randomMultipleFromArray(
        arrayRange({ start: 0, stop: numderExecutes - 1, step: 1 }),
        Math.round(0.01 * Math.abs(randomGapSwap) * numderExecutes),
      );
      randomSelectGap = Object.fromEntries(randomSelectGap.map(value => [value, true]));
    }

    const average = parseFloat(kpiVolume) / countSwap;

    console.log('\nChoose Index Wallets...\n');
    let indexMaxCurrent = await WalletExecuteDexModel.findOne({ chain_id }).sort({ index_4: -1 });
    if (!indexMaxCurrent) indexMaxCurrent = 0;
    if (indexMaxCurrent) indexMaxCurrent = indexMaxCurrent.index_4;
    let indexNewStart = indexMaxCurrent ? indexMaxCurrent + 1 : 0;
    let indexNewEnd = indexMaxCurrent + numberNewWallets;
    let index_1_wallets_all = arrayRangeLte({ start: indexNewStart, stop: indexNewEnd, step: numberWalletsExecute });
    if (index_1_wallets_all.length * numberWalletsExecute < totalWallet) {
      const limit = Math.ceil((totalWallet - index_1_wallets_all.length * numberWalletsExecute) / numberWalletsExecute);
      const walletsOld = await WalletExecuteDexModel.aggregate([
        { $match: { index_1: { $nin: index_1_wallets_used }, is_using: false, chain_id } },
        { $sample: { size: parseInt(limit) } },
      ]);
      let indexNeedMore = walletsOld.map(wallet => wallet.index_1);
      if (indexNeedMore.length < limit) {
        const numberWalletsNewNeedMore = limit - indexNeedMore.length;
        indexNewStart = indexNewEnd + 1;
        indexNewEnd = indexNewStart + numberWalletsNewNeedMore * numberWalletsExecute;
        let indexNewNeedMore = arrayRangeLte({ start: indexNewStart, stop: indexNewEnd, step: numberWalletsExecute });
        indexNeedMore = indexNeedMore.concat(indexNewNeedMore);
      }
      index_1_wallets_all = index_1_wallets_all.concat(indexNeedMore);
    }
    console.log('\nChoose Index Wallets Done!\n');
    //////////////////////////////////////////////////////////////////////////////////

    console.log('\nGenerate Times Schedule...\n');
    const start_time_day = moment(date).diff(moment(), 'minutes') > 0 ? moment(date) : moment();
    const start_time = start_time_day.add(10, 'minutes');
    const end_time = moment(date).add(21, 'hours');
    const scheduleRandomTimeExecute = randomDatetimesFromRange(start_time, end_time, numderExecutes);
    console.log('\nGenerate Times Schedule Done!\n');

    for (let i = 0; i < numderExecutes; i++) {
      const index_1 = randomOneFromArray(index_1_wallets_all, 1);
      const [index_2, index_3, index_4] = [index_1 + 1, index_1 + 2, index_1 + 3];

      const execute_id = new mongoose.Types.ObjectId();
      listIdExecute.push(execute_id);
      const is_gap = randomSelectGap && randomSelectGap[i] ? randomSelectGap[i] : false;

      let schedule = await agendaDex.schedule(scheduleRandomTimeExecute[i], NAME_JOB.dex.schedule_execute_jobs, {
        date,
        chain_id,
        execute_id,
        schedule_id: scheduleId,
        is_repeat: isRepeat,
        index_1,
        index_2,
        index_3,
        index_4,
        is_gap,
      });
      schedule.attrs.data.job_id = schedule.attrs._id;
      await schedule.save();
      agendaJobs.push(schedule.attrs._id);

      let newExecuteTemplate = new ExecuteDexModel({
        _id: execute_id,
        schedule_id: scheduleId,
        is_repeat: isRepeat,
        is_gap,
        chain_id,
        date,
        index_wallets: [index_1, index_2, index_3, index_4],
        status: STATUS_JOB.queued,
      });

      await newExecuteTemplate.save();

      index_1_wallets_all = index_1_wallets_all.filter(iw => iw !== index_1);
      index_1_wallets_used = index_1_wallets_used.concat(index_1);
    }
    console.log('\nSchedule Jobs In Queue Done!\n');

    console.log('\nUpdate `list_index_wallets_used` and `list_id_execute` To Schedule...\n');
    if (schedule) {
      const newListIndexWalletsUsed = [...new Set([...schedule.list_index_wallets_used, ...index_1_wallets_used])];
      const newListIdExecuteTemplate = schedule.list_id_execute.concat(listIdExecute);
      await schedule.updateOne(
        {
          average_volume: average,
          list_index_wallets_used: newListIndexWalletsUsed,
          list_id_execute: newListIdExecuteTemplate,
          random_gaps_buy_sell: randomGapSwap,
        },
        { session },
      );
    }
    console.log('\nUpdate `list_index_wallets_used` and `list_id_execute` To Schedule Done!\n');

    console.log('\nUpdate Wallets To Using...\n');
    await saveWalletsExecuteDexByIndexes({ chainId, indexWallets: index_1_wallets_used, isUsing: true, session });
    await saveWalletsExecuteDexByIndexes({ chainId, indexWallets: index_1_wallets_all, isUsing: false, session });
    console.log('\nUpdate Wallets To Using Done!\n');

    return {
      status: true,
      error: null,
      agendaJobs,
      indexWalletsUsed: index_1_wallets_used,
      listIdExecute,
    };
  } catch (error) {
    return {
      status: false,
      error,
      agendaJobs,
      indexWalletsUsed: index_1_wallets_used,
      listIdExecute,
    };
  }
};

// connectMongoDB();

// generateExecuteDex({
//   date: '2023-11-14',
//   chainId: 56,
//   scheduleId: null,
//   isRepeat: true,
//   kpiUAW: 1000,
//   kpiVolume: 30000,
//   numberNewWallets: 50,
//   indexWalletsUsed: null,
//   session: null,
// });
