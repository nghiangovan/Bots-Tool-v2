import { BigNumber, ethers } from 'ethers';
import { parseUnits } from 'ethers/lib/utils.js';
import moment from 'moment';
import mongoose from 'mongoose';
import { ABIS } from '../../../configs/ABIs.js';
import { getMapToken } from '../../../configs/addresses.js';
import ERC20 from '../../../modules/wallet/transfer/ERC20.js';
import { getProvider } from '../../../utils/blockchain.js';
import { BUFF_GAS_PRICE_HOLDER } from '../../../utils/constant.js';
import { NAME_JOB, SYMBOL_NATIVE, SYMBOL_TOKEN, TYPE_FAKE_HOLDER, TYPE_WALLET } from '../../../utils/enum.js';
import { getAddressFromMapJson } from '../../../utils/file.js';
import { etherToWei, formatError, weiToEther } from '../../../utils/format.js';
import { arrayRange } from '../../../utils/index.js';
import { randomDatetimesFromRange } from '../../../utils/random.js';
import { FORMAT_DATE } from '../../../utils/time.js';
import { sleep } from '../../../utils/utils.js';
import { getBalancesBitquery } from '../../handlers/assetsRecovery.js';
import {
  getSourceWalletMaxBalances,
  getWalletByIndexOffChain,
  getWalletSourceByIndexOffChain,
} from '../../handlers/common.js';
import ExecuteFakeHoldersModel from '../../models/ExecuteFakeHolders.js';
import { logs } from '../../models/Log.js';
import WalletSkimModel from '../../models/WalletSkim.js';
import agendaHolder from '../agendaHolder.js';

export const scheduleFakeHoldersDaily = async ({ chainId }) => {
  let infoExecute = null;
  const date = moment().format(FORMAT_DATE);
  try {
    chainId = chainId?.toString();
    let infoExecute = await ExecuteFakeHoldersModel.findOne({
      chain_id: chainId,
      is_daily: true,
      date,
      is_scheduled_done: false,
    });
    if (infoExecute) {
      await agendaHolder.now(NAME_JOB.holder.schedule_fake_holders, { id_execute: infoExecute._id.toString() });
      await ExecuteFakeHoldersModel.findByIdAndUpdate(infoExecute._id.toString(), { stop_execute: false });
    }

    return { status: true, error: null };
  } catch (error) {
    console.log(error);
    const strError = formatError(error);
    if (infoExecute)
      await ExecuteFakeHoldersModel.updateOne({ chain_id: chainId, is_daily: true, date }, { error: strError });
    return { status: false, error };
  }
};

export const scheduleFakeHolders = async ({ id_execute }) => {
  let infoExecute = null;
  try {
    infoExecute = await ExecuteFakeHoldersModel.findById(id_execute);
    if (!infoExecute) throw { error: `id_execute fake holders not found!` };
    // let { chain_id, date, number_buff_gas_batch, target_holders, index_buff_gas_recent } = infoExecute;
    let { chain_id, date, target_holders } = infoExecute;

    let indexMaxHolder = await WalletSkimModel.findOne({ chain_id, holding_amount: { $gt: 0 } }).sort({ index: -1 });
    const maxIndexHolder = indexMaxHolder.index;

    const differenceFromTarget = parseInt(target_holders) - maxIndexHolder;
    const number_holders = Math.abs(differenceFromTarget);

    const chainId = chain_id;

    if (differenceFromTarget > 0)
      return await scheduleFakeIncreaseHolders({
        chainId,
        date,
        id_execute,
        number_holders,
      });

    // if (differenceFromTarget < 0)
    //   return await scheduleFakeReduceHolders({
    //     chainId,
    //     date,
    //     id_execute,
    //     number_holders,
    //     index_buff_gas_recent,
    //     number_buff_gas_batch,
    //   });

    return { status: true, error: null };
  } catch (error) {
    console.log(error);
    const strError = formatError(error);
    if (infoExecute) await ExecuteFakeHoldersModel.findByIdAndUpdate(id_execute, { error: strError });
    return { status: false, error };
  }
};

export const scheduleFakeIncreaseHolders = async ({ chainId, date, id_execute, number_holders }) => {
  await ExecuteFakeHoldersModel.findByIdAndUpdate(id_execute, {
    type: TYPE_FAKE_HOLDER.increase_holders,
    number_holders,
  });

  let indexMaxHolder = await WalletSkimModel.findOne({ chain_id: chainId, holding_amount: { $gt: 0 } })
    .sort({ index: -1 })
    .limit(1);

  let from_index_wallet = indexMaxHolder ? indexMaxHolder?.index + 1 : 0;
  const target_index = from_index_wallet + number_holders;

  const scheduleTime = randomDatetimesFromRange(
    moment().add(5, 'minutes'),
    moment(date).add(19, 'hours'),
    number_holders,
  );

  await Promise.all(
    arrayRange({ start: from_index_wallet, stop: target_index, step: 1 }).map(async (index, ix) => {
      const runAt =
        scheduleTime[ix] || randomDatetimesFromRange(moment().add(5, 'minutes'), moment(date).add(19, 'hours'), 1)[0];
      let jobs = await agendaHolder.jobs({
        'name': NAME_JOB.holder.withdraw_increase_holders,
        'data.chain_id': chainId,
        'data.id_execute': new mongoose.Types.ObjectId(id_execute),
        'data.date': date,
        'data.index': index,
        'shouldSaveResult': false,
        '$or': [{ failCount: { $exists: false } }, { failCount: { $lt: 5 } }],
      });
      if (jobs.length <= 0)
        await agendaHolder.schedule(runAt, NAME_JOB.holder.withdraw_increase_holders, {
          id_execute,
          date,
          chain_id: chainId,
          index,
          async_job_id_game: null,
        });
    }),
  );

  await ExecuteFakeHoldersModel.findByIdAndUpdate(id_execute, { is_scheduled_done: true });
  console.log(`Schedule Fake Increase Holders done!!!`);

  let jobs = await agendaHolder.jobs(
    {
      $and: [
        // Scheduled
        { nextRunAt: { $exists: true } },
        { $expr: { $gte: ['$nextRunAt', new Date()] } },
        {
          name: {
            $in: [NAME_JOB.holder.withdraw_increase_holders],
          },
        },
        {
          'data.date': date,
        },
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
    } else {
      listIndex.push(job.attrs.data.index);
    }
  }

  await logs({
    chain_id: chainId,
    type: NAME_JOB.holder.schedule_fake_holders,
    schedule_id: id_execute,
    status: true,
    date,
    descriptions: `Scheduled Fake Increase Holders Successfully`,
  });

  return { status: true, error: null };
};

export const scheduleFakeReduceHolders = async ({
  chainId,
  date,
  id_execute,
  number_holders,
  index_buff_gas_recent,
  number_buff_gas_batch,
}) => {
  index_buff_gas_recent = index_buff_gas_recent || 0;
  const provider = await getProvider(chainId);
  const [sourceWalletNative] = await getSourceWalletMaxBalances({
    type: TYPE_WALLET.source_dex,
    chainId,
    listSymbolAssets: [SYMBOL_NATIVE[chainId]],
  });
  const walletSourceOffChain = getWalletSourceByIndexOffChain({ indexWallet: sourceWalletNative.index });
  const walletSource = walletSourceOffChain.connect(provider);

  const tokenLCR = getMapToken(chainId, SYMBOL_TOKEN.LCR);
  if (!tokenLCR) throw { error: `Token ${SYMBOL_TOKEN.LCR} not supported` };
  const addressLCR = tokenLCR.address;

  await ExecuteFakeHoldersModel.findByIdAndUpdate(id_execute, {
    type: TYPE_FAKE_HOLDER.reduce_holders,
    number_holders,
  });

  const listTokens = [
    { address: SYMBOL_NATIVE[chainId], symbol: SYMBOL_NATIVE[chainId] },
    { address: addressLCR, symbol: SYMBOL_TOKEN.LCR },
  ];

  const multiTransferAddress = getAddressFromMapJson(chainId, 'MultiTransfer');
  const operatorAddress = getAddressFromMapJson(chainId, 'LCROperator');
  if (!multiTransferAddress || !operatorAddress)
    throw { error: 'Operator address and MultiTransfer address must exists' };

  const instanceMultiTransfer = new ethers.Contract(multiTransferAddress, ABIS.MultiTransferABI, walletSource);
  const LCR = new ERC20({ chainId, token: addressLCR });

  let indexMaxHolder = await WalletSkimModel.findOne({ chain_id: chainId, holding_amount: { $gt: 0 } })
    .sort({ holding_amount: -1 })
    .limit(1);

  let from_index_wallet = indexMaxHolder.index - number_holders;
  from_index_wallet = from_index_wallet < 0 ? 0 : from_index_wallet;

  const target_index = from_index_wallet + number_holders;

  while (index_buff_gas_recent < target_index) {
    let infoExecute = await ExecuteFakeHoldersModel.findById(id_execute);
    number_buff_gas_batch = infoExecute.number_buff_gas_batch;
    index_buff_gas_recent = infoExecute.index_buff_gas_recent;

    if (index_buff_gas_recent >= target_index) break;
    let maxIndex =
      index_buff_gas_recent + number_buff_gas_batch >= target_index
        ? target_index - 1
        : index_buff_gas_recent + number_buff_gas_batch;
    let lengthRun = maxIndex >= index_buff_gas_recent ? maxIndex - index_buff_gas_recent + 1 : 0;

    console.log(`Schedule Run Reduce Holders From [ ${index_buff_gas_recent} ]  to [ ${maxIndex}]: `);

    // estimate 1 transaction gas fee.
    const buffGasPrice = parseUnits(BUFF_GAS_PRICE_HOLDER?.toString(), 'gwei');
    const gasPriceBuffed = (await provider.getGasPrice()).add(buffGasPrice);

    const gasLimitApprove = 47085; // GasLimit Approve of many TXs executed
    const gasFeeApprove = gasPriceBuffed.mul(gasLimitApprove);

    const gasLimitDeposit = 59119; // GasLimit Deposit of many TXs executed
    const gasFeeDeposit = gasPriceBuffed.mul(gasLimitDeposit);

    let mapWallets = new Map();
    [...Array(lengthRun)].forEach(async (_, i) => {
      i = index_buff_gas_recent + i;
      const wallet = getWalletByIndexOffChain({ indexWallet: i });
      mapWallets.set(wallet?.address?.toLowerCase(), i);
    });

    const listAddressWallets = [...mapWallets.keys()];

    const listAddressTokens = listTokens.map(a => a.address);
    const mapAddressSymbolTokens = new Map(listTokens.map(i => [i.address.toLowerCase(), i.symbol]));
    const infoBalances = await getBalancesBitquery(chainId, listAddressWallets, listAddressTokens);
    const balances = await infoBalances.map(b => {
      let infoBalance = {
        index: mapWallets.get(b?.address?.toLowerCase()),
        address: b?.address?.toLowerCase(),
      };
      let balanceObject = {};
      listTokens.map(token => {
        balanceObject[token?.symbol?.toLowerCase()] = 0;
      });

      b?.balances?.map(info => {
        const symbolToken =
          info?.currency?.symbol?.toLowerCase() == SYMBOL_NATIVE[chainId]?.toLowerCase()
            ? SYMBOL_NATIVE[chainId]?.toLowerCase()
            : mapAddressSymbolTokens.get(info?.currency?.address?.toLowerCase())?.toLowerCase();
        balanceObject[symbolToken] = info.value;
      });

      return { ...infoBalance, balances: balanceObject };
    });

    let amountsTransferFee = await Promise.all(
      balances.map(async (infoBalance, i) => {
        await sleep(i * 300);
        let amountNeedTransferNative = BigNumber.from(0);
        const allowance = await LCR.allowance({ owner: infoBalance?.address, spender: operatorAddress });
        if (allowance.lte(BigNumber.from(0))) {
          amountNeedTransferNative = amountNeedTransferNative.add(gasFeeApprove);
        }
        if (etherToWei(infoBalance?.balances?.bnb).lt(gasFeeDeposit)) {
          amountNeedTransferNative = amountNeedTransferNative.add(gasFeeDeposit);
        }

        return {
          index: mapWallets.get(infoBalance?.address?.toLowerCase()),
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
      await logs({
        chain_id: chainId,
        type: NAME_JOB.onChain.buff_gas_fee_fake_holders,
        status: true,
        wallet_address_1: walletSource.address,
        wallet_address_2: JSON.stringify(_recipients),
        index_wallet_1: sourceWalletNative.index,
        index_wallet_2: JSON.stringify(_index_recipients),
        token_in: SYMBOL_NATIVE[chainId],
        token_out: SYMBOL_NATIVE[chainId],
        amount: weiToEther(_totalNeedTransfer),
        amount_fee: 0,
        date,
        gas_fee: ethers.utils.formatEther(gasPriceBuffed.mul(receiptTxTransferGasFee?.gasLimit)),
        tx_hash: receiptTxTransferGasFee?.hash,
        descriptions: 'Buff gas fee for fake holders',
      });
      console.log(' -> Transfer Batch Ether For Fee Gas:', receiptTxTransferGasFee?.hash);
    }
    // -------------------------------- End -----------------------------------------------

    let resultSchedule = await Promise.all(
      amountsTransferFee.map(async (infoWallet, i) => {
        await sleep(i * 20);
        const runAt = randomDatetimesFromRange(moment().add(30, 'minutes'), moment().add(22, 'hours'), 1);
        const wallet = getWalletByIndexOffChain({ indexWallet: infoWallet.index });
        let jobs = await agendaHolder.jobs({
          'name': NAME_JOB.holder.deposit_reduce_holders,
          'data.chain_id': chainId,
          'data.id_execute': new mongoose.Types.ObjectId(id_execute),
          'data.date': date,
          'data.index': infoWallet.index,
          'shouldSaveResult': false,
          '$or': [{ failCount: { $exists: false } }, { failCount: { $lt: 5 } }],
        });
        if (jobs.length <= 0) {
          await agendaHolder.schedule(runAt, NAME_JOB.holder.deposit_reduce_holders, {
            id_execute,
            date,
            chain_id: chainId,
            index: infoWallet.index,
          });
        }
        return {
          index: infoWallet.index,
          address: wallet.address,
        };
      }),
    );

    resultSchedule = resultSchedule?.sort((a, b) => a.index - b.index); // asc
    let address_end = resultSchedule[resultSchedule.length - 1]?.address;
    let index_end = resultSchedule[resultSchedule.length - 1]?.index;
    console.log(
      ` -> Scheduled Fake Reduce Holders For Wallets Index From [ ${index_buff_gas_recent} ]  to [ ${maxIndex}] Done`,
    );

    if (resultSchedule?.length === lengthRun) {
      if (index_end && address_end)
        await ExecuteFakeHoldersModel.findByIdAndUpdate(id_execute, {
          index_buff_gas_recent: index_end,
          address_buff_gas_recent: address_end,
        });
      index_buff_gas_recent += number_buff_gas_batch;
    }
  }

  await ExecuteFakeHoldersModel.findByIdAndUpdate(id_execute, { is_scheduled_done: true });
  console.log(`Schedule Fake Reduce Holders done!!!`);

  let jobs = await agendaHolder.jobs(
    {
      $and: [
        // Scheduled
        { nextRunAt: { $exists: true } },
        { $expr: { $gte: ['$nextRunAt', new Date()] } },
        {
          name: {
            $in: [NAME_JOB.holder.deposit_reduce_holders],
          },
        },
        {
          'data.date': date,
        },
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
    } else {
      listIndex.push(job.attrs.data.index);
    }
  }

  await logs({
    chain_id: chainId,
    type: NAME_JOB.holder.schedule_fake_holders,
    schedule_id: id_execute,
    status: true,
    date,
    descriptions: `Scheduled Fake Reduce Holders Successfully`,
  });

  return { status: true, error: null };
};
