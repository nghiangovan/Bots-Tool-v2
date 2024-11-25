import { BigNumber, ethers } from 'ethers';
import { parseUnits } from 'ethers/lib/utils.js';
import moment from 'moment';
import { ABIS } from '../../../../configs/ABIs.js';
import { ZERO_ADDRESS } from '../../../../configs/addresses.js';
import ERC20 from '../../../../modules/wallet/transfer/ERC20.js';
import { getProvider } from '../../../../utils/blockchain.js';
import { BUFF_GAS_PRICE_SKIM } from '../../../../utils/constant.js';
import { KEY_CONFIG, NAME_JOB, SYMBOL_NATIVE, TYPE_WALLET } from '../../../../utils/enum.js';
import { getAddressFromMapJson } from '../../../../utils/file.js';
import { etherToWei, formatError, weiToEther } from '../../../../utils/format.js';
import { randomDatetimesFromRange, randomIntBetween, randomMultipleFromArray } from '../../../../utils/random.js';
import { FORMAT_DATE } from '../../../../utils/time.js';
import { sendNoti, sleep } from '../../../../utils/utils.js';
import { getMultiBalancesByContrat } from '../../../handlers/assetsRecovery.js';
import { awaitTransaction, getWalletSourceSkimByIndexOffChain } from '../../../handlers/common.js';
import { getCacheGasPrice } from '../../../handlers/functions.js';
import ConfigModel from '../../../models/Config.js';
import ExecuteFakeActivesModel from '../../../models/ExecuteFakeActives.js';
import LogModel, { logs } from '../../../models/Log.js';
import WalletSkimModel from '../../../models/WalletSkim.js';
import agendaSkim from '../agendaSkim.js';
import fakeActivesSchedule from '../schedules/fakeActives.js';

export const scheduleFakeActivesDaily = async ({ chainId }) => {
  let infoExecute = null;
  const date = getDateSkim();
  try {
    chainId = chainId?.toString();
    infoExecute = await ExecuteFakeActivesModel.findOne({ chain_id: chainId, is_daily: true, date });
    if (!infoExecute) throw { error: `Info Execute today not found!` };

    let { _id, from_index_wallet, number_wallets, index_buff_gas_recent } = infoExecute;
    let id_execute = _id;

    let jobsFailed = await agendaSkim.jobs({
      $and: [
        { lastFinishedAt: { $exists: true } },
        { failedAt: { $exists: true } },
        { $expr: { $eq: ['$lastFinishedAt', '$failedAt'] } },
        { nextRunAt: null },
        { name: NAME_JOB.fake_actives.schedule_fake_actives },
        { 'data.id_execute': id_execute },
      ],
    });
    if (jobsFailed.length > 0) await Promise.all(jobsFailed.map(async job => await job.run()));

    if (index_buff_gas_recent >= from_index_wallet + number_wallets) {
      await infoExecute.updateOne({ is_scheduled_done: true });
      return { status: true, error: null };
    }

    await checkNextSchedule({ id_execute, index_buff_gas_recent });

    return { status: true, error: null };
  } catch (error) {
    console.log(error);
    const strError = formatError(error);
    await sendNoti(`[BOT_TOOL]: N0300 - UAW (daily) failed for date ${date}`);
    if (infoExecute)
      await ExecuteFakeActivesModel.updateOne({ chain_id: chainId, is_daily: true, date }, { error: strError });
    return { status: false, error };
  }
};

export const scheduleFakeActivesManual = async ({ id_execute }) => {
  let infoExecute = null;
  try {
    infoExecute = await ExecuteFakeActivesModel.findById(id_execute);
    if (!infoExecute) throw { error: `id_execute not found!` };
    let { from_index_wallet, number_wallets, index_buff_gas_recent } = infoExecute;

    let jobsFailed = await agendaSkim.jobs({
      $and: [
        { lastFinishedAt: { $exists: true } },
        { failedAt: { $exists: true } },
        { $expr: { $eq: ['$lastFinishedAt', '$failedAt'] } },
        { nextRunAt: null },
        { name: NAME_JOB.fake_actives.schedule_fake_actives },
        { 'data.id_execute': id_execute },
      ],
    });
    if (jobsFailed.length > 0) await Promise.all(jobsFailed.map(async job => await job.run()));

    if (index_buff_gas_recent >= from_index_wallet + number_wallets) {
      await infoExecute.updateOne({ is_scheduled_done: true });
      return { status: true, error: null };
    }

    await checkNextSchedule({ id_execute, index_buff_gas_recent });

    return { status: true, error: null };
  } catch (error) {
    console.log(error);
    const strError = formatError(error);
    if (infoExecute) await ExecuteFakeActivesModel.findByIdAndUpdate(id_execute, { error: strError });
    return { status: false, error };
  }
};

export const scheduleFakeActives = async ({
  chain_id,
  is_daily,
  date,
  id_execute,
  index_buff_gas_recent,
  from_index_wallet,
  number_buff_gas_batch,
}) => {
  try {
    // connectMongoDB();

    let infoExecute = await ExecuteFakeActivesModel.findById(id_execute);
    if (!infoExecute) throw { error: `id_execute not found!` };
    const target_index = infoExecute.from_index_wallet + infoExecute.number_wallets;
    if (infoExecute.index_buff_gas_recent >= target_index) return { status: true, error: null };

    const provider = await getProvider(chain_id);
    const indexWalletSource = 0;
    const walletSourceOffChain = getWalletSourceSkimByIndexOffChain({ indexWallet: indexWalletSource });
    const walletSource = walletSourceOffChain.connect(provider);

    const addressFreeCoin = getAddressFromMapJson(chain_id, 'LCR');
    const addressPairLCR = getAddressFromMapJson(chain_id, 'LCRPair');
    const multiTransferAddress = getAddressFromMapJson(chain_id, 'MultiTransfer');
    if (!addressPairLCR || !multiTransferAddress || !addressFreeCoin)
      throw { error: 'FreeCoin address, LCRPair address and MultiTransfer address must exists' };

    const namePaidCoin = NAME_JOB.fake_actives.execute_fake_actives;
    const nameFreeCoin = NAME_JOB.fake_actives.execute_fake_actives_free_coin;
    const nameJob = chain_id.toString() == '42220' ? nameFreeCoin : namePaidCoin;

    const instanceFreeCoin = new ERC20({ chainId: chain_id, token: addressFreeCoin });
    const instancePair = new ethers.Contract(addressPairLCR, ABIS.BLCRPair, walletSource);
    const instanceMultiTransfer = new ethers.Contract(multiTransferAddress, ABIS.MultiTransferABI, walletSource);

    // estimate 1 transaction gas fee.
    const gasLimit = await instancePair.estimateGas.skim(walletSource.address);
    const buffGasPrice = parseUnits(BUFF_GAS_PRICE_SKIM?.toString(), 'gwei');

    let gasPrice = await provider.getGasPrice();
    if (chain_id.toString() === '42220')
      gasPrice = await getCacheGasPrice({ chainId: chain_id, gasPriceOnChain: gasPrice });

    const gasPriceBuffed = gasPrice.add(buffGasPrice);
    const gasFeeSkim = gasPriceBuffed.mul(gasLimit);

    const start_time_day = moment(date).diff(moment(), 'minutes') > 0 ? moment(date) : moment();
    const start_time = start_time_day.add(5, 'minutes');
    const end_time = moment(date).add(22, 'hours');

    number_buff_gas_batch = infoExecute?.number_buff_gas_batch
      ? infoExecute?.number_buff_gas_batch
      : number_buff_gas_batch;
    index_buff_gas_recent = index_buff_gas_recent < from_index_wallet ? from_index_wallet : index_buff_gas_recent;

    let maxIndex =
      index_buff_gas_recent + number_buff_gas_batch >= target_index
        ? target_index - 1
        : index_buff_gas_recent + number_buff_gas_batch;
    // let lengthRun = maxIndex >= index_buff_gas_recent ? maxIndex - index_buff_gas_recent + 1 : 0;

    console.log(`Schedule run Skim() from [ ${index_buff_gas_recent} ]  to [ ${maxIndex}]: `);

    const wallets = await WalletSkimModel.find({ chain_id, index: { $gte: index_buff_gas_recent, $lte: maxIndex } });
    const mapAddressIndex = new Map(wallets.map(i => [i.address?.toLowerCase(), i.index]));

    const listAddressWallets = [...mapAddressIndex.keys()];

    // -------------------------- Section Transfer Holder Free Coin------------------------------
    const logSendFreeCoin = await LogModel.find({
      type: NAME_JOB.onChain.transfer_free_coin_increase_holder,
      chain_id,
      date,
      index_wallet_2: `FROM_${index_buff_gas_recent}_TO_${maxIndex}`,
      id_execute,
    });
    if (logSendFreeCoin.length <= 0) {
      const numberWalletsSelect = Math.ceil(listAddressWallets.length * 0.6);
      const listWalletSelect = randomMultipleFromArray(listAddressWallets, numberWalletsSelect);
      let listAmountRandom = listWalletSelect.map(() => etherToWei(randomIntBetween(20, 330)));
      const countFreeCoin = listAmountRandom.reduce((a, b) => a.add(b), BigNumber.from(0));

      const allowance = await instanceFreeCoin.allowance({
        owner: walletSource.address,
        spender: multiTransferAddress,
      });

      if (countFreeCoin.gt(allowance)) {
        await instanceFreeCoin.approveMax({
          privateKey: walletSource.privateKey,
          spender: multiTransferAddress,
          typeWallet: TYPE_WALLET.skim_source,
        });
      }

      listAmountRandom = listAmountRandom.map(i => i.toString());
      let txTransferFreeCoin = await instanceMultiTransfer.transferBatchToken(
        addressFreeCoin,
        listWalletSelect,
        listAmountRandom,
        { from: walletSource.address, gasPrice: gasPriceBuffed },
      );

      const gasFeeSendFreeCoin = await awaitTransaction({ chainId: chain_id, txHash: txTransferFreeCoin.hash });

      await logs({
        chain_id: chain_id,
        type: NAME_JOB.onChain.transfer_free_coin_increase_holder,
        id_execute,
        status: true,
        wallet_address_1: walletSource.address,
        wallet_address_2: JSON.stringify(listWalletSelect),
        index_wallet_1: indexWalletSource,
        index_wallet_2: `FROM_${index_buff_gas_recent}_TO_${maxIndex}`,
        token_in: SYMBOL_NATIVE[chain_id],
        token_out: SYMBOL_NATIVE[chain_id],
        amount: weiToEther(countFreeCoin),
        amount_fee: 0,
        date,
        gas_fee: gasFeeSendFreeCoin,
        tx_hash: txTransferFreeCoin?.hash,
        descriptions: `Transfer Free Coin Increase Holder - FROM_${index_buff_gas_recent}_TO_${maxIndex}`,
      });
      console.log(' -> Transfer Batch Free Coin:', txTransferFreeCoin?.hash);
    }

    // ----------------------------------------- END --------------------------------------------

    // Check dupllicate schedule
    const logScheduleQueue = await LogModel.find({
      chain_id,
      type: NAME_JOB.fake_actives.schedule_fake_actives,
      status: true,
      date,
      id_execute,
      index_wallet_2: `FROM_${index_buff_gas_recent}_TO_${maxIndex}`,
    });
    if (logScheduleQueue.length > 0) {
      await checkNextSchedule({ id_execute, index_buff_gas_recent: index_buff_gas_recent + number_buff_gas_batch });
      return { status: true, error: null };
    }

    const listTokens = [
      {
        address: ZERO_ADDRESS,
        symbol: SYMBOL_NATIVE[chain_id],
      },
    ];

    let listSubAddress = [];
    for (let i = 0; i < listAddressWallets.length; i += 500) {
      const subListWallets = listAddressWallets.slice(i, i + 500);
      listSubAddress.push(subListWallets);
    }

    const results = await Promise.all(
      listSubAddress.map(async (subListAddress, ix) => {
        await sleep(ix * 50);
        const subInfoBalances = await getMultiBalancesByContrat(chain_id, subListAddress, listTokens);
        return subInfoBalances.balances;
      }),
    );
    const infoBalances = results.reduce((result, obj) => ({ ...result, ...obj }), {});

    const balances = Object.keys(infoBalances).map(address => {
      let infoBalance = { index: mapAddressIndex.get(address.toLowerCase()), address: address.toLowerCase() };
      return { ...infoBalance, balances: infoBalances[address.toLowerCase()] };
    });

    let amountsTransferFee = await Promise.all(
      balances.map(async infoBalance => {
        let amountNeedTransferNative = 0;
        const balanceNativeInEther = infoBalance?.balances[SYMBOL_NATIVE[chain_id].toLowerCase()];
        if (parseFloat(weiToEther(gasFeeSkim)) > balanceNativeInEther) {
          amountNeedTransferNative = gasFeeSkim.sub(etherToWei(balanceNativeInEther));
        }

        return {
          index: mapAddressIndex.get(infoBalance?.address?.toLowerCase()),
          address: infoBalance?.address,
          amountNeedTransferNative,
        };
      }),
    );

    // -------------------------- Section For Buff Gas Fee ------------------------------
    let _recipients = [];
    let _index_recipients = [];
    let _amounts = [];
    let _totalNeedTransfer = BigNumber.from(0); // total money for transfering
    amountsTransferFee
      .filter(item => item.amountNeedTransferNative > 0) // only wallets need gas fee
      .map(item => {
        _recipients.push(item.address);
        _index_recipients.push(item.index);
        _amounts.push(item.amountNeedTransferNative?.toString());
        _totalNeedTransfer = _totalNeedTransfer.add(item.amountNeedTransferNative);
      });

    // send money fee gas to all receipts at once transaction
    let receiptTxTransferGasFee = null;
    if (_recipients?.length > 0) {
      receiptTxTransferGasFee = await instanceMultiTransfer.transferBatchEther(_recipients, _amounts, {
        from: walletSource.address,
        value: _totalNeedTransfer?.toString(),
        gasPrice: gasPriceBuffed,
      });

      const gasFee = await awaitTransaction({ chainId: chain_id, txHash: receiptTxTransferGasFee.hash });

      await logs({
        chain_id: chain_id,
        type: NAME_JOB.onChain.buff_gas_fee_fake_actives,
        status: true,
        wallet_address_1: walletSource.address,
        wallet_address_2: JSON.stringify(_recipients),
        index_wallet_1: indexWalletSource,
        index_wallet_2: JSON.stringify(_index_recipients),
        token_in: SYMBOL_NATIVE[chain_id],
        token_out: SYMBOL_NATIVE[chain_id],
        amount: weiToEther(_totalNeedTransfer),
        amount_fee: 0,
        date,
        gas_fee: gasFee,
        tx_hash: receiptTxTransferGasFee?.hash,
        descriptions: 'Buff gas fee for fake actives',
      });
      console.log(' -> Transfer Batch Ether For Fee Gas:', receiptTxTransferGasFee?.hash);
    }
    // -------------------------------- End -----------------------------------------------

    let resultSchedule = await Promise.all(
      amountsTransferFee.map(async (infoWallet, i) => {
        await sleep(i * 20);
        const runAt = randomDatetimesFromRange(start_time, end_time, 1);
        await agendaSkim.schedule(runAt, nameJob, {
          is_daily,
          id_execute,
          date,
          chain_id,
          index: infoWallet.index,
          address: infoWallet.address,
        });
        return {
          index: infoWallet.index,
          address: infoWallet.address,
        };
      }),
    );

    await logs({
      chain_id,
      type: NAME_JOB.fake_actives.schedule_fake_actives,
      status: true,
      index_wallet_2: `FROM_${index_buff_gas_recent}_TO_${maxIndex}`,
      date,
      id_execute,
      descriptions: `Schdeule Skim To Queue Done - FROM_${index_buff_gas_recent}_TO_${maxIndex}`,
    });

    resultSchedule = resultSchedule?.sort((a, b) => a.index - b.index); // asc
    const address_end = resultSchedule[resultSchedule.length - 1]?.address;
    const index_end = resultSchedule[resultSchedule.length - 1]?.index;
    console.log(` -> Scheduled For Wallets Index From [ ${index_buff_gas_recent} ]  to [ ${maxIndex}] Done`);

    infoExecute = await ExecuteFakeActivesModel.findById(id_execute);
    if (index_end && address_end && index_end > infoExecute.index_buff_gas_recent) {
      await infoExecute.updateOne({
        index_buff_gas_recent: index_end,
        address_buff_gas_recent: address_end,
      });
      index_buff_gas_recent += number_buff_gas_batch;
    }

    // Scheduled
    let jobs = await agendaSkim.jobs(
      {
        $and: [
          { nextRunAt: { $exists: true } },
          { $expr: { $gte: ['$nextRunAt', new Date()] } },
          { name: { $in: [nameJob] } },
          { 'data.date': date },
          { 'data.chain_id': chain_id.toString() },
        ],
      },
      { 'data.index': -1 },
    );

    let listIndex = [];
    for (let i = 0; i < jobs.length; i++) {
      let job = jobs[i];
      if (listIndex.includes(job.attrs.data.index)) {
        await job.remove();
        console.log(`Dupllicate Job Queue -> Removed: ${job.attrs.data.index}`);
      } else listIndex.push(job.attrs.data.index);
    }

    if (target_index > index_buff_gas_recent) {
      await checkNextSchedule({ id_execute, index_buff_gas_recent });
      return { status: true, error: null };
    } else {
      await infoExecute.updateOne({ is_scheduled_done: true });
      console.log(`Schedule all fake actives done!!!`);

      const type_shedule = is_daily
        ? NAME_JOB.fake_actives.schedule_fake_actives_daily
        : NAME_JOB.fake_actives.schedule_fake_actives_manual;

      await logs({
        chain_id: chain_id,
        type: type_shedule,
        status: true,
        date,
        descriptions: `Scheduled fake actives successfully`,
      });
    }

    return { status: true, error: null };
  } catch (error) {
    return { status: false, error };
  }
};

export const getInfoExecuteDailyHaveAutoReturnRecent = async ({ chainId, date }) => {
  let infoExecute = await ExecuteFakeActivesModel.findOne({ chain_id: chainId, is_daily: true, date });
  if (!infoExecute) {
    infoExecute = await ExecuteFakeActivesModel.aggregate([
      { $match: { chain_id: chainId, is_daily: true } },
      { $sort: { date: -1 } },
      {
        $group: {
          _id: '$chain_id',
          data: { $first: '$$ROOT' },
        },
      },
      { $replaceRoot: { newRoot: '$data' } },
    ]);
    if (infoExecute.length <= 0) throw `Cannot found Info Execute of chainId ${chainId}!`;
    infoExecute = infoExecute[0];
  }
  return infoExecute;
};

const checkNextSchedule = async ({ id_execute, index_buff_gas_recent }) => {
  const infoExecute = await ExecuteFakeActivesModel.findById(id_execute);
  let { chain_id, date, number_buff_gas_batch, from_index_wallet, number_wallets, is_daily } = infoExecute;
  index_buff_gas_recent = index_buff_gas_recent || infoExecute.index_buff_gas_recent;

  let data_filter = {
    'name': NAME_JOB.fake_actives.schedule_fake_actives,
    'data.chain_id': chain_id,
    'data.is_daily': is_daily,
    'data.date': date,
    'data.id_execute': id_execute,
    'data.index_buff_gas_recent': index_buff_gas_recent,
    'data.from_index_wallet': from_index_wallet,
    'data.number_wallets': number_wallets,
    'data.number_buff_gas_batch': number_buff_gas_batch,
  };

  let data = {
    chain_id,
    is_daily: is_daily,
    date,
    id_execute,
    index_buff_gas_recent,
    from_index_wallet,
    number_wallets,
    number_buff_gas_batch,
  };

  const jobs_filter = await agendaSkim.jobs({ ...data_filter });

  if (jobs_filter.length <= 0) {
    await agendaSkim.schedule(moment().add(5, 'seconds'), NAME_JOB.fake_actives.schedule_fake_actives, { ...data });
  } else if (jobs_filter?.at(0)?.attrs?.shouldSaveResult) {
    const index_buff_gas_recent_next = parseInt(index_buff_gas_recent) + parseInt(number_buff_gas_batch);

    const jobs_filter_next = await agendaSkim.jobs({
      ...data_filter,
      'data.index_buff_gas_recent': index_buff_gas_recent_next,
    });

    if (jobs_filter_next.length <= 0) {
      await agendaSkim.schedule(moment().add(5, 'seconds'), NAME_JOB.fake_actives.schedule_fake_actives, {
        ...data,
        index_buff_gas_recent: index_buff_gas_recent_next,
      });
    }
  }
  return true;
};

export const autoCheckScheduleSkim = async () => {
  try {
    let schedulesFakeActives = await agendaSkim.jobs({
      name: NAME_JOB.fake_actives.schedule_fake_actives_daily,
      type: 'single',
    });
    if (schedulesFakeActives.length > 0) scheduleFakeActivesDaily({ chainId: 56 });

    let schedulesFakeActivesFreeCoin = await agendaSkim.jobs({
      name: NAME_JOB.fake_actives.schedule_fake_actives_daily_free_coin,
      type: 'single',
    });
    if (schedulesFakeActivesFreeCoin.length > 0) scheduleFakeActivesDaily({ chainId: 42220 });
    return { status: true, error: null };
  } catch (error) {
    return { status: false, error };
  }
};

export const getDateSkim = () => {
  const condition = moment.utc().hours() > 22 || (moment.utc().hours() == 22 && moment.utc().minutes() >= 22);
  const date = condition ? moment().add(1, 'day').format(FORMAT_DATE) : moment().format(FORMAT_DATE);
  return date;
};

export const loadConfigAutoScheduleSkim = async () => {
  // Paid Coin
  let configSkimPaidCoinDaily = await ConfigModel.findOne({
    chain_id: 'ALL',
    key: KEY_CONFIG.generate_fake_actives_daily,
  });
  if (!configSkimPaidCoinDaily) {
    let newConfig = new ConfigModel({
      chain_id: 'ALL',
      key: KEY_CONFIG.generate_fake_actives_daily,
      value: true,
    });
    configSkimPaidCoinDaily = await newConfig.save();
  }
  const valueFakeActives = String(configSkimPaidCoinDaily?.value).toLowerCase();
  if (valueFakeActives == 'true') {
    let schedulesFakeActives = await agendaSkim.jobs({
      name: NAME_JOB.fake_actives.schedule_fake_actives_daily,
      type: 'single',
    });
    if (schedulesFakeActives.length <= 0) await fakeActivesSchedule.enableScheuleFakeActivesDaily({ chainId: 56 });
  } else {
    let schedulesFakeActives = await agendaSkim.jobs({
      name: NAME_JOB.fake_actives.schedule_fake_actives_daily,
      type: 'single',
    });
    if (schedulesFakeActives.length > 0) await fakeActivesSchedule.disableScheuleFakeActivesDaily();
  }

  // Free Coin
  let configSkimFreeCoinDaily = await ConfigModel.findOne({
    chain_id: 'ALL',
    key: KEY_CONFIG.generate_fake_actives_daily_free_coin,
  });
  if (!configSkimFreeCoinDaily) {
    let newConfig = new ConfigModel({
      chain_id: 'ALL',
      key: KEY_CONFIG.generate_fake_actives_daily_free_coin,
      value: true,
    });
    configSkimFreeCoinDaily = await newConfig.save();
  }
  const valueFakeActivesFreeCoin = String(configSkimFreeCoinDaily?.value).toLowerCase();
  if (valueFakeActivesFreeCoin == 'true') {
    let schedulesFakeActivesFreeCoin = await agendaSkim.jobs({
      name: NAME_JOB.fake_actives.schedule_fake_actives_daily_free_coin,
      type: 'single',
    });
    if (schedulesFakeActivesFreeCoin.length <= 0)
      await fakeActivesSchedule.enableScheuleFakeActivesDailyFreeCoin({ chainId: 42220 });
  } else {
    let schedulesFakeActivesFreeCoin = await agendaSkim.jobs({
      name: NAME_JOB.fake_actives.schedule_fake_actives_daily_free_coin,
      type: 'single',
    });
    if (schedulesFakeActivesFreeCoin.length > 0) await fakeActivesSchedule.disableScheuleFakeActivesDailyFreeCoin();
  }
};

// scheduleFakeActivesManual({ id_execute: '651aa0d82865eaa6f5fbd29a' });

// scheduleFakeActives({
//   chain_id: '42220',
//   is_daily: false,
//   date: '2023-10-03',
//   id_execute: null,
//   index_buff_gas_recent: 1,
//   from_index_wallet: 1,
//   number_wallets: 1000,
//   number_buff_gas_batch: 500,
// });
