import moment from 'moment';
import mongoose from 'mongoose';
import { ZERO_ADDRESS, getMapToken } from '../../../configs/addresses.js';
import ERC20 from '../../../modules/wallet/transfer/ERC20.js';
import Native from '../../../modules/wallet/transfer/Native.js';
import { FEE_WITHDRAW_TOKEN } from '../../../utils/constant.js';
import {
  NAME_JOB,
  STATUS_JOB,
  SYMBOL_NATIVE,
  SYMBOL_TOKEN,
  TYPE_CHAIN_SUPPORT,
  TYPE_SCHEDULE,
  TYPE_WALLET,
} from '../../../utils/enum.js';
import { formatError, formatFloorNumber, weiToEther } from '../../../utils/format.js';
import { randomDatetimesFromRange } from '../../../utils/random.js';
import { FORMAT_DATE } from '../../../utils/time.js';
import { sendNoti } from '../../../utils/utils.js';
import { assetsRecoveryToSource } from '../../handlers/assetsRecovery.js';
import {
  awaitTransaction,
  checkDuplicateOrRunAgainJob,
  checkJobErrorAmount,
  depositToSpendingFullOnChain,
  getCurrentIndexWalletSource,
  getHoldingAmountBot,
  getWalletByIndex,
  getWalletByIndexOffChain,
  getWalletSpendingFreeCoinByIndex,
  getWalletSpendingFreeCoinByIndexOffChain,
  tradeTokenToTokenOurDex,
  transferOnChainTokens,
} from '../../handlers/common.js';
import { maxNumberDecimal } from '../../handlers/functions.js';
import ChainIdModel from '../../models/ChainId.js';
import ExecuteTemplateFreeCoinModel from '../../models/ExecuteTemplateFreeCoin.js';
import { logs } from '../../models/Log.js';
import ScheduleExecuteFreeCoinModel from '../../models/ScheduleExecuteFreeCoin.js';
import { saveWalletsByIndexes } from '../../models/Wallet.js';
import { generateTemplateExecuteSpecific } from '../../templates/generateTemplateExecute.js';
import { generateTemplateExecuteFreeCoin } from '../../templates/generateTemplateExecuteFreeCoin.js';
import agendaFreeCoin from '../agendaFreeCoin.js';
import {
  swapTokenToTokenOurDex,
  transferOnChainNative,
  transferOnChainNativeFromSource,
  transferOnChainToken,
  transferOnChainTokenFromSource,
} from './onChain.js';

export const transferOnChainNativeFromSpending = async ({ chainId, indexWalletReceiver, amount, typeWallet }) => {
  const native = new Native({ chainId });
  const walletReceiver = await getWalletByIndex({ chainId, indexWallet: indexWalletReceiver });
  const indexSourceWallet = await getCurrentIndexWalletSource({ chainId });
  const walletSender = getWalletSpendingFreeCoinByIndexOffChain({ indexWallet: indexSourceWallet });

  try {
    let txTransfer = await native.transfer({
      privateKey: walletSender.privateKey,
      receiver: walletReceiver.address,
      amount,
      typeWallet,
    });
    return {
      status: true,
      result: txTransfer,
      error: null,
      index_wallet_1: indexSourceWallet,
      addressSender: txTransfer.data.sender,
      addressReceiver: walletReceiver.address,
    };
  } catch (error) {
    console.log(error);
    return {
      status: false,
      result: null,
      error,
      index_wallet_1: indexSourceWallet,
      addressSender: null,
      addressReceiver: walletReceiver.address,
    };
  }
};

export const withdrawOnChainTokenUttFromSpending = async ({ chainId, symbolToken, indexWalletReceiver, amount }) => {
  const indexSourceWallet = await getCurrentIndexWalletSource({ chainId });
  const walletSender = await getWalletSpendingFreeCoinByIndex({ chainId, indexWallet: indexSourceWallet });
  const walletReceiver = await getWalletByIndex({ chainId, indexWallet: indexWalletReceiver });
  try {
    let txTransfer = await transferOnChainTokens({
      chainId,
      symbolToken,
      walletSender,
      to: walletReceiver.address,
      amount,
    });
    return {
      status: true,
      result: txTransfer,
      error: null,
      index_wallet_1: indexSourceWallet,
      addressSender: walletSender.address,
      addressReceiver: walletReceiver.address,
    };
  } catch (error) {
    console.log(error);
    return {
      status: false,
      result: null,
      error,
      index_wallet_1: indexSourceWallet,
      addressSender: walletSender.address,
      addressReceiver: walletReceiver.address,
    };
  }
};

export const transferOnChainTokenFromSpending = async ({ chainId, symbolToken, indexWalletReceiver, amount }) => {
  const indexSourceWallet = await getCurrentIndexWalletSource({ chainId });
  const walletSender = await getWalletSpendingFreeCoinByIndex({ chainId, indexWallet: indexSourceWallet });
  const walletReceiver = await getWalletByIndex({ chainId, indexWallet: indexWalletReceiver });
  try {
    let txTransfer = await transferOnChainTokens({
      chainId,
      symbolToken,
      walletSender,
      to: walletReceiver.address,
      amount,
    });
    return {
      status: true,
      result: txTransfer,
      error: null,
      index_wallet_1: indexSourceWallet,
      addressSender: walletSender.address,
      addressReceiver: walletReceiver.address,
    };
  } catch (error) {
    console.log(error);
    return {
      status: false,
      result: null,
      error,
      index_wallet_1: indexSourceWallet,
      addressSender: walletSender.address,
      addressReceiver: walletReceiver.address,
    };
  }
};

export const depositSpendingFreeCoin = async ({ chainId, symbolToken, indexWalletSender, amount, typeWallet }) => {
  const walletSender = await getWalletByIndex({ chainId, indexWallet: indexWalletSender });
  try {
    let txDeposit = await depositToSpendingFullOnChain({
      chainId,
      symbolToken,
      wallet: walletSender,
      amountInEther: amount,
      typeWallet,
    });
    return {
      status: true,
      result: txDeposit,
      error: null,
      addressSender: walletSender.address,
    };
  } catch (error) {
    console.log(error);
    return {
      status: false,
      result: null,
      error,
      addressSender: walletSender.address,
    };
  }
};

export const spendingSwapTokenToTokenOurDex = async ({
  chainId,
  symbolTokenIn,
  symbolTokenOut,
  amount,
  typeWallet,
  isFreeCoin = false,
}) => {
  const indexSourceWallet = await getCurrentIndexWalletSource({ chainId });
  const walletSender = await getWalletSpendingFreeCoinByIndex({ chainId, indexWallet: indexSourceWallet });
  try {
    let txSwap = await tradeTokenToTokenOurDex({
      chainId,
      wallet: walletSender,
      symbolTokenIn,
      symbolTokenOut,
      amountInEther: amount,
      typeWallet,
      isFreeCoin,
    });
    return {
      status: true,
      result: txSwap,
      error: null,
      addressSender: walletSender.address,
      addressReceiver: walletSender.address,
    };
  } catch (error) {
    console.log(error);
    return {
      status: false,
      result: null,
      error,
      addressSender: walletSender.address,
      addressReceiver: walletSender.address,
    };
  }
};

export const commonProcessOnChainFreeCoin = async ({ queue, job, done }) => {
  const isDuplicate = await checkDuplicateOrRunAgainJob({ job, isFreeCoin: true });
  const isErrorAmount = await checkJobErrorAmount({ queue, job, isFreeCoin: true });
  if (isDuplicate || isErrorAmount || job.attrs.shouldSaveResult) return await done();

  const {
    chain_id,
    index_wallet_in,
    index_wallet_out,
    symbol_token_in,
    symbol_token_out,
    amount,
    job_index,
    id_execute_template,
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
    case NAME_JOB.free_coin.transfer_native_from_spending:
      respone = await transferOnChainNativeFromSpending({
        chainId: chain_id,
        indexWalletReceiver: index_wallet_out,
        amount,
        typeWallet: TYPE_WALLET.dex,
      });

      type = NAME_JOB.free_coin.transfer_native_from_spending;
      index_wallet_1 = respone.index_wallet_1;
      index_wallet_2 = index_wallet_out;
      token_in = SYMBOL_NATIVE[chain_id];
      token_out = SYMBOL_NATIVE[chain_id];
      amount_fee = 0;
      descriptions = `${respone.addressSender}[0] ${job.attrs.name} ${amount} ${SYMBOL_NATIVE[chain_id]} to ${respone.addressReceiver}[${index_wallet_out}]`;
      break;

    case NAME_JOB.free_coin.transfer_token_from_spending:
      respone = await transferOnChainTokenFromSpending({
        chainId: chain_id,
        symbolToken: symbol_token_in,
        indexWalletReceiver: index_wallet_out,
        amount,
      });

      type = NAME_JOB.free_coin.transfer_token_from_spending;
      index_wallet_1 = respone.index_wallet_1;
      index_wallet_2 = index_wallet_out;
      token_in = symbol_token_in;
      token_out = symbol_token_out;
      amount_fee = 0;
      descriptions = `${respone.addressSender}[0] ${job.attrs.name} ${amount} ${symbol_token_in} to ${respone.addressReceiver}[${index_wallet_out}]`;
      break;

    case NAME_JOB.free_coin.transfer_native_from_source:
      respone = await transferOnChainNativeFromSource({
        chainId: chain_id,
        indexWalletReceiver: index_wallet_out,
        amount,
        typeWallet: TYPE_WALLET.dex,
      });

      type = NAME_JOB.free_coin.transfer_native_from_source;
      index_wallet_1 = respone.index_wallet_1;
      index_wallet_2 = index_wallet_out;
      token_in = SYMBOL_NATIVE[chain_id];
      token_out = SYMBOL_NATIVE[chain_id];
      amount_fee = 0;
      descriptions = `${respone.addressSender}[0] ${job.attrs.name} ${amount} ${SYMBOL_NATIVE[chain_id]} to ${respone.addressReceiver}[${index_wallet_out}]`;
      break;

    case NAME_JOB.free_coin.transfer_token_from_source:
      respone = await transferOnChainTokenFromSource({
        chainId: chain_id,
        symbolToken: symbol_token_in,
        indexWalletReceiver: index_wallet_out,
        amount,
      });

      type = NAME_JOB.free_coin.transfer_token_from_source;
      index_wallet_1 = respone.index_wallet_1;
      index_wallet_2 = index_wallet_out;
      token_in = symbol_token_in;
      token_out = symbol_token_out;
      amount_fee = 0;
      descriptions = `${respone.addressSender}[0] ${job.attrs.name} ${amount} ${symbol_token_in} to ${respone.addressReceiver}[${index_wallet_out}]`;
      break;

    case NAME_JOB.free_coin.transfer_on_chain_native:
      respone = await transferOnChainNative({
        chainId: chain_id,
        indexWalletSender: index_wallet_in,
        indexWalletReceiver: index_wallet_out,
        amount,
      });

      type = NAME_JOB.free_coin.transfer_on_chain_native;
      index_wallet_1 = index_wallet_in;
      index_wallet_2 = index_wallet_out;
      token_in = symbol_token_in;
      token_out = symbol_token_out;
      amount_fee = 0;
      descriptions = `${respone.addressSender}[${index_wallet_in}] ${job.attrs.name} ${amount} ${symbol_token_in} to ${respone.addressReceiver}[${index_wallet_out}]`;
      break;

    case NAME_JOB.free_coin.transfer_on_chain_token:
      respone = await transferOnChainToken({
        chainId: chain_id,
        symbolToken: symbol_token_in,
        indexWalletSender: index_wallet_in,
        indexWalletReceiver: index_wallet_out,
        amount,
      });

      type = NAME_JOB.free_coin.transfer_on_chain_token;
      index_wallet_1 = index_wallet_in;
      index_wallet_2 = index_wallet_out;
      token_in = symbol_token_in;
      token_out = symbol_token_out;
      amount_fee = 0;
      descriptions = `${respone.addressSender}[${index_wallet_in}] ${job.attrs.name} ${amount} ${symbol_token_in} to ${respone.addressReceiver}[${index_wallet_out}]`;
      break;

    case NAME_JOB.free_coin.swap_token_to_token_our_dex:
      respone = await swapTokenToTokenOurDex({
        chainId: chain_id,
        symbolTokenIn: symbol_token_in,
        symbolTokenOut: symbol_token_out,
        indexWalletSender: index_wallet_in,
        amount,
        typeWallet: TYPE_WALLET.dex,
        isFreeCoin: true,
      });

      type = NAME_JOB.free_coin.swap_token_to_token_our_dex;
      index_wallet_1 = index_wallet_in;
      index_wallet_2 = index_wallet_in;
      token_in = symbol_token_in;
      token_out = symbol_token_out;
      amount_fee = 0;
      descriptions = `${respone.addressSender}[${index_wallet_in}] ${job.attrs.name} ${amount} ${symbol_token_in} to ${respone?.result?.data?.amountOut} ${symbol_token_out}`;
      break;

    case NAME_JOB.free_coin.deposit_token_free_to_spending:
      respone = await depositSpendingFreeCoin({
        chainId: chain_id,
        symbolToken: symbol_token_in,
        indexWalletSender: index_wallet_in,
        amount,
        typeWallet: TYPE_WALLET.dex,
      });

      type = NAME_JOB.free_coin.deposit_token_free_to_spending;
      index_wallet_1 = index_wallet_in;
      token_in = symbol_token_in;
      token_out = symbol_token_out;
      amount_fee = 0;
      descriptions = `${respone.addressSender}[${index_wallet_in}] ${job.attrs.name} ${amount} ${symbol_token_in} to spending_free_coin wallet`;
      break;

    case NAME_JOB.free_coin.spending_swap_token_to_token_our_dex:
      respone = await spendingSwapTokenToTokenOurDex({
        chainId: chain_id,
        symbolTokenIn: symbol_token_in,
        symbolTokenOut: symbol_token_out,
        amount,
        typeWallet: TYPE_WALLET.dex,
        isFreeCoin: true,
      });

      type = NAME_JOB.free_coin.spending_swap_token_to_token_our_dex;
      index_wallet_1 = index_wallet_in;
      index_wallet_2 = index_wallet_in;
      token_in = symbol_token_in;
      token_out = symbol_token_out;
      amount_fee = 0;
      descriptions = `${respone.addressSender}[${index_wallet_in}] ${job.attrs.name} ${amount} ${symbol_token_in} to ${respone?.result?.data?.amountOut} ${symbol_token_out}`;
      break;

    case NAME_JOB.free_coin.withdraw_free_coin:
      respone = await withdrawOnChainTokenUttFromSpending({
        chainId: chain_id,
        symbolToken: symbol_token_in,
        indexWalletReceiver: index_wallet_out,
        amount,
      });

      type = NAME_JOB.free_coin.withdraw_free_coin;
      index_wallet_1 = respone.index_wallet_1;
      index_wallet_2 = index_wallet_out;
      token_in = symbol_token_in;
      token_out = symbol_token_out;
      amount_fee = 0;
      descriptions = `${job.attrs.name} from spending_free_coin ${respone.addressSender}[${index_wallet_1}] ${amount} ${symbol_token_in} to ${respone.addressReceiver}[${index_wallet_out}]`;
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
    await scheduleNextJobFreeCoin({ job, amountOut: result?.data?.amountOut });
  } else {
    job.fail(formatError(error));
    await job.save();
    await rescheduleFailedJobFreeCoin({ job, error: formatError(error) });
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
    id_execute_template,
    schedule_id,
    descriptions,
    error: error && formatError(error),
  });
};

export const autoGenerateExecuteTemplatesFreeCoin = async ({ job }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  let agendaJobs = [];
  let listChainId = [];
  let schedules = [];
  const date = moment().format(FORMAT_DATE);

  try {
    let chainIdSupport = await ChainIdModel.find({ type: TYPE_CHAIN_SUPPORT.free_coin, is_active: true });
    chainIdSupport = chainIdSupport.map(info => info.chain_id);
    schedules = await ScheduleExecuteFreeCoinModel.find({ date, chain_id: { $in: chainIdSupport }, is_repeat: true });
    if (schedules.length < chainIdSupport.length) {
      schedules = await ScheduleExecuteFreeCoinModel.aggregate([
        { $match: { chain_id: { $in: chainIdSupport } } },
        { $sort: { date: -1 } },
        {
          $group: {
            _id: '$chain_id',
            data: { $first: '$$ROOT' },
          },
        },
        { $replaceRoot: { newRoot: '$data' } },
      ]);
    }

    for (let index = 0; index < schedules.length; index++) {
      let schedule = schedules[index];
      const scheduleId = schedule._id;
      delete schedule._id;
      if (schedule.date == date && schedule.is_scheduled) break;
      listChainId.push(schedule.chain_id);
      let result = await generateTemplateExecuteFreeCoin({
        chainId: schedule.chain_id,
        scheduleId,
        isRepeat: true,
        kpiUAW: schedule.kpi_uaw,
        numberNewWallets: schedule.number_new_wallets,
        amountMin: parseFloat(schedule.amount_min),
        amountMax: parseFloat(schedule.amount_max),
        date,
        session,
      });

      agendaJobs = agendaJobs.concat(result.agendaJobs);

      let conditions = { chain_id: schedule.chain_id, date: date };

      let options = { upsert: true, new: true, setDefaultsOnInsert: true, session };

      if (result.status)
        await ScheduleExecuteFreeCoinModel.findOneAndUpdate(conditions, { is_scheduled: true }, options);

      if (!result.status) throw result.error;
    }

    await session.commitTransaction();

    if (listChainId.length > 0)
      await logs({
        job_id: job.attrs._id,
        chain_id: listChainId?.toString(),
        type: NAME_JOB.auto.generate_templates_free_coin_auto,
        schedule_id: schedules.map(schedule => schedule._id)?.toString(),
        type_schedule: TYPE_SCHEDULE.auto,
        status: true,
        date,
        descriptions: `${NAME_JOB.auto.generate_templates_free_coin_auto} [date: ${date}] - [chainIds: ${listChainId}] successfully `,
      });

    return {
      status: true,
      error: null,
    };
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();
    await agendaFreeCoin.cancel({ _id: { $in: agendaJobs } });
    await sendNoti(`[BOT_TOOL]: N0301 - Trading Volume For Free Coin Failed For Date ${date}`);
    await logs({
      job_id: job.attrs._id,
      chain_id: listChainId?.toString(),
      type: NAME_JOB.auto.generate_templates_free_coin_auto,
      schedule_id: schedules.map(schedule => schedule._id)?.toString(),
      type_schedule: TYPE_SCHEDULE.auto,
      status: false,
      error: formatError(error),
      date,
      descriptions: `${NAME_JOB.auto.generate_templates_free_coin_auto} date ${date} fail `,
    });

    return {
      status: false,
      error,
    };
  }
};

export const manualGenerateExecuteTemplatesFreeCoin = async ({ job }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  let agendaJobs = [];
  const { schedule_id, chain_id, date, kpi_uaw, number_new_wallets, amount_max, amount_min } = job.attrs.data;

  try {
    let result = await generateTemplateExecuteFreeCoin({
      chainId: chain_id,
      scheduleId: schedule_id,
      isRepeat: false,
      kpiUAW: kpi_uaw,
      numberNewWallets: parseInt(number_new_wallets),
      amountMin: parseFloat(amount_max),
      amountMax: parseFloat(amount_min),
      date,
      session,
    });

    agendaJobs = result.agendaJobs;

    let options = { upsert: true, new: true, setDefaultsOnInsert: true, session };

    if (result.status)
      await ScheduleExecuteFreeCoinModel.findByIdAndUpdate(schedule_id, { is_scheduled: true }, options);

    if (!result.status) throw result.error;

    await session.commitTransaction();

    await logs({
      job_id: job.attrs._id,
      chain_id,
      type: NAME_JOB.manual.generate_templates_free_coin_manual,
      schedule_id,
      type_schedule: TYPE_SCHEDULE.manual,
      status: true,
      date,
      descriptions: `${NAME_JOB.manual.generate_templates_free_coin_manual} [date: ${date}] - [chainId: ${chain_id}] - schedule id [${schedule_id}] successfully `,
    });

    return {
      status: true,
      error: null,
    };
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();
    await agendaFreeCoin.cancel({ _id: { $in: agendaJobs } });
    await sendNoti(
      `[BOT_TOOL]: N0301 - Trading Volume For Free Coin Failed For Date ${date} - [chainId: ${chain_id}] - schedule id [${schedule_id}]`,
    );
    await logs({
      job_id: job.attrs._id,
      chain_id,
      type: NAME_JOB.manual.generate_templates_free_coin_manual,
      schedule_id,
      type_schedule: TYPE_SCHEDULE.manual,
      status: false,
      error: formatError(error),
      date,
      descriptions: `${NAME_JOB.manual.generate_templates_free_coin_manual} date ${date} fail - schedule id [${schedule_id}]`,
    });

    return {
      status: false,
      error,
    };
  }
};

export const scheduleNextJobFreeCoin = async ({ job, amountOut }) => {
  amountOut = amountOut ? parseFloat(maxNumberDecimal(amountOut)) : null;
  try {
    const { chain_id, schedule_id, is_repeat, id_execute_template, job_index, amount } = job.attrs.data;
    let executeTemplate = await ExecuteTemplateFreeCoinModel.findOne({
      _id: id_execute_template,
    });

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
      };

      if (amountOut && job.attrs.data.symbol_token_out == jobNext.symbol_token_in) {
        data.amount = formatFloorNumber(amountOut);
      } else {
        const walletInNext = getWalletByIndexOffChain({ indexWallet: data.index_wallet_in });
        const tokenInNext = getMapToken(chain_id, data.symbol_token_in);
        if (!tokenInNext) throw { error: 'Token not supported' };
        let erc20 = new ERC20({ chainId: chain_id, token: tokenInNext.address });
        const balanceTokenWei = await erc20.balanceOf({ address: walletInNext.address });

        if (data.index_wallet_in == null && data.index_wallet_out == null /* - Spending Swap Free Coin to USDT - */) {
          data.amount = parseFloat(job.attrs.data.amount);
        } else if (data.index_wallet_in == null && data.index_wallet_out != null /* - Withdraw utt -  */) {
          data.amount = parseFloat(job.attrs.data.amount) - FEE_WITHDRAW_TOKEN;
          data.amount = data.amount > 0 ? data.amount : 0;
        } else if (tokenInNext.address == ZERO_ADDRESS) {
          const balanceNativeInNextWei = await native.balanceOf({ address: walletInNext.address });
          const balanceNativeInNextEther = parseFloat(maxNumberDecimal(weiToEther(balanceNativeInNextWei)));
          data.amount = balanceNativeInNextEther;
        } else if (
          // Check if Prev job is transfer_token_from_spending and Next job is swap Native to ERC20
          data.symbol_token_in == SYMBOL_NATIVE[chain_id] &&
          (job.attrs.data.name == NAME_JOB.free_coin.transfer_token_from_spending ||
            job.attrs.data.name == NAME_JOB.free_coin.transfer_native_from_spending)
        ) {
          data.amount = parseFloat(amount);
        } else if (data.symbol_token_in == SYMBOL_TOKEN.LCR) {
          const holdingAmount = await getHoldingAmountBot({ chainId: chain_id, index: data.index_wallet_in });
          const balanceTokenEther = parseFloat(maxNumberDecimal(weiToEther(balanceTokenWei)));
          const balanceTokenDeductedEther = balanceTokenEther - holdingAmount;
          data.amount = balanceTokenDeductedEther;
        } else {
          data.amount = formatFloorNumber(weiToEther(balanceTokenWei));
        }
      }

      let timeSchedule = randomDatetimesFromRange(moment().add(5, 'minutes'), moment().add(30, 'minutes'), 1)[0];
      let schedule = await agendaFreeCoin.schedule(timeSchedule, jobNext.name_job, data);
      schedule.attrs.data.job_id = schedule.attrs._id;
      await schedule.save();

      let resultUpdateCurrent = await ExecuteTemplateFreeCoinModel.updateOne(
        { _id: id_execute_template },
        {
          $set: {
            'jobs.$[i].amountOut': amountOut,
          },
        },
        { arrayFilters: [{ 'i.index': job_index }], upsert: true, new: true, setDefaultsOnInsert: true },
      );
      if (!resultUpdateCurrent) throw { error: 'Update current execute template fail' };

      let resultUpdateNext = await ExecuteTemplateFreeCoinModel.updateOne(
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
            'jobs.$[i].amount': data.amount,
          },
        },
        { arrayFilters: [{ 'i.index': indexNext }], upsert: true, new: true, setDefaultsOnInsert: true },
      );
      if (!resultUpdateNext) throw { error: 'Update execute template fail' };
    } else {
      let resultUpdate = await ExecuteTemplateFreeCoinModel.updateOne(
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

export const rescheduleFailedJobFreeCoin = async ({ job, error }) => {
  try {
    const { id_execute_template, job_index } = job.attrs.data;
    await ExecuteTemplateFreeCoinModel.findByIdAndUpdate(id_execute_template, {
      stop_current: job_index,
      status: STATUS_JOB.rescheduled,
      error,
    });

    if (!job?.attrs?.failCount || job?.attrs?.failCount < 5) {
      const runAt = moment(randomDatetimesFromRange(moment().add(5, 'minutes'), moment().add(10, 'minutes'), 1)[0]);
      await job.schedule(runAt);
      await job.save();
    } else {
      const execute = await ExecuteTemplateFreeCoinModel.findById(id_execute_template);
      let jobIds = execute.jobs.map(job => job.job_id);
      await agendaFreeCoin.cancel({ _id: { $in: jobIds } });
      await ExecuteTemplateFreeCoinModel.findByIdAndUpdate(id_execute_template, {
        stop_current: job_index,
        status: STATUS_JOB.canceled,
        error,
      });
      await assetsRecoveryToSource({
        chainId: execute.chain_id,
        indexWallets: execute.index_wallets,
        idExecuteTemplate: id_execute_template,
      });
      await saveWalletsByIndexes({
        chainId: execute.chain_id,
        indexWallets: execute.index_wallets,
        is_using: false,
      });

      let executes = await ExecuteTemplateFreeCoinModel.find({
        _id: { $ne: execute._id },
        chain_id: execute.chain_id,
        schedule_id: execute.schedule_id,
        index_wallets: { $in: execute.index_wallets },
        status: {
          $in: [STATUS_JOB.queued, STATUS_JOB.running, STATUS_JOB.scheduled, STATUS_JOB.rescheduled],
        },
      });

      if (executes.length <= 0) {
        const job_0 = execute.jobs.find(j => j.index == 0);
        const amount = job_0.amount;
        await generateTemplateExecuteSpecific({
          scheduleId: execute.schedule_id,
          isRepeat: execute.is_repeat,
          chainId: execute.chain_id,
          date: execute.date,
          templateId: execute.template_id,
          indexWallets: execute.index_wallets,
          amount,
          queue: agendaFreeCoin,
          isFreeCoin: true,
        });
      }
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
