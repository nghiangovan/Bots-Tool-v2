import axios from 'axios';
import { ethers } from 'ethers';
import { parseUnits } from 'ethers/lib/utils.js';
import moment from 'moment';
import Web3 from 'web3';
import { ABIS } from '../../configs/ABIs.js';
import { MAX_VALUE, getMapToken } from '../../configs/addresses.js';
import ERC20 from '../../modules/wallet/transfer/ERC20.js';
import { CHAIN_ID_ADMIN_API_URL, CHAIN_ID_ADMIN_TOKEN, CHAIN_ID_BOT_ID } from '../../utils/constant.js';
import { KEY_CONFIG, NAME_JOB, STATUS_JOB, SYMBOL_TOKEN } from '../../utils/enum.js';
import { etherToWei, formatError } from '../../utils/format.js';
import { getDatasByFile } from '../../utils/index.js';
import agenda from '../jobs/agenda.js';
import ConfigModel from '../models/Config.js';
import ExecuteTemplateModel from '../models/ExecuteTemplate.js';
import LogModel from '../models/Log.js';
import ReportExecuteModel from '../models/ReportExecute.js';
import { saveWalletsByIndexes } from '../models/Wallet.js';
import { generateTemplateExecuteSpecific } from '../templates/generateTemplateExecute.js';
import { assetsRecoveryToSource } from './assetsRecovery.js';
import {
  awaitTransaction,
  buffNativeHaveCheckMinBalance,
  getBuffGasPrice,
  getGasPriceDynamic,
  saveBalanceRecent,
} from './common.js';

export const deployments = getDatasByFile('chain-info/deployments/map.json');

export const getBalanceOfSpendingAccount = async (token, api_url) => {
  const response = await axios.get(`${api_url}/v2/assets/balance`, { headers: { Authorization: `Bearer ${token}` } });
  return response.data;
};

export const getBalancesToken = async (token, api_url) => {
  const response = await axios.get(`${api_url}/v2/assets/balance`, { headers: { Authorization: `Bearer ${token}` } });
  return response.data;
};

export const withdrawAccountWallet = async ({ token, botUserId, addressReceiver, amountInEther, adminApiUrl }) => {
  const data = {
    bot_user_id: botUserId,
    wallet_address: addressReceiver,
    amount: amountInEther,
  };
  const response = await axios.post(`${adminApiUrl}/v2/bots/withdraws`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const depositRequest = async ({ token, botUserId, txHash, adminApiUrl }) => {
  const data = {
    tx_hash: txHash,
    bot_user_id: botUserId,
  };
  const response = await axios.post(`${adminApiUrl}/v2/bots/deposits`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const getStatusTxDeposit = async ({ token, txHash, adminApiUrl }) => {
  const response = await axios.get(`${adminApiUrl}/v2/bots/deposits?tx_hash=${txHash}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const getStatusJobId = async ({ token, jobId, apiUrl }) => {
  const response = await axios.get(`${apiUrl}/v2/async_jobs/${jobId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const getStatusAsyncJob = async ({ token, async_job_id, apiUrl }) => {
  let count = 0;
  while (count < 30) {
    try {
      const response = await axios.get(`${apiUrl}/v2/async_jobs/${async_job_id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.errors) return { status: false, error: JSON.stringify(response.errors) };

      if (response?.data?.data) {
        const data = response?.data?.data;
        if (data.status === 'success' || data.status === 'failure')
          return { status: data.status === 'success', data: data };
      }
      await new Promise(resolve => setTimeout(resolve, 10000));
      count++;
    } catch (error) {
      return { status: false, error: error.message };
    }
  }
  return { status: false, error: 'Withdraw failed because too long' };
};

export const getSignature = async ({
  token,
  network,
  walletAddress,
  amountInEther,
  amountOutEther,
  methodName,
  tokenIn,
  tokenOut,
  adminApiUrl,
}) => {
  const data = {
    wallet_address: walletAddress,
    network,
    amount_in: amountInEther,
    amount_out: amountOutEther,
    method_name: methodName,
    token_in: tokenIn,
    token_out: tokenOut,
  };

  const response = await axios.post(`${adminApiUrl}/v2/bots/generate_swap_signature`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status != 200) throw response.data;
  return response.data;
};

export const maxNumberDecimal = amount => {
  amount = amount?.toString();
  let result = amount;
  const findIndex = amount.indexOf('.');
  if (findIndex > -1) {
    const parse = amount.split('.');
    result = `${parse[0]}.${parse[1].substring(0, 8)}`;
  }
  return result;
};

export const getBalanceOnChainToken = async ({ chainId, symbolToken, address }) => {
  const token = getMapToken(chainId, symbolToken);
  if (!token) throw { error: `Token ${symbolToken} not supported` };
  const addressToken = token.address;

  const erc20 = new ERC20({
    chainId,
    token: addressToken,
  });
  const balance = await erc20.balanceOf({ address });
  return parseFloat(maxNumberDecimal(ethers.utils.formatEther(balance)));
};

export const getBalanceNativeOfAddress = async ({ address, provider }) => {
  if (ethers.utils.isAddress(address)) {
    const balance = await provider.getBalance(address);
    return parseFloat(maxNumberDecimal(ethers.utils.formatEther(balance)));
  }
  return null;
};

export const checkAllowanceLabradoToken = async ({ chainId, wallet, contractAddress }) => {
  const contractToken = { address: deployments[chainId?.toString()].LCR[0], abi: ABIS.LCR || [] };
  const labradoTokenContract = new ethers.Contract(contractToken.address, contractToken.abi, wallet);
  const allowance = await labradoTokenContract.allowance(wallet.address, contractAddress);
  const allowanceStr = allowance.toHexString();
  return allowanceStr === MAX_VALUE;
};

export const approveForContractAddress = async ({ chainId, wallet, contractAddress, typeWallet }) => {
  const contractToken = { address: deployments[chainId?.toString()].LCR[0], abi: ABIS.LCR || [] };
  const labradoTokenContract = new ethers.Contract(contractToken.address, contractToken.abi, wallet);
  const transactions = await labradoTokenContract.approve(contractAddress, MAX_VALUE);
  const receipt = await transactions.wait(1);
  await saveBalanceRecent({ chainId, addressWallet: wallet.address, typeWallet });
  return receipt.status === 1;
};

export const depositTokenToSpendingByAdminToken = async ({ chainId, wallet, amountInEther, typeWallet }) => {
  if (!wallet || !amountInEther) {
    return null;
  }

  const tokenAdmin = CHAIN_ID_ADMIN_TOKEN[chainId];
  if (!tokenAdmin) throw { error: `Admin Token not found` };
  const botUserId = CHAIN_ID_BOT_ID[chainId];
  if (!botUserId) throw { error: `Bot Id not found` };
  const adminApiUrl = CHAIN_ID_ADMIN_API_URL[chainId];
  if (!adminApiUrl) throw { error: 'Info Admin API URL not found' };

  const address_operator = deployments[chainId].LCROperator[0];

  const tokenInfo = getMapToken(chainId, SYMBOL_TOKEN.LCR);
  if (!tokenInfo) throw { error: `Token ${SYMBOL_TOKEN.LCR} not supported` };
  const addressToken = tokenInfo.address;

  const erc20 = new ERC20({
    chainId,
    token: addressToken,
  });

  const amountAllowanceWei = await erc20.allowance({
    owner: wallet.address,
    spender: address_operator,
  });
  const amountAllowance = ethers.utils.formatEther(amountAllowanceWei);
  if (parseFloat(amountInEther) > parseFloat(amountAllowance)) {
    await erc20.approveMax({ privateKey: wallet.privateKey, spender: address_operator, typeWallet });
  }

  await buffNativeHaveCheckMinBalance({ chainId, wallet, amountNativeNeedSend: 0 });

  const amountInWei = etherToWei(amountInEther?.toString());

  const web3 = new Web3(erc20.provider.connection.url);
  const lcrOperatorContract = new web3.eth.Contract(ABIS.LCROperator, address_operator);
  const data = lcrOperatorContract.methods.depositToken(addressToken, amountInWei?.toString()).encodeABI();
  const gas = await lcrOperatorContract.methods
    .depositToken(addressToken, amountInWei?.toString())
    .estimateGas({ from: wallet.address });
  const buffGasPrice = await getBuffGasPrice({ chainId });
  const gasPriceCurrent = await web3.eth.getGasPrice();
  const gasPrice = gasPriceCurrent + BigInt(buffGasPrice?.toString());

  const signedRawTrx = await web3.eth.accounts.signTransaction(
    { data, from: wallet.address, to: address_operator, gas, gasPrice },
    wallet.privateKey,
  );
  const txHash = web3.utils.sha3(signedRawTrx.rawTransaction);

  let statusTxHash = await getStatusTxDeposit({ token: tokenAdmin, txHash, adminApiUrl });
  if (!statusTxHash.data) {
    let resRequest = await depositRequest({ token: tokenAdmin, botUserId, txHash, adminApiUrl });
    if (resRequest.errors) throw { error: JSON.stringify(resRequest.errors) };
  }

  let txDeposit = await web3.eth.sendSignedTransaction(signedRawTrx.rawTransaction);

  const gasFee = await awaitTransaction({ chainId, txHash: txDeposit.transactionHash });

  await saveBalanceRecent({ chainId, addressWallet: wallet.address, typeWallet });

  return {
    status: true,
    data: {
      chainId,
      amountIn: amountInEther,
      amountOut: amountInEther,
      symbolToken: SYMBOL_TOKEN.LCR,
      sender: wallet.address,
      txHash,
      gasFee,
    },
  };
};

export const depositTokenToSpendingFullOnChain = async ({ chainId, wallet, amountInEther, typeWallet }) => {
  if (!wallet || !amountInEther) {
    return null;
  }

  const addressOperator = deployments[chainId].LCROperator[0];

  const tokenInfo = getMapToken(chainId, SYMBOL_TOKEN.LCR);
  if (!tokenInfo) throw { error: `Token ${SYMBOL_TOKEN.LCR} not supported` };
  const addressToken = tokenInfo.address;

  const erc20 = new ERC20({
    chainId,
    token: addressToken,
  });

  const amountAllowanceWei = await erc20.allowance({
    owner: wallet.address,
    spender: addressOperator,
  });
  const amountAllowance = ethers.utils.formatEther(amountAllowanceWei);
  if (parseFloat(amountInEther) > parseFloat(amountAllowance)) {
    await buffNativeHaveCheckMinBalance({ chainId, wallet, amountNativeNeedSend: 0 });
    await erc20.approveMax({ privateKey: wallet.privateKey, spender: addressOperator, typeWallet });
  }

  await buffNativeHaveCheckMinBalance({ chainId, wallet, amountNativeNeedSend: 0 });

  const amountInWei = etherToWei(amountInEther);

  const lcrOperatorContract = new ethers.Contract(addressOperator, ABIS.LCROperator, wallet);
  const gasPrice = await getGasPriceDynamic({ chainId });

  let gasLimit = await lcrOperatorContract.estimateGas.depositToken(addressToken, amountInWei);

  let txDeposit = await lcrOperatorContract.depositToken(addressToken, amountInWei, { gasLimit, gasPrice });

  await txDeposit.wait(1);

  const gasFee = await awaitTransaction({ chainId, txHash: txDeposit.hash });

  await saveBalanceRecent({ chainId, addressWallet: wallet.address, typeWallet });

  return {
    status: true,
    data: {
      chainId,
      amountIn: amountInEther,
      amountOut: amountInEther,
      symbolToken: SYMBOL_TOKEN.LCR,
      sender: wallet.address,
      txHash: txDeposit.hash,
      gasFee,
    },
  };
};

export const getCacheGasPrice = async ({ chainId, gasPriceOnChain }) => {
  let cacheGasPrice = await ConfigModel.findOne({
    chain_id: chainId,
    key: KEY_CONFIG.gas_price,
  });
  cacheGasPrice = cacheGasPrice?.value ? parseUnits(cacheGasPrice.value, 'gwei') : 0;
  return cacheGasPrice > 0 ? cacheGasPrice : gasPriceOnChain;
};

export const decodeAmountOutTransactionSwap = async ({ receipt }) => {
  const swapEventTopic = ethers.utils.id('Swap(address,uint256,uint256,uint256,uint256,address)');

  // discard all other logs
  const swapLogs = receipt.logs.filter(log => log.topics[0] === swapEventTopic);

  // take the last swap event
  const lastSwapEvent = swapLogs.slice(-1)[0];

  // decode the data
  const swapInterface = new ethers.utils.Interface([
    'event Swap (address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)',
  ]);
  const parsed = swapInterface.parseLog(lastSwapEvent);

  // use the non zero value
  return parsed.args.amount0Out.isZero() ? parsed.args.amount1Out : parsed.args.amount0Out;
};

export const cancelExecuteAndReschedule = async ({ id_execute_template, error, job_index }) => {
  try {
    const execute = await ExecuteTemplateModel.findById(id_execute_template);
    let jobIds = execute.jobs.map(job => job.job_id);
    await agenda.cancel({ _id: { $in: jobIds } });

    await execute.updateOne({
      stop_current: Number.isInteger(job_index) || execute.stop_current,
      status: STATUS_JOB.canceled,
      error: error || null,
    });

    await assetsRecoveryToSource({
      chainId: execute.chain_id,
      indexWallets: execute.index_wallets,
      idExecuteTemplate: id_execute_template,
    });

    await saveWalletsByIndexes({ chainId: execute.chain_id, indexWallets: execute.index_wallets, is_using: false });

    let executes = await ExecuteTemplateModel.find({
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
        executeId: execute._id,
        isRepeat: execute.is_repeat,
        chainId: execute.chain_id,
        date: execute.date,
        templateId: execute.template_id,
        indexWallets: execute.index_wallets,
        amount,
        queue: agenda,
      });
    }
    return { status: true, error: null };
  } catch (err) {
    return { status: false, error: formatError(err) };
  }
};

export const cacheKpiServerFromLogsToReportExecute = async ({ chainId }) => {
  try {
    const chain_id = chainId.toString();
    const dateStr = moment().subtract(1, 'days').format('YYYY-MM-DD').toString();
    const date = new Date(dateStr);

    let query = [
      {
        $facet: {
          skim_filter: [
            {
              $match: {
                chain_id,
                createdAt: { $gt: date },
                type: {
                  $in: [
                    NAME_JOB.fake_actives.execute_fake_actives_free_coin,
                    NAME_JOB.fake_actives.execute_fake_actives,
                  ],
                },
                status: true,
              },
            },
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                date: { $first: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } },
                uaw: { $addToSet: '$wallet_address_1' },
              },
            },
            {
              $sort: {
                date: -1,
              },
            },
            {
              $project: {
                date: '$date',
                uaw_skim: { $size: '$uaw' },
                _id: 0,
              },
            },
          ],
          dex_filter: [
            {
              $match: {
                chain_id,
                createdAt: { $gt: date },
                type: {
                  $in: [
                    NAME_JOB.onChain.deposit_token_utt_to_spending,
                    NAME_JOB.onChain.swap_token_to_token_our_dex,
                    NAME_JOB.free_coin.swap_token_to_token_our_dex,
                    NAME_JOB.free_coin.deposit_token_free_to_spending,
                  ],
                },
                status: true,
              },
            },
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                date: { $first: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } },
                uaw: { $addToSet: '$wallet_address_1' },
              },
            },
            {
              $sort: {
                _id: -1,
              },
            },
            {
              $project: {
                date: '$date',
                uaw_dex: { $size: '$uaw' },
                _id: 0,
              },
            },
          ],
        },
      },
      {
        $project: {
          all: { $concatArrays: ['$skim_filter', '$dex_filter'] },
        },
      },
      { $unwind: '$all' },
      {
        $group: {
          _id: '$all.date',
          uaw_skim: { $sum: '$all.uaw_skim' },
          uaw_dex: { $sum: '$all.uaw_dex' },
        },
      },
      { $sort: { _id: -1 } },
      {
        $project: {
          _id: 0,
          date: '$_id',
          uaw_skim: 1,
          uaw_dex: 1,
          total: { $add: ['$uaw_skim', '$uaw_dex'] },
        },
      },
    ];

    const logs_uaw = await LogModel.aggregate(query);

    const bulkDataUpdate = logs_uaw.map(log => ({
      updateOne: {
        filter: { chain_id, date: log.date },
        update: { $set: { ...log, chain_id } },
        upsert: true,
      },
    }));
    if (bulkDataUpdate.length > 0) await ReportExecuteModel.bulkWrite(bulkDataUpdate);

    return { status: true, error: null };
  } catch (error) {
    return { status: false, error: formatError(error) };
  }
};

export const cacheKpiServerAll = async () => {
  try {
    const listChains = [56, 42220];
    await Promise.all(
      listChains.map(async chainId => {
        await cacheKpiServerFromLogsToReportExecute({ chainId });
      }),
    );
    return { status: true, error: null };
  } catch (error) {
    return { status: false, error: formatError(error) };
  }
};
