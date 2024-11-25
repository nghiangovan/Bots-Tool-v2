import moment from 'moment';
import { MIN_VALUE_DEX_BOT, RANGE_BALANCE, RATE_BALANCE_DEX } from '../../../utils/constant.js';
import { NAME_JOB, STATUS_JOB, SYMBOL_TOKEN, TYPE_ACTIVE_RECENT, TYPE_WALLET } from '../../../utils/enum.js';
import { formatCeilNearest, formatError, formatFloorNearest } from '../../../utils/format.js';
import { alternateMerge } from '../../../utils/number.js';
import {
  geoRandom,
  normalizeRandom,
  randomDatetimesFromRange,
  randomFloatBetween,
  shuffle,
} from '../../../utils/random.js';
import { awaitTransaction, fecthPriceLCR_USDT, getWalletByIndexOffChain } from '../../handlers/common.js';
import { maxNumberDecimal } from '../../handlers/functions.js';
import { swapTokenToTokenOurDex, transferOnChainTokenFromSource } from '../../jobs/services/onChain.js';
import ExecuteDexModel from '../../models/ExecuteDex.js';
import { logs } from '../../models/Log.js';
import ScheduleDexModel from '../../models/ScheduleDex.js';
import WalletExecuteDexModel, { saveWalletsExecuteDexByIndexes } from '../../models/WalletExecuteDex.js';
import { reportBalancesWalletsDex } from '../../reports/reportsBalancesWallets.js';
import agendaDex from '../agendaDex.js';

export const scheduleExecuteJobs = async ({ job }) => {
  try {
    // Step 1: Get data from job
    const { date, chain_id, execute_id, schedule_id, is_repeat, is_gap, index_1, index_2, index_3, index_4 } =
      job.attrs.data;
    const adjacentNumbers = [index_1, index_2, index_3, index_4];
    const chainId = chain_id;

    const adress_wallets = await Promise.all(
      adjacentNumbers.map(i => getWalletByIndexOffChain({ indexWallet: i })?.address?.toLowerCase()),
    );
    const [adress_1, adress_2, adress_3, adress_4] = adress_wallets;

    let schedule = await ScheduleDexModel.findById(schedule_id);
    let execute = await ExecuteDexModel.findById(execute_id);
    await execute.updateOne({ adress_wallets, status: STATUS_JOB.running });

    const resultBalances = await reportBalancesWalletsDex({ chainId, indexWallets: adjacentNumbers });
    if (!resultBalances.status) throw { error: resultBalances.error };

    const priceLCR = await fecthPriceLCR_USDT({ chainId }); // price LCR/USDT

    let mapConfigBalance = {};
    mapConfigBalance[index_1] = RATE_BALANCE_DEX.index_1;
    mapConfigBalance[index_2] = RATE_BALANCE_DEX.index_2;
    mapConfigBalance[index_3] = RATE_BALANCE_DEX.index_3;
    mapConfigBalance[index_4] = RATE_BALANCE_DEX.index_4;

    let mapIndexWallets = {};
    mapIndexWallets[index_1] = 'index_1';
    mapIndexWallets[index_2] = 'index_2';
    mapIndexWallets[index_3] = 'index_3';
    mapIndexWallets[index_4] = 'index_4';

    let mapIndexAddress = {};
    mapIndexAddress[index_1] = adress_1;
    mapIndexAddress[index_2] = adress_2;
    mapIndexAddress[index_3] = adress_3;
    mapIndexAddress[index_4] = adress_4;

    let mapBalances = {
      index_1: { indexProperty: 'index_1', index: index_1, usdt: null, lcr: null },
      index_2: { indexProperty: 'index_2', index: index_2, usdt: null, lcr: null },
      index_3: { indexProperty: 'index_3', index: index_3, usdt: null, lcr: null },
      index_4: { indexProperty: 'index_4', index: index_4, usdt: null, lcr: null },
    };

    const data_job = {
      date,
      is_gap,
      chain_id,
      is_repeat,
      execute_id,
      schedule_id,
    };

    let jobs = [];
    let step = 0;

    // Step 2: Check balance USDT and LCR after add jobs schedule
    const keys = Object.keys(resultBalances?.mapAvailableBalances);
    for (const index of keys) {
      const balance = resultBalances.mapAvailableBalances[index];
      const balanceCurrentUSDT = formatFloorNearest(balance[SYMBOL_TOKEN.USDT.toLowerCase()]);
      const balanceCurrentLCR = formatFloorNearest(balance[SYMBOL_TOKEN.LCR.toLowerCase()]);
      const valueLCR = balanceCurrentLCR * priceLCR;
      const totalValueUSD = balanceCurrentUSDT + valueLCR;
      if (totalValueUSD < MIN_VALUE_DEX_BOT) {
        const randomBalance = formatCeilNearest(randomFloatBetween(RANGE_BALANCE.min, RANGE_BALANCE.max));
        const configBalance = mapConfigBalance[index];
        const tagertBalanceLCR = formatCeilNearest(((configBalance.lcr / 100) * randomBalance) / priceLCR);
        const tagertBalanceUSDT = formatCeilNearest((configBalance.usdt / 100) * randomBalance);
        const amountUSDT = formatFloorNearest(tagertBalanceUSDT - balanceCurrentUSDT);
        const amountLCR = formatFloorNearest(tagertBalanceLCR - balanceCurrentLCR);

        jobs.push({
          ...data_job,
          name_job: NAME_JOB.dex.transfer_token_from_source,
          index: step++,
          index_wallet_in: null,
          index_wallet_out: index,
          address_wallet_in: null,
          address_wallet_out: mapIndexAddress[index],
          symbol_token_in: SYMBOL_TOKEN.USDT,
          symbol_token_out: SYMBOL_TOKEN.USDT,
          rangeRandomTimeRun: [1, 3],
          unitRandomTimeRun: 'minutes',
          amount: amountUSDT,
          amountOut: amountUSDT,
        });
        jobs.push({
          ...data_job,
          name_job: NAME_JOB.dex.transfer_token_from_source,
          index: step++,
          index_wallet_in: null,
          index_wallet_out: index,
          address_wallet_in: null,
          address_wallet_out: mapIndexAddress[index],
          symbol_token_in: SYMBOL_TOKEN.LCR,
          symbol_token_out: SYMBOL_TOKEN.LCR,
          rangeRandomTimeRun: [1, 3],
          unitRandomTimeRun: 'minutes',
          amount: amountLCR,
          amountOut: amountLCR,
        });

        const indexProperty = mapIndexWallets[index];
        mapBalances[indexProperty] = {
          ...mapBalances[indexProperty],
          indexProperty,
          usdt: tagertBalanceUSDT,
          lcr: tagertBalanceLCR,
        };
      } else {
        const indexProperty = mapIndexWallets[index];
        mapBalances[indexProperty] = {
          ...mapBalances[indexProperty],
          indexProperty,
          usdt: balanceCurrentUSDT,
          lcr: balanceCurrentLCR,
        };
      }
    }

    // If is_gap = true then random swap with amount small and no longer schedule according to balanced buy and sell logic
    if (is_gap) {
      const gaps_buy_sell = schedule?.random_gaps_buy_sell;
      const { token_in, token_out } =
        gaps_buy_sell > 0
          ? { token_in: SYMBOL_TOKEN.USDT, token_out: SYMBOL_TOKEN.LCR }
          : { token_in: SYMBOL_TOKEN.LCR, token_out: SYMBOL_TOKEN.USDT };

      for (let i = 0; i < execute.index_wallets.length; i++) {
        const index_wallet = execute.index_wallets[i];
        const amount = formatFloorNearest(randomFloatBetween(1, 10) / 100);
        jobs.push({
          ...data_job,
          name_job: NAME_JOB.dex.swap_token_to_token_our_dex,
          index: step++,
          index_wallet_in: index_wallet,
          index_wallet_out: index_wallet,
          address_wallet_in: mapIndexAddress[index_wallet],
          address_wallet_out: mapIndexAddress[index_wallet],
          symbol_token_in: token_in,
          symbol_token_out: token_out,
          rangeRandomTimeRun: [5, 10],
          unitRandomTimeRun: 'minutes',
          amount,
          amountOut: null,
        });
      }

      let schedule_queue = await agendaDex.schedule(moment().add(5, 'seconds'), jobs[0].name_job, { ...jobs[0] });
      schedule_queue.attrs.data.job_id = schedule_queue.attrs._id;
      await schedule_queue.save();
      jobs[0].job_id = schedule_queue.attrs._id;
      jobs[0].run_at = schedule_queue.attrs.nextRunAt;
      await execute.updateOne({ jobs, status: STATUS_JOB.running });

      return {
        status: true,
        error: null,
      };
    }

    let walletDex = await WalletExecuteDexModel.findOne({ chain_id, index_1 });
    const active_recent = walletDex?.active_recent;
    const activeToday = active_recent == TYPE_ACTIVE_RECENT.buy ? TYPE_ACTIVE_RECENT.sell : TYPE_ACTIVE_RECENT.buy;

    //Sep 3: Sort balance USDT and LCR follow active today
    // - A includes: index_1 and index_2
    // - B includes: index_3 and index_4
    //
    // Buy Day:
    //  + Sort A1, A2 balance follow USDT
    //  + Sort B1, B2 balance follow LCR
    //
    // Sell Day:
    //  + Sort A1, A2 balance follow LCR
    //  + Sort B1, B2 balance follow USDT

    let info_A1,
      info_A2 = null;

    let info_B1,
      info_B2 = null;

    let maxVolume = null;
    if (activeToday == TYPE_ACTIVE_RECENT.buy) {
      info_A1 = mapBalances.index_1.usdt > mapBalances.index_2.usdt ? mapBalances.index_1 : mapBalances.index_2;
      info_A2 = info_A1.indexProperty == 'index_1' ? mapBalances.index_2 : mapBalances.index_1;
      info_A1.token_in = info_A2.token_in = SYMBOL_TOKEN.USDT;
      info_A1.token_out = info_A2.token_out = SYMBOL_TOKEN.LCR;

      info_B1 = mapBalances.index_3.lcr > mapBalances.index_4.lcr ? mapBalances.index_3 : mapBalances.index_4;
      info_B2 = info_B1.indexProperty == 'index_3' ? mapBalances.index_4 : mapBalances.index_3;
      info_B1.token_in = info_B2.token_in = SYMBOL_TOKEN.LCR;
      info_B1.token_out = info_B2.token_out = SYMBOL_TOKEN.USDT;

      const totalBalanceUSDT = info_A1.usdt + info_A2.usdt;
      const totalBalanceLCR = info_B1.lcr + info_B2.lcr;
      maxVolume = Math.min(totalBalanceUSDT, totalBalanceLCR);
    } else {
      info_A1 = mapBalances.index_1.lcr > mapBalances.index_2.lcr ? mapBalances.index_1 : mapBalances.index_2;
      info_A2 = info_A1.indexProperty == 'index_1' ? mapBalances.index_2 : mapBalances.index_1;
      info_A1.token_in = info_A2.token_in = SYMBOL_TOKEN.LCR;
      info_A1.token_out = info_A2.token_out = SYMBOL_TOKEN.USDT;

      info_B1 = mapBalances.index_3.usdt > mapBalances.index_4.usdt ? mapBalances.index_3 : mapBalances.index_4;
      info_B2 = info_B1.indexProperty == 'index_3' ? mapBalances.index_4 : mapBalances.index_3;
      info_B1.token_in = info_B2.token_in = SYMBOL_TOKEN.USDT;
      info_B1.token_out = info_B2.token_out = SYMBOL_TOKEN.LCR;

      const totalBalanceLCR = info_A1.lcr + info_A2.lcr;
      const totalBalanceUSDT = info_B1.usdt + info_B2.usdt;
      maxVolume = Math.min(totalBalanceUSDT, totalBalanceLCR);
    }

    // Step 4: Random Volume Amount (ex: 100) follow both Hotta formula and
    //  - Buy Day then less than total balance USDT of A1 + A2 and less then total balance LCR of B1 + B2
    //  - Sell Day then less than total balance LCR of A1 + A2 and less then total balance USDT of B1 + B2
    const average = parseFloat(schedule.average_volume);
    let volumeAmount = 0;
    do {
      volumeAmount = normalizeRandom(geoRandom(average));
    } while (volumeAmount <= 0 || volumeAmount < maxVolume * 0.2 || volumeAmount > maxVolume * 0.6);
    volumeAmount = formatFloorNearest(volumeAmount);

    // Step 5: Select wallets have less USDT and LCR than after random amount split from Volume amount (Ex: 100 = 45 + 55)
    const conditionActive = activeToday == TYPE_ACTIVE_RECENT.buy;
    const selectForBiggerAmountA1 = conditionActive ? info_A1.usdt : info_A1.lcr;
    const selectForSmallerAmountA2 = conditionActive ? info_A2.usdt : info_A2.lcr;
    const selectForBiggerAmountB1 = conditionActive ? info_B1.lcr : info_B1.usdt;
    const selectForSmallerAmountB2 = conditionActive ? info_B2.lcr : info_B2.usdt;

    const totalA = selectForBiggerAmountA1 + selectForSmallerAmountA2;
    const rateA2PerTotalA = selectForSmallerAmountA2 / totalA;
    info_A2.amount = calcSmallerAmount(rateA2PerTotalA, selectForSmallerAmountA2, volumeAmount);
    info_A1.amount = info_A1.amount = formatFloorNearest(volumeAmount - info_A2.amount);

    const totalB = selectForBiggerAmountB1 + selectForSmallerAmountB2;
    const rateB2PerTotalB = selectForSmallerAmountB2 / totalB;
    info_B2.amount = calcSmallerAmount(rateB2PerTotalB, selectForSmallerAmountB2, volumeAmount);
    info_B1.amount = formatFloorNearest(volumeAmount - info_B2.amount);

    // Step 6: Schedule order for 4 wallets so that buy and sell orders alternate
    // - Ex:
    //     + 1: A1 - Sell ( index 0 - time 1 )
    //     + 2: B1 - Buy  ( index 1 - time 2 )
    //     + 3: A2 - Sell ( index 2 - time 3 )
    //     + 4: B2 - Buy  ( index 3 - time 4 )
    //                 or
    // - Ex:
    //     + 1: A1 - Sell ( index 0 - time 1 )
    //     + 2: B2 - Buy  ( index 1 - time 2 )
    //     + 3: A2 - Sell ( index 2 - time 3 )
    //     + 4: B1 - Buy  ( index 3 - time 4 )
    //
    let ordersJobs = alternateMerge(shuffle([info_A1, info_A2]), shuffle([info_B1, info_B2]));
    for (let i = 0; i < ordersJobs.length; i++) {
      const info = ordersJobs[i];
      jobs.push({
        ...data_job,
        name_job: NAME_JOB.dex.swap_token_to_token_our_dex,
        index: step++,
        index_wallet_in: info.index,
        index_wallet_out: info.index,
        address_wallet_in: mapIndexAddress[info.index],
        address_wallet_out: mapIndexAddress[info.index],
        symbol_token_in: info.token_in,
        symbol_token_out: info.token_out,
        rangeRandomTimeRun: [5, 10],
        unitRandomTimeRun: 'minutes',
        amount: info.amount,
        amountOut: null,
      });
    }

    // Step 7: Start schedule to queue and jobs to execute
    let schedule_queue = await agendaDex.schedule(moment().add(5, 'seconds'), jobs[0].name_job, { ...jobs[0] });
    schedule_queue.attrs.data.job_id = schedule_queue.attrs._id;
    await schedule_queue.save();
    jobs[0].job_id = schedule_queue.attrs._id;
    jobs[0].run_at = schedule_queue.attrs.nextRunAt;
    await execute.updateOne({ jobs, status: STATUS_JOB.running });
    await walletDex.updateOne({ active_recent: activeToday });

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

// rate: A2 / (A1+ A2)
export const calcSmallerAmount = (rate, balance, volume) => {
  const balancePercentMax = (balance * 100) / volume;
  const random = randomFloatBetween(35, Math.min(49, balancePercentMax));
  const percent =
    rate > 0.3 ? Math.min(random, balancePercentMax) : randomFloatBetween(random, balancePercentMax) * rate;
  return formatFloorNearest((volume * percent) / 100);
};

export const checkDuplicateOrRunAgainJob = async ({ job }) => {
  try {
    const { index, execute_id, index_wallet_in, index_wallet_out } = job.attrs.data;
    const execute = await ExecuteDexModel.findById(execute_id);

    if (index == 0) {
      const address_in =
        index_wallet_in == null ? null : getWalletByIndexOffChain({ indexWallet: index_wallet_in }).address;
      const address_out =
        index_wallet_out == null ? null : getWalletByIndexOffChain({ indexWallet: index_wallet_out }).address;
      job.attrs.data.address_wallet_in = address_in;
      job.attrs.data.address_wallet_out = address_out;
      await job.save();
    }
    const jobIndex = execute.jobs.find(j => j.index == index);
    const jobNextIndex = execute.jobs.find(j => j.index == index + 1);
    if (
      !jobIndex.job_id ||
      (jobIndex.job_id?.toString() == job.attrs._id?.toString() && jobNextIndex && !jobNextIndex.job_id) ||
      (jobIndex.job_id?.toString() == job.attrs._id?.toString() && !jobNextIndex)
    )
      return false;
    return true;
  } catch (error) {
    return true;
  }
};

export const checkJobDoneAndNextJobNotScheduled = async ({ job }) => {
  try {
    const { index, execute_id } = job.attrs.data;
    const execute = await ExecuteDexModel.findById(execute_id);
    const jobNext = execute.jobs.find(j => j.index == index + 1);
    const stJob = job.attrs.shouldSaveResult;
    if (stJob && !jobNext.job_id && !jobNext.run_at) await scheduleNextJobDex({ job, amountOut: jobNext?.amountOut });
    return stJob;
  } catch (error) {
    return true;
  }
};

export const commonProcessJob = async ({ job, done }) => {
  const resultCheck = await checkJobDoneAndNextJobNotScheduled({ job });
  if (resultCheck) return await done();
  const isDuplicate = await checkDuplicateOrRunAgainJob({ job });
  if (isDuplicate) return await done();

  const {
    chain_id,
    index_wallet_in,
    index_wallet_out,
    symbol_token_in,
    symbol_token_out,
    amount,
    job_index,
    execute_id,
    schedule_id,
  } = job.attrs.data;

  let respone = null;
  let descriptions = null;
  let type = null;
  let index_wallet_1 = null;
  let index_wallet_2 = null;
  let token_in = null;
  let token_out = null;
  let amount_fee = null;

  switch (job.attrs.name) {
    case NAME_JOB.dex.transfer_token_from_source:
      respone = await transferOnChainTokenFromSource({
        chainId: chain_id,
        symbolToken: symbol_token_in,
        indexWalletReceiver: index_wallet_out,
        amount,
        typeWallet: TYPE_WALLET.dex,
      });

      type = NAME_JOB.dex.transfer_token_from_source;
      index_wallet_1 = respone.index_wallet_1;
      index_wallet_2 = index_wallet_out;
      token_in = symbol_token_in;
      token_out = symbol_token_out;
      amount_fee = 0;
      descriptions = `${respone.addressSender}[0] ${job.attrs.name} ${amount} ${symbol_token_in} to ${respone.addressReceiver}[${index_wallet_out}]`;
      break;

    case NAME_JOB.dex.swap_token_to_token_our_dex:
      respone = await swapTokenToTokenOurDex({
        chainId: chain_id,
        symbolTokenIn: symbol_token_in,
        symbolTokenOut: symbol_token_out,
        indexWalletSender: index_wallet_in,
        typeWallet: TYPE_WALLET.dex,
        amount,
      });

      type = NAME_JOB.dex.swap_token_to_token_our_dex;
      index_wallet_1 = index_wallet_in;
      index_wallet_2 = index_wallet_in;
      token_in = symbol_token_in;
      token_out = symbol_token_out;
      amount_fee = 0;
      descriptions = `${respone.addressSender}[${index_wallet_in}] ${job.attrs.name} ${amount} ${symbol_token_in} to ${respone?.result?.data?.amountOut} ${symbol_token_out}`;
      break;
    default:
      throw { error: 'Not find define name' };
  }

  let { status, result, error, addressSender, addressReceiver } = respone;

  if (status) {
    await done();
    job.attrs.data.amountOut = parseFloat(maxNumberDecimal(result?.data?.amountOut));
    await job.setShouldSaveResult(true);
    await job.save();
    await awaitTransaction({ chainId: chain_id, txHash: result?.data?.txHash });
    await scheduleNextJobDex({ job, amountOut: result?.data?.amountOut });
  } else {
    job.fail(formatError(error));
    await job.save();
    await rescheduleFailedJobDex({ job, error: formatError(error) });
  }

  await logs({
    chain_id,
    type: type,
    status,
    wallet_address_1: addressSender,
    wallet_address_2: addressReceiver,
    index_wallet_1,
    index_wallet_2,
    amount,
    token_in,
    token_out,
    amount_fee,
    gas_fee: result?.data?.gasFee,
    tx_hash: result?.data?.txHash,
    job_id: job.attrs._id,
    job_index,
    id_execute: execute_id,
    schedule_id,
    descriptions,
    error: error && formatError(error),
  });
};

export const scheduleNextJobDex = async ({ job, amountOut }) => {
  amountOut = amountOut ? parseFloat(maxNumberDecimal(amountOut)) : null;
  try {
    const { chain_id, schedule_id, is_repeat, execute_id, index } = job.attrs.data;
    let execute = await ExecuteDexModel.findById(execute_id);

    const date = execute.date;

    let maxIndexJob = Math.max(...execute.jobs.map(o => o.index));

    if (index < maxIndexJob) {
      let jobNext = execute.jobs.find(j => j.index == index + 1);
      let indexNext = execute.jobs.findIndex(j => j.index == index + 1);

      let data = {
        date,
        chain_id,
        is_repeat,
        schedule_id,
        execute_id,
        index: index + 1,
        index_wallet_in: jobNext.index_wallet_in,
        index_wallet_out: jobNext.index_wallet_out,
        address_wallet_in: jobNext.address_wallet_in,
        address_wallet_out: jobNext.address_wallet_out,
        symbol_token_in: jobNext.symbol_token_in,
        symbol_token_out: jobNext.symbol_token_out,
        rangeRandomTimeRun: jobNext?.rangeRandomTimeRun,
        unitRandomTimeRun: jobNext?.unitRandomTimeRun,
        amount: jobNext.amount,
      };

      const rangeRandomTimeRun = jobNext?.rangeRandomTimeRun;
      const unitRandomTimeRun = jobNext?.unitRandomTimeRun;

      let timeSchedule = null;
      if (rangeRandomTimeRun && unitRandomTimeRun) {
        const start = rangeRandomTimeRun[0];
        const end = rangeRandomTimeRun[0];
        const unit = unitRandomTimeRun;
        timeSchedule = randomDatetimesFromRange(moment().add(start, unit), moment().add(end, unit), 1)[0];
      } else {
        timeSchedule = randomDatetimesFromRange(moment().add(2, 'minutes'), moment().add(8, 'minutes'), 1)[0];
      }

      let schedule_queue = await agendaDex.schedule(timeSchedule, jobNext.name_job, data);
      schedule_queue.attrs.data.job_id = schedule_queue.attrs._id;
      await schedule_queue.save();

      if (amountOut) {
        let resultUpdateCurrent = await execute.updateOne(
          { $set: { 'jobs.$[i].amountOut': amountOut } },
          { arrayFilters: [{ 'i.index': index }], upsert: true, new: true, setDefaultsOnInsert: true },
        );
        if (!resultUpdateCurrent) throw { error: 'Update current execute template fail' };
      }

      let resultUpdateNext = await execute.updateOne(
        {
          $set: {
            'stop_current': index,
            'status': STATUS_JOB.running,
            'jobs.$[i].job_id': schedule_queue.attrs._id,
            'jobs.$[i].run_at': schedule_queue.attrs.nextRunAt,
          },
        },
        { arrayFilters: [{ 'i.index': indexNext }], upsert: true, new: true, setDefaultsOnInsert: true },
      );
      if (!resultUpdateNext) throw { error: 'Update execute dex failed' };
    } else {
      let dataSet = {
        stop_current: index,
        is_done: true,
        status: STATUS_JOB.completed,
        error: null,
      };
      if (amountOut) dataSet['jobs.$[i].amountOut'] = amountOut;
      let resultUpdate = await execute.updateOne(
        {
          $set: { ...dataSet },
        },
        { arrayFilters: [{ 'i.index': index }], upsert: true, new: true, setDefaultsOnInsert: true },
      );
      if (!resultUpdate) throw { error: 'Update execute dex failed' };
      await saveWalletsExecuteDexByIndexes({
        chainId: chain_id,
        indexWallets: [execute.index_wallets[0]],
        isUsing: false,
      });
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

export const rescheduleFailedJobDex = async ({ job, error }) => {
  try {
    const { execute_id, index } = job.attrs.data;
    let execute = await ExecuteDexModel.findById(execute_id);

    if (!job?.attrs?.failCount || job?.attrs?.failCount < 5) {
      const runAt = moment(randomDatetimesFromRange(moment().add(5, 'minutes'), moment().add(10, 'minutes'), 1)[0]);
      await job.schedule(runAt);
      await execute.updateOne({
        stop_current: index,
        status: STATUS_JOB.rescheduled,
        error,
      });
    } else {
      job.fail(formatError(error));
      await execute.updateOne({
        stop_current: index,
        status: STATUS_JOB.canceled,
        error,
      });
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
