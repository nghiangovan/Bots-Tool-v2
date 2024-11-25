/* eslint-disable no-mixed-spaces-and-tabs */
import axios from 'axios';
import { BigNumber, ethers } from 'ethers';
import { formatUnits, parseUnits } from 'ethers/lib/utils.js';
import moment from 'moment';
import mongoose from 'mongoose';
import { ABIS } from '../../configs/ABIs.js';
import { MAX_VALUE, SPENDING_WALLET_PAID_COIN, ZERO_ADDRESS, getMapToken } from '../../configs/addresses.js';
import PancakeSwap from '../../modules/dex/bsc/PancakeSwap.js';
import ERC20 from '../../modules/wallet/transfer/ERC20.js';
import Native from '../../modules/wallet/transfer/Native.js';
import { createInstance, createInstanceAddress, createSignature, getProvider } from '../../utils/blockchain.js';
import {
  API_KEY_SCAN,
  BASE_API_BINANCE,
  BUFF_GASLIMT,
  BUFF_GAS_FEE,
  BUFF_GAS_PRICE,
  CHAIN_ID_ADMIN_API_URL,
  CHAIN_ID_ADMIN_TOKEN,
  CHAIN_ID_API_URL,
  CHAIN_ID_BOT_ID,
  CHAIN_ID_BOT_TOKEN,
  FEE_WITHDRAW_TOKEN,
  LIST_INDEX_SOURCE_SKIM,
  LIST_INDEX_WALLET_SOURCE,
  MIN_BALANCE_NATIVE,
  MNEMONIC_ROOT,
  MNEMONIC_ROOT_BALANCE_RATE,
  MNEMONIC_ROOT_SKIM,
  MNEMONIC_ROOT_SOURCE,
  MNEMONIC_ROOT_SOURCE_SKIM,
  MNEMONIC_ROOT_SPENDING,
  SLACK_JAY,
} from '../../utils/constant.js';
import {
  KEY_CONFIG,
  NAME_JOB,
  SYMBOL_ABI,
  SYMBOL_ADDRESS,
  SYMBOL_GET_BINANCE,
  SYMBOL_NATIVE,
  SYMBOL_TOKEN,
  TYPE_WALLET,
} from '../../utils/enum.js';
import {
  etherToWei,
  etherToWeiUnit,
  formatError,
  roundDownToNearestAuto,
  weiToEther,
  weiToEtherUnit,
} from '../../utils/format.js';
import { randomFloatBetween, randomIntBetween } from '../../utils/random.js';
import { timestampNow } from '../../utils/time.js';
import { sendNotiBackendTeam, sleep } from '../../utils/utils.js';
import { getIndexByWallet } from '../../utils/wallet.js';
import { cacheBalanceWalletsBalanceRate } from '../balanceExchangeRate/cacheBalanceWallets.js';
import agenda from '../jobs/agenda.js';
import { scheduleNextJob } from '../jobs/services/index.js';
import ConfigModel from '../models/Config.js';
import ExecuteTemplateModel from '../models/ExecuteTemplate.js';
import ExecuteTemplateFreeCoinModel from '../models/ExecuteTemplateFreeCoin.js';
import { logs } from '../models/Log.js';
import WalletBalanceRateModel from '../models/WalletBalanceRate.js';
import WalletSkimModel from '../models/WalletSkim.js';
import WalletSourceModel from '../models/WalletSource.js';
import { cacheBalanceWalletsSource } from './assetsRecovery.js';
import {
  cancelExecuteAndReschedule,
  decodeAmountOutTransactionSwap,
  deployments,
  depositTokenToSpendingByAdminToken,
  depositTokenToSpendingFullOnChain,
  getBalanceOfSpendingAccount,
  getBalanceOnChainToken,
  getCacheGasPrice,
  getSignature,
  getStatusJobId,
  maxNumberDecimal,
  withdrawAccountWallet,
} from './functions.js';

let currentIndexSource = {};
let currentIndexSourceSkim = {};

export const getWalletByIndex = async ({ chainId, indexWallet }) => {
  const provider = await getProvider(chainId);
  const wallet = ethers.Wallet.fromMnemonic(MNEMONIC_ROOT, `m/44'/60'/0'/0/${indexWallet}`).connect(provider);
  return wallet;
};

export const getWalletSourceByIndex = async ({ chainId, indexWallet }) => {
  const provider = await getProvider(chainId);
  const wallet = ethers.Wallet.fromMnemonic(MNEMONIC_ROOT_SOURCE, `m/44'/60'/0'/0/${indexWallet}`).connect(provider);
  return wallet;
};

export const getWalletSourceByIndexOffChain = ({ indexWallet }) => {
  const wallet = ethers.Wallet.fromMnemonic(MNEMONIC_ROOT_SOURCE, `m/44'/60'/0'/0/${indexWallet}`);
  return wallet;
};

export const getWalletSkimByIndex = async ({ chainId, indexWallet }) => {
  const provider = await getProvider(chainId);
  const wallet = ethers.Wallet.fromMnemonic(MNEMONIC_ROOT_SKIM, `m/44'/60'/0'/0/${indexWallet}`).connect(provider);
  return wallet;
};

export const getWalletSkimByIndexOffChain = ({ indexWallet }) => {
  const wallet = ethers.Wallet.fromMnemonic(MNEMONIC_ROOT_SKIM, `m/44'/60'/0'/0/${indexWallet}`);
  return wallet;
};

export const getWalletSourceSkimByIndex = async ({ chainId, indexWallet }) => {
  const provider = await getProvider(chainId);
  const wallet = ethers.Wallet.fromMnemonic(MNEMONIC_ROOT_SOURCE_SKIM, `m/44'/60'/0'/0/${indexWallet}`).connect(
    provider,
  );
  return wallet;
};

export const getWalletSourceSkimByIndexOffChain = ({ indexWallet }) => {
  const wallet = ethers.Wallet.fromMnemonic(MNEMONIC_ROOT_SOURCE_SKIM, `m/44'/60'/0'/0/${indexWallet}`);
  return wallet;
};

export const getWalletByIndexOffChain = ({ indexWallet }) => {
  const wallet = ethers.Wallet.fromMnemonic(MNEMONIC_ROOT, `m/44'/60'/0'/0/${indexWallet}`);
  return wallet;
};

export const getWalletBalanceRateByIndex = async ({ chainId, indexWallet }) => {
  const provider = await getProvider(chainId);
  const wallet = ethers.Wallet.fromMnemonic(MNEMONIC_ROOT_BALANCE_RATE, `m/44'/60'/0'/0/${indexWallet}`).connect(
    provider,
  );
  return wallet;
};

export const getWalletBalanceRateByIndexOffChain = ({ indexWallet }) => {
  const wallet = ethers.Wallet.fromMnemonic(MNEMONIC_ROOT_BALANCE_RATE, `m/44'/60'/0'/0/${indexWallet}`);
  return wallet;
};

export const getWalletSpendingFreeCoinByIndex = async ({ chainId, indexWallet }) => {
  const provider = await getProvider(chainId);
  const wallet = ethers.Wallet.fromMnemonic(MNEMONIC_ROOT_SPENDING, `m/44'/60'/0'/0/${indexWallet}`).connect(provider);
  return wallet;
};

export const getWalletSpendingFreeCoinByIndexOffChain = ({ indexWallet }) => {
  const wallet = ethers.Wallet.fromMnemonic(MNEMONIC_ROOT_SPENDING, `m/44'/60'/0'/0/${indexWallet}`);
  return wallet;
};

export const withdrawFromSpendingToWallet = async ({
  botUserId,
  token,
  amount,
  idExecuteTemplate,
  jobiIndex,
  addressReceiver,
  adminApiUrl,
  apiUrl,
}) => {
  try {
    const executeTemplate = await ExecuteTemplateModel.findById(idExecuteTemplate);
    let infoJob = executeTemplate.jobs.at(jobiIndex);
    let asyncJobIdGame = infoJob.async_job_id_game;

    if (asyncJobIdGame) {
      const res = await getStatusJobId({ token, jobId: asyncJobIdGame, apiUrl });
      if (res?.data?.status === 'failure') asyncJobIdGame = null;
    }

    if (!asyncJobIdGame) {
      const response = await withdrawAccountWallet({
        token,
        botUserId,
        addressReceiver,
        amountInEther: amount,
        adminApiUrl,
      });
      if (response.errors) return { status: false, error: JSON.stringify(response.errors) };
      asyncJobIdGame = response.data.async_job_id;
      await ExecuteTemplateModel.updateOne(
        { _id: idExecuteTemplate },
        {
          $set: {
            'jobs.$[i].async_job_id_game': asyncJobIdGame,
          },
        },
        { arrayFilters: [{ 'i.index': jobiIndex }], upsert: true, new: true, setDefaultsOnInsert: true },
      );
      let job = (await agenda.jobs({ _id: { $eq: new mongoose.Types.ObjectId(infoJob?.job_id) } }))[0];
      if (job) {
        job.attrs.data.async_job_id_game = asyncJobIdGame;
        await job.save();
      }
    }

    let count = 0;
    while (count < 10) {
      const res = await getStatusJobId({ token, jobId: asyncJobIdGame, apiUrl });
      if (res?.data?.status === 'success') return { status: true, error: null };
      if (res?.data?.status === 'failure') {
        await sendNotiBackendTeam(
          `[BOT_TOOL]: N0302 - ${SLACK_JAY} Withdraw UTT token failed bot_id [${botUserId}] - receviver [${addressReceiver}] - job_id [${res?.data?.job_id}]`,
        );
        return { status: false, error: res?.data?.status };
      }
      await sleep(30000);
      count++;
    }
    return { status: false, error: 'withdraw fails' };
  } catch (e) {
    console.log(e);
    return { status: false, error: formatError(e) };
  }
};

export const tradeOurDex = async ({
  chainId,
  wallet,
  symbolTokenIn,
  symbolTokenOut,
  amountInEther,
  slippage = 0.5,
  typeWallet,
  isFreeCoin = false,
}) => {
  let tokenIn = '';
  let tokenOut = '';
  let path = [];
  let methodName = '';
  let adminApiUrl = null;
  let tokenAdmin = null;

  const tokenLCR = getMapToken(chainId, SYMBOL_TOKEN.LCR);
  if (!tokenLCR) throw { error: `Token ${SYMBOL_TOKEN.LCR} not supported` };
  const lcrAddress = tokenLCR.address;

  if (isFreeCoin) {
    const tokenNative = getMapToken(chainId, SYMBOL_NATIVE[chainId]);
    if (!tokenNative) throw { error: `Token ${SYMBOL_TOKEN[chainId]} not supported` };
    const nativeAddress = tokenNative.address;

    if (symbolTokenIn === SYMBOL_TOKEN.LCR && symbolTokenOut === SYMBOL_NATIVE[chainId]) {
      tokenIn = lcrAddress;
      tokenOut = nativeAddress;
      path = [lcrAddress, nativeAddress];
      methodName = 'swapExactTokensForTokens';
    } else if (symbolTokenIn === SYMBOL_NATIVE[chainId] && symbolTokenOut === SYMBOL_TOKEN.LCR) {
      tokenIn = nativeAddress;
      tokenOut = lcrAddress;
      path = [nativeAddress, lcrAddress];
      methodName = 'swapExactTokensForTokens';
    } else throw { error: `Dex only supports ${SYMBOL_TOKEN.LCR}/${SYMBOL_NATIVE[chainId]}` };
  } else {
    const tokenUSDT = getMapToken(chainId, SYMBOL_TOKEN.USDT);
    if (!tokenUSDT) throw { error: `Token ${SYMBOL_TOKEN.USDT} not supported` };
    const usdtAddress = tokenUSDT.address;

    adminApiUrl = CHAIN_ID_ADMIN_API_URL[chainId];
    if (!adminApiUrl) throw { error: 'Info Admin API URL not found' };

    tokenAdmin = CHAIN_ID_ADMIN_TOKEN[chainId];
    if (!tokenAdmin) throw { error: `Admin Token not found` };

    if (symbolTokenIn === SYMBOL_TOKEN.LCR && symbolTokenOut === SYMBOL_TOKEN.USDT) {
      tokenIn = lcrAddress;
      tokenOut = usdtAddress;
      path = [lcrAddress, usdtAddress];
      methodName = 'swapExactTokensForTokens';
    } else if (symbolTokenIn === SYMBOL_TOKEN.USDT && symbolTokenOut === SYMBOL_TOKEN.LCR) {
      tokenIn = usdtAddress;
      tokenOut = lcrAddress;
      path = [usdtAddress, lcrAddress];
      methodName = 'swapExactTokensForTokens';
    } else throw { error: `Dex only supports ${SYMBOL_TOKEN.LCR}/${SYMBOL_TOKEN.USDT}` };
  }

  const router = new ethers.Contract(deployments[chainId?.toString()].LCRRouter02[0], ABIS.LCRRouter02, wallet);

  const provider = await getProvider(chainId);
  const gasPrice = await getGasPriceDynamic({ chainId, provider });

  let instancetokenIn = await createInstanceAddress(chainId, SYMBOL_ABI.ERC20, tokenIn, wallet);
  let decimalTokenIn = await instancetokenIn.decimals();

  let instancetokenOut = await createInstanceAddress(chainId, SYMBOL_ABI.ERC20, tokenOut, wallet);
  let decimalTokenOut = await instancetokenOut.decimals();

  // Check and approve max tokenIn for router
  let allowance = await instancetokenIn.allowance(wallet.address, router.address);
  if (allowance <= 0) {
    let amountNativeNeedSend = 0;
    if (SYMBOL_NATIVE[chainId] == SYMBOL_TOKEN.CELO && symbolTokenIn === SYMBOL_NATIVE[chainId])
      amountNativeNeedSend = amountInEther;

    await buffNativeHaveCheckMinBalance({ chainId, wallet, amountNativeNeedSend });
    let txApproveMax = await instancetokenIn.approve(router.address, MAX_VALUE, { gasPrice });
    await txApproveMax.wait(1);
    await saveBalanceRecent({ chainId, addressWallet: wallet.address, typeWallet });
  }

  let deadline = timestampNow() + 1000000;
  let amountInWei = etherToWeiUnit(amountInEther, decimalTokenIn);
  let amountsOut = await router.getAmountsOut(amountInWei, path);

  let amountOutMinEther = weiToEtherUnit(amountsOut[amountsOut.length - 1], decimalTokenOut);

  let amountEtherSlippage = (parseFloat(amountOutMinEther) * ((100 - slippage) / 100)).toFixed(decimalTokenOut);

  let amountOutMinWei = etherToWeiUnit(amountEtherSlippage, decimalTokenOut);

  let signature = null;
  let amountNativeNeedSend = 0;
  if (isFreeCoin) {
    if (SYMBOL_NATIVE[chainId] == SYMBOL_TOKEN.CELO && symbolTokenIn === SYMBOL_NATIVE[chainId])
      amountNativeNeedSend = amountInEther;

    const blockCurrent = await provider.getBlockNumber();
    const nonceCurrent = await router.getUsersNonce(wallet.address);
    const nonce = nonceCurrent.add(1);
    signature = await createSignature({
      chainId,
      methodName,
      amountWei: etherToWei(amountInEther),
      tokenIn,
      tokenOut,
      from: wallet.address,
      to: wallet.address,
      expireBlock: blockCurrent + 100,
      nonce,
    });
  } else {
    const resGetSignature = await getSignature({
      token: tokenAdmin,
      network: 'BSC',
      walletAddress: wallet.address,
      amountInEther: parseFloat(amountInEther),
      amountOutEther: amountEtherSlippage,
      methodName,
      tokenIn,
      tokenOut,
      adminApiUrl,
    });

    signature = resGetSignature?.data?.encoded_data ? `0x${resGetSignature?.data?.encoded_data}` : null;
  }

  if (!signature) throw { error: `Generate signature swap failed!` };

  await buffNativeHaveCheckMinBalance({ chainId: chainId, wallet, amountNativeNeedSend });

  let gasLimit = await router.estimateGas.swapExactTokensForTokens(
    amountInWei,
    amountOutMinWei,
    path,
    wallet.address,
    deadline,
    signature,
  );

  const buffGasLimit = await getBuffGasLimit({ chainId });
  gasLimit = gasLimit.add(buffGasLimit);

  let txSwap = await router.swapExactTokensForTokens(
    amountInWei,
    amountOutMinWei,
    path,
    wallet.address,
    deadline,
    signature,
    { gasLimit, gasPrice },
  );

  await txSwap.wait(1);

  const gasFee = await awaitTransaction({ chainId, txHash: txSwap.hash });
  await saveBalanceRecent({ chainId, addressWallet: wallet.address, typeWallet });

  const receipt = await provider.getTransactionReceipt(txSwap.hash);
  const amountOutWei = await decodeAmountOutTransactionSwap({ receipt });
  const amountOutEther = weiToEtherUnit(amountOutWei, decimalTokenOut);

  return {
    status: true,
    data: {
      chainId,
      symbolTokenIn,
      symbolTokenOut,
      amountIn: amountInEther,
      amountOut: amountOutEther,
      sender: wallet.address,
      txHash: txSwap.hash,
      gasFee,
    },
  };
};

export const tradeNativeToTokenPancake = async ({ wallet, chainId, symbolTokenOut, amount, typeWallet }) => {
  const tokenOutInfo = getMapToken(chainId, symbolTokenOut);
  if (!tokenOutInfo) throw { error: `Token ${symbolTokenOut} not supported` };
  const addressTokenOut = tokenOutInfo.address;

  let pancake = new PancakeSwap({ chainId });

  return await pancake.swap({
    privateKey: wallet.privateKey,
    tokenIn: ZERO_ADDRESS,
    tokenOut: addressTokenOut,
    amountIn: amount,
    typeWallet,
    slippage: 0.5,
  });
};

export const tradeTokenToNativePancke = async ({ chainId, wallet, symbolTokenIn, amountInEther, typeWallet }) => {
  const infoTokenIn = getMapToken(chainId, symbolTokenIn);
  if (!infoTokenIn) throw { error: `Token ${symbolTokenIn} not supported` };
  const addressTokenIn = infoTokenIn.address;

  let erc20 = new ERC20({ chainId, token: addressTokenIn });
  let pancake = new PancakeSwap({ chainId });
  const balanceTokenEtherWei = await erc20.balanceOf({ address: wallet.address });
  const balanceTokenEther = parseFloat(weiToEther(balanceTokenEtherWei));
  if (balanceTokenEther < amountInEther)
    throw { error: `${symbolTokenIn} is insufficient to swap sender [${wallet.address}]` };

  return await pancake.swap({
    privateKey: wallet.privateKey,
    tokenIn: addressTokenIn,
    tokenOut: ZERO_ADDRESS,
    amountIn: amountInEther,
    typeWallet,
    slippage: 0.5,
  });
};

export const tradeTokenToTokenPancke = async ({
  chainId,
  wallet,
  symbolTokenIn,
  symbolTokenOut,
  amountInEther,
  typeWallet,
}) => {
  const infoTokenIn = getMapToken(chainId, symbolTokenIn);
  if (!infoTokenIn) throw { error: `Token ${symbolTokenIn} not supported` };
  const addressTokenIn = infoTokenIn.address;
  const infoTokenOut = getMapToken(chainId, symbolTokenOut);
  if (!infoTokenOut) throw { error: `Token ${symbolTokenOut} not supported` };
  const addressTokenOut = infoTokenOut.address;

  let erc20In = new ERC20({ chainId, token: addressTokenIn });
  let pancake = new PancakeSwap({ chainId });
  const balanceTokenInWei = await erc20In.balanceOf({ address: wallet.address });
  const balanceTokenInEther = parseFloat(weiToEther(balanceTokenInWei));
  if (balanceTokenInEther < amountInEther)
    throw { error: `${symbolTokenIn} is insufficient to swap sender [${wallet.address}]` };

  return await pancake.swap({
    privateKey: wallet.privateKey,
    tokenIn: addressTokenIn,
    tokenOut: addressTokenOut,
    amountIn: amountInEther,
    typeWallet,
    slippage: 0.5,
  });
};

export const tradeTokenToTokenOurDex = async ({
  chainId,
  wallet,
  symbolTokenIn,
  symbolTokenOut,
  amountInEther,
  typeWallet,
  isFreeCoin = false,
}) => {
  const infoTokenIn = getMapToken(chainId, symbolTokenIn);
  if (!infoTokenIn) throw { error: `Token ${symbolTokenIn} not supported` };
  const addressTokenIn = infoTokenIn.address;

  const tokenIn = new ERC20({ chainId, token: addressTokenIn });
  const balanceTokenInWei = await tokenIn.balanceOf({ address: wallet.address });
  const balanceTokenEther = parseFloat(weiToEther(balanceTokenInWei));
  if (balanceTokenEther < amountInEther)
    throw { error: `${symbolTokenIn} is insufficient to swap sender [${wallet.address}]` };

  return await tradeOurDex({
    chainId,
    wallet,
    symbolTokenIn,
    symbolTokenOut,
    amountInEther,
    slippage: 1,
    typeWallet,
    isFreeCoin,
  });
};

export const depositTokenUttByAdminToken = async ({ chainId, symbolToken, wallet, amountInEther, typeWallet }) => {
  const resBalance = await getBalanceOnChainToken({ chainId, symbolToken, address: wallet.address });
  if (parseFloat(resBalance) < parseFloat(amountInEther))
    throw { error: `${symbolToken} insufficient deposit to Spending sender [ ${wallet.address} ]` };

  return await depositTokenToSpendingByAdminToken({
    chainId,
    wallet,
    symbolToken,
    amountInEther,
    typeWallet,
  });
};

export const depositToSpendingFullOnChain = async ({ chainId, symbolToken, wallet, amountInEther, typeWallet }) => {
  const resBalance = await getBalanceOnChainToken({ chainId, symbolToken, address: wallet.address });
  if (parseFloat(resBalance) < parseFloat(amountInEther))
    throw { error: `${symbolToken} insufficient deposit to Spending sender [ ${wallet.address} ]` };

  return await depositTokenToSpendingFullOnChain({
    chainId,
    wallet,
    symbolToken,
    amountInEther,
    typeWallet,
  });
};

export const processingWithdrawTokenUtt = async ({
  chainId,
  addressReceiver,
  amount,
  idExecuteTemplate,
  jobiIndex,
}) => {
  const apiUrl = CHAIN_ID_API_URL[chainId];
  if (!apiUrl) throw { error: 'Info apiUrl not found' };
  const adminApiUrl = CHAIN_ID_ADMIN_API_URL[chainId];
  if (!adminApiUrl) throw { error: 'Info Admin API URL not found' };
  const tokenAdmin = CHAIN_ID_ADMIN_TOKEN[chainId];
  if (!tokenAdmin) throw { error: `Admin Token not found` };
  const tokenBot = CHAIN_ID_BOT_TOKEN[chainId];
  if (!tokenBot) throw { error: `Bot Token not found` };
  const botUserId = CHAIN_ID_BOT_ID[chainId];
  if (!botUserId) throw { error: `Bot Id not found` };

  const resBalances = await getBalanceOfSpendingAccount(tokenBot, apiUrl);
  if (!resBalances?.data?.token_utt) throw { error: 'Asset UTT not  found' };
  const balanceUtt = parseFloat(resBalances?.data?.token_utt?.utt);

  if (parseFloat(balanceUtt) < parseFloat(amount) + FEE_WITHDRAW_TOKEN) throw { error: `Insufficient to withdraw` };

  const { status, error } = await withdrawFromSpendingToWallet({
    botUserId,
    token: tokenAdmin,
    amount,
    idExecuteTemplate,
    jobiIndex,
    addressReceiver,
    adminApiUrl,
    apiUrl,
  });
  if (!status) throw error;
  return { status: true, error: null };
};

export const transferNative = async ({ chainId, walletSender, to, amount, typeWallet }) => {
  const native = new Native({ chainId });

  const balanceSenderWei = await native.balanceOf({ address: walletSender.address });
  const balanceSender = parseFloat(maxNumberDecimal(weiToEther(balanceSenderWei)));

  const gasPrice = await getGasPriceDynamic({ chainId });
  const feeGas = parseFloat(weiToEther(21000 * gasPrice));
  const condition = balanceSender < amount + feeGas;
  if (condition) await buffNative({ chainId, wallet: walletSender, amount: amount + feeGas - balanceSender });

  return await native.transfer({ privateKey: walletSender.privateKey, receiver: to, amount, typeWallet });
};

export const transferOnChainTokens = async ({ chainId, symbolToken, walletSender, to, amount, typeWallet }) => {
  const infoToken = getMapToken(chainId, symbolToken);
  if (!infoToken) throw { error: `Token ${symbolToken} not supported` };
  const address = infoToken.address;

  const token = new ERC20({
    chainId,
    token: address,
  });

  const resultTransfer = await token.transfer({
    privateKey: walletSender.privateKey,
    receiver: to,
    amount,
    typeWallet,
  });
  return resultTransfer;
};

export const transferAllOnChainTokens = async ({ chainId, symbolToken, walletSender, to, typeWallet }) => {
  const infoToken = getMapToken(chainId, symbolToken);
  if (!infoToken) throw { error: `Token ${symbolToken} not supported` };
  const address = infoToken.address;

  const token = new ERC20({
    chainId,
    token: address,
  });

  const resultTransfer = await token.transferAll({
    privateKey: walletSender.privateKey,
    receiver: to,
    typeWallet,
  });
  return resultTransfer;
};

export const checkBalanceEnough = async ({ chainId, address, amount, feeGas }) => {
  const native = new Native({ chainId });
  const balanceWei = await native.balanceOf({ address });
  const balance = parseFloat(maxNumberDecimal(weiToEther(balanceWei)));
  return balance >= parseFloat(amount) + feeGas;
};

export const buffGasByGasLimit = async ({ chainId, wallet, gasLimit }) => {
  const provider = await getProvider(chainId);
  const gasPrice = await getGasPriceDynamic({ chainId, provider });
  const feeGas = weiToEther(gasLimit.mul(gasPrice));
  await buffNative({ chainId, wallet, amount: feeGas });
};

export const buffGasByGasLimitHaveCheckBalance = async ({ chainId, wallet, gasLimit, amountNative }) => {
  const provider = await getProvider(chainId);
  const gasPrice = await getGasPriceDynamic({ chainId, provider });
  const feeGas = weiToEther(BigNumber.from(gasLimit?.toString()).mul(gasPrice));
  const balanceEnough = await checkBalanceEnough({ chainId, address: wallet.address, amount: amountNative, feeGas });
  if (!balanceEnough) await buffNative({ chainId, wallet, amount: feeGas });
};

export const buffNativeHaveCheckMinBalance = async ({ chainId, wallet, amountNativeNeedSend }) => {
  const native = new Native({ chainId });
  const balanceWei = await native.balanceOf({ address: wallet.address });
  const amountNativeNeedSendWei = etherToWei(amountNativeNeedSend);
  const AMOUNT_BUFF_GAS_FEE = randomFloatBetween(BUFF_GAS_FEE[chainId] - 0.0018, BUFF_GAS_FEE[chainId]);
  let balanceRemain = balanceWei.sub(amountNativeNeedSendWei);
  if (balanceRemain.lte(0))
    await buffNative({
      chainId,
      wallet,
      amount: weiToEther(amountNativeNeedSendWei.sub(balanceWei).add(etherToWei(AMOUNT_BUFF_GAS_FEE))),
    });
  else if (balanceRemain.gt(0) && balanceRemain.lte(etherToWei(MIN_BALANCE_NATIVE[chainId])))
    await buffNative({ chainId, wallet, amount: AMOUNT_BUFF_GAS_FEE });
};

export const buffNative = async ({ chainId, wallet, amount }) => {
  let native = new Native({ chainId });

  const indexSourceWallet = await getCurrentIndexWalletSource({ chainId });

  const walletSender = await getWalletSourceByIndex({ chainId, indexWallet: indexSourceWallet });

  const indexWalletReceiver = getIndexByWallet({ wallet });

  const provider = await getProvider(chainId);
  let count = 0;
  while (count < 100) {
    const infoSourceWallet = await WalletSourceModel.findOne({
      chain_id: chainId,
      address: { $regex: new RegExp('^' + walletSender.address.toLowerCase(), 'i') },
    });
    if (!infoSourceWallet || !infoSourceWallet.tx_hash_recent) break;
    const receipt = await provider.getTransactionReceipt(infoSourceWallet.tx_hash_recent);
    if (receipt) break;
    await sleep(1000);
    count++;
  }

  let txTransfer = await native.transfer({
    privateKey: walletSender.privateKey,
    receiver: wallet.address,
    amount,
    typeWallet: TYPE_WALLET.source_dex,
  });

  await logs({
    chain_id: chainId,
    type: NAME_JOB.onChain.buff_gas_fee,
    status: txTransfer.status,
    wallet_address_1: walletSender.address,
    wallet_address_2: wallet.address,
    index_wallet_1: indexSourceWallet,
    index_wallet_2: indexWalletReceiver,
    amount,
    token_in: SYMBOL_NATIVE[chainId],
    token_out: SYMBOL_NATIVE[chainId],
    amount_fee: 0,
    gas_fee: txTransfer?.data?.gasFee,
    tx_hash: txTransfer?.data?.txHash,
    descriptions: 'Buff gas fee',
  });

  return txTransfer;
};

export const fecthPriceNative_USDT = async ({ chainId }) => {
  const wrappedNative = getMapToken(chainId, SYMBOL_TOKEN.WRAPPED_NATIVE);
  if (!wrappedNative) throw { error: `Token ${SYMBOL_TOKEN.WRAPPED_NATIVE} not supported` };
  const addressWrappedNative = wrappedNative.address;
  const tokenUSDT = getMapToken(chainId, SYMBOL_TOKEN.USDT);
  if (!tokenUSDT) throw { error: `Token ${SYMBOL_TOKEN.USDT} not supported` };
  const addressUSDT = tokenUSDT.address;
  const routerPancke = await createInstance(chainId, SYMBOL_ABI.ROUTER_FORK_UNIV2, SYMBOL_ADDRESS.PANCAKE_ROUTER);
  let amountsOutPancake = await routerPancke.getAmountsOut(etherToWei(1), [addressWrappedNative, addressUSDT]); // price 1 Native / USDT
  let priceNative = weiToEther(amountsOutPancake[amountsOutPancake.length - 1]);
  return priceNative;
};

export const fecthPriceLCR_USDT = async ({ chainId }) => {
  const tokenLCR = getMapToken(chainId, SYMBOL_TOKEN.LCR);
  if (!tokenLCR) throw { error: `Token ${SYMBOL_TOKEN.LCR} not supported` };
  const addressLCR = tokenLCR.address;
  const tokenUSDT = getMapToken(chainId, SYMBOL_TOKEN.USDT);
  if (!tokenUSDT) throw { error: `Token ${SYMBOL_TOKEN.USDT} not supported` };
  const addressUSDT = tokenUSDT.address;
  const provider = await getProvider(chainId);
  const routerOurDex = new ethers.Contract(deployments[chainId?.toString()].LCRRouter02[0], ABIS.LCRRouter02, provider);
  let amountsOutOurDEX = await routerOurDex.getAmountsOut(etherToWei(1), [addressLCR, addressUSDT]); // price 1 LCR / USDT
  let priceLCR = weiToEther(amountsOutOurDEX[amountsOutOurDEX.length - 1]);
  return priceLCR;
};

export const fecthPriceTokenByBinance = async ({ chainId, symbolToken }) => {
  try {
    const res = await axios.get(`${BASE_API_BINANCE}${SYMBOL_GET_BINANCE[chainId][symbolToken]}`);
    return res?.data?.price && parseFloat(res?.data?.price);
  } catch (error) {
    throw { error: `Fetch price token ${symbolToken} failed!` };
  }
};

export const fecthPriceFLCR = async ({ chainId }) => {
  const tokenLCR = getMapToken(chainId, SYMBOL_TOKEN.LCR);
  if (!tokenLCR) throw { error: `Token ${SYMBOL_TOKEN.LCR} not supported` };
  const addressLCR = tokenLCR.address;
  const tokenNative = getMapToken(chainId, SYMBOL_NATIVE[chainId]);
  if (!tokenNative) throw { error: `Token ${SYMBOL_NATIVE[chainId]} not supported` };
  const addressNative = tokenNative.address;
  const provider = await getProvider(chainId);
  const addressLcrRouter02 = deployments[chainId?.toString()].LCRRouter02[0];
  const router = new ethers.Contract(addressLcrRouter02, ABIS.LCRRouter02, provider);
  const path = [addressLCR, addressNative];
  const amount = etherToWei(1);
  let amountsOut = await router.getAmountsOut(amount, path); // price 1 LCR / Native
  let priceFLCR = weiToEther(amountsOut[amountsOut.length - 1]);
  return priceFLCR;
};

// amountInEther is amount Native input job index 0  of template
export const calcVolumesOurDex = async ({ jobs, amountInEther, rateNative }) => {
  let volume = 0;
  let timesSwapOurDex = 0;
  await jobs.forEach(job => {
    if (job.name_job == NAME_JOB.onChain.swap_token_to_token_our_dex) timesSwapOurDex += 1;
  });
  if (timesSwapOurDex == 0) return volume;
  let volumeUSDT = parseFloat(amountInEther) * parseFloat(rateNative);
  volume = parseFloat(volumeUSDT) * timesSwapOurDex;
  return volume;
};

export const getSourceWalletMinBalances = async ({ type, chainId, listSymbolAssets }) => {
  await cacheBalanceWalletsSource({ chainId });
  return await getWalletBalancesCommon({ type, chainId, listSymbolAssets, isMax: false });
};

export const getSourceWalletMaxBalances = async ({ type, chainId, listSymbolAssets }) => {
  await cacheBalanceWalletsSource({ chainId });
  return await getWalletBalancesCommon({ type, chainId, listSymbolAssets, isMax: true });
};

export const getWalletBalancesCommon = async ({ type, chainId, listSymbolAssets, isMax }) => {
  let listResults = [];
  let sort = { balance: -1 };
  if (isMax) sort = { balance: -1 };
  else sort = { balance: 1 };

  for (let i = 0; i < listSymbolAssets.length; i++) {
    const asset = listSymbolAssets[i];
    let max = await WalletSourceModel.aggregate([
      { $match: { chain_id: chainId?.toString(), asset: asset?.toLowerCase(), type } },
      { $sort: sort },
      {
        $group: {
          _id: '$chain_id',
          data: { $first: '$$ROOT' },
        },
      },
      { $replaceRoot: { newRoot: '$data' } },
    ]);
    if (max.length <= 0) {
      listResults.push({ index: 0, address: null, asset: asset?.toLowerCase(), balance: null });
    } else {
      listResults.push({
        index: max.at(0).index,
        address: max.at(0).address,
        asset: asset?.toLowerCase(),
        balance: parseFloat(max.at(0).balance),
      });
    }
  }
  return listResults;
};

export const getWalletBalanceRateMaxBalances = async ({ chainId, listSymbolAssets }) => {
  let listMin = [];
  let wallet0 = getWalletBalanceRateByIndexOffChain({ indexWallet: 0 });
  await cacheBalanceWalletsBalanceRate({ chainId });
  for (let i = 0; i < listSymbolAssets.length; i++) {
    const asset = listSymbolAssets[i];
    let max = await WalletBalanceRateModel.aggregate([
      { $match: { chain_id: chainId?.toString(), asset: asset?.toLowerCase() } },
      { $sort: { balance: -1 } },
      {
        $group: {
          _id: '$chain_id',
          data: { $first: '$$ROOT' },
        },
      },
      { $replaceRoot: { newRoot: '$data' } },
    ]);
    if (max.length <= 0) {
      listMin.push({ index: 0, address: wallet0.address, asset: asset?.toLowerCase(), balance: null });
    } else {
      listMin.push({
        index: max.at(0).index,
        address: max.at(0).address,
        asset: asset?.toLowerCase(),
        balance: parseFloat(max.at(0).balance),
      });
    }
  }
  return listMin;
};

export const getCurrentIndexWalletSource = async ({ chainId }) => {
  let currentIndexWalletSource = currentIndexSource[chainId] ? currentIndexSource[chainId] : 0;
  if (!currentIndexSource[chainId]) currentIndexSource[chainId] = 0;
  let nextIndex = currentIndexWalletSource + 1;
  nextIndex = nextIndex < LIST_INDEX_WALLET_SOURCE.length ? nextIndex : 0;
  currentIndexSource[chainId] = nextIndex;
  return currentIndexWalletSource;
};

export const getCurrentIndexWalletSourceSkim = async ({ chainId }) => {
  let currentIndexWalletSourceSkim = currentIndexSourceSkim[chainId] ? currentIndexSourceSkim[chainId] : 1;
  if (!currentIndexSourceSkim[chainId]) currentIndexSourceSkim[chainId] = 1;
  let nextIndex = currentIndexWalletSourceSkim + 1;
  nextIndex = nextIndex < LIST_INDEX_SOURCE_SKIM.length ? nextIndex : 1;
  currentIndexSourceSkim[chainId] = nextIndex;
  return currentIndexWalletSourceSkim;
};

export const sleepMinutesRandom = async ({ minTime, maxTime }) => {
  const timeSleep = randomIntBetween(minTime, maxTime);
  await sleep(timeSleep * 60000);
};

export const sleepHoursRandom = async ({ minTime, maxTime }) => {
  const timeSleep = randomIntBetween(minTime, maxTime);
  await sleep(timeSleep * 3600000);
};

export const awaitTransaction = async ({ chainId, txHash }) => {
  const provider = await getProvider(chainId);
  let count = 0;
  let gasFee = null;
  while (count < 50) {
    try {
      const receipt = await provider.getTransactionReceipt(txHash);
      if (receipt) {
        gasFee = ethers.utils.formatEther(receipt.effectiveGasPrice.mul(receipt.gasUsed));
        break;
      }
    } catch (error) {
      await sleep(2000);
      count++;
      continue;
    }
  }
  return gasFee;
};

export const saveBalanceRecent = async () => {
  // export const saveBalanceRecent = async ({ chainId, addressWallet, typeWallet }) => {
  // try {
  // addressWallet = addressWallet.toLowerCase();
  // const infoTokenLcr = getMapToken(chainId, SYMBOL_TOKEN.LCR);
  // if (!infoTokenLcr) throw { error: `Token ${SYMBOL_TOKEN.LCR} not supported` };
  // const infoTokenUsdt = getMapToken(chainId, SYMBOL_TOKEN.USDT);
  // if (!infoTokenUsdt) throw { error: `Token ${SYMBOL_TOKEN.USDT} not supported` };

  // const listTokens = [
  //   {
  //     address: infoTokenLcr.address,
  //     symbol: SYMBOL_TOKEN.LCR,
  //   },
  //   {
  //     address: infoTokenUsdt.address,
  //     symbol: SYMBOL_TOKEN.USDT,
  //   },
  //   {
  //     address: ZERO_ADDRESS,
  //     symbol: SYMBOL_NATIVE[chainId],
  //   },
  // ];

  // const provider = await getProvider(chainId);
  // const multiTransferAddress = getAddressFromMapJson(chainId, 'MultiTransfer');
  // if (!multiTransferAddress) throw { error: 'MultiTransfer address must exists' };
  // const instanceMultiTransfer = new ethers.Contract(multiTransferAddress, ABIS.MultiTransferABI, provider);

  // const lsitAddressTokens = listTokens.map(a => a.address.toLowerCase());
  // const mapSymbol = new Map(listTokens.map(i => [i.address.toLowerCase(), i.symbol.toLowerCase()]));

  // const values = await instanceMultiTransfer.balances([addressWallet], lsitAddressTokens);

  // let infoBalances = {};

  // lsitAddressTokens.forEach((tokenAddress, index) => {
  //   tokenAddress = tokenAddress.toLowerCase();
  //   const balance = values[index];
  //   infoBalances[tokenAddress] = {
  //     balanceEther: weiToEther(balance),
  //     balanceWei: balance,
  //   };
  // });

  // let dataSave = await Promise.all(
  //   Object.keys(infoBalances).map(async tokenAddress => {
  //     return {
  //       chainId,
  //       address: addressWallet,
  //       tokenAddress,
  //       asset: mapSymbol.get(tokenAddress),
  //       balance: new mongoose.Types.Decimal128(infoBalances[tokenAddress].balanceEther?.toString()),
  //       balance_str: infoBalances[tokenAddress].balanceEther?.toString(),
  //       balance_wei: infoBalances[tokenAddress].balanceWei?.toString(),
  //     };
  //   }),
  // );

  // await Promise.all(
  //   dataSave.map(async data => {
  //     let bodySave = {
  //       asset: data.asset,
  //       balance: data.balance,
  //       balance_str: data.balance_str,
  //       balance_wei: data.balance_wei,
  //     };
  //     if (typeWallet) bodySave.type = typeWallet;

  //     await BalanceWalletModel.findOneAndUpdate(
  //       { chain_id: chainId, address: addressWallet, address_asset: data.tokenAddress },
  //       { ...bodySave },
  //       {
  //         upsert: true,
  //         new: true,
  //         setDefaultsOnInsert: true,
  //       },
  //     );
  //   }),
  // );

  return { status: true, error: null };
  // } catch (error) {
  //   return { status: false, error };
  // }
};

export const checkDuplicateOrRunAgainJob = async ({ job, isFreeCoin = false }) => {
  try {
    const { job_index, id_execute_template, index_wallet_in, index_wallet_out } = job.attrs.data;
    const execute = isFreeCoin
      ? await ExecuteTemplateFreeCoinModel.findById(id_execute_template)
      : await ExecuteTemplateModel.findById(id_execute_template);

    if (job_index == 0) {
      const address_in =
        index_wallet_in == null ? null : getWalletByIndexOffChain({ indexWallet: index_wallet_in }).address;
      const address_out =
        index_wallet_out == null ? null : getWalletByIndexOffChain({ indexWallet: index_wallet_out }).address;
      job.attrs.data.address_wallet_in = address_in;
      job.attrs.data.address_wallet_out = address_out;
      await job.save();
    }
    const jobIndex = execute.jobs.find(j => j.index == job_index);
    const jobNextIndex = execute.jobs.find(j => j.index == job_index + 1);
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

export const checkJobErrorAmount = async ({ queue, job, isFreeCoin = false }) => {
  try {
    const { job_index, id_execute_template, amount } = job.attrs.data;
    if (parseFloat(amount) > 0) return false;
    const execute = isFreeCoin
      ? await ExecuteTemplateFreeCoinModel.findById(id_execute_template)
      : await ExecuteTemplateModel.findById(id_execute_template);
    const jobPrevIndex = execute.jobs.find(j => j.index == job_index - 1);
    let jobQueuePrev = (await queue.jobs({ _id: { $eq: jobPrevIndex?.job_id } }))[0];
    let amountOutPrev = jobQueuePrev?.attrs?.data?.amountOut || 0;
    amountOutPrev = parseFloat(maxNumberDecimal(amountOutPrev));
    if (job_index == 0 && !amount) {
      const amountRandom = randomIntBetween(10, 50);
      await execute.updateOne(
        { $set: { 'jobs.$[i].job_id': null, 'jobs.$[i].amount': amountRandom } },
        { arrayFilters: [{ 'i.index': job_index }], upsert: true, new: true, setDefaultsOnInsert: true },
      );
      job.attrs.data.amount = amountRandom;
      await job.save();

      const runAt = moment().add(1, 'minutes');
      let schedule = await job.schedule(runAt);

      await execute.updateOne(
        { $set: { 'jobs.$[i].job_id': schedule.attrs._id } },
        { arrayFilters: [{ 'i.index': job_index }] },
      );
      return true;
    } else if (jobQueuePrev && !amountOutPrev) {
      await execute.updateOne(
        { $set: { 'jobs.$[prev].job_id': null, 'jobs.$[i].job_id': null } },
        {
          arrayFilters: [{ 'prev.index': jobPrevIndex.index }, { 'i.index': job_index }],
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      );
      const runAt = moment().add(1, 'minutes');
      let schedule = await jobQueuePrev.schedule(runAt);
      await execute.updateOne(
        { $set: { 'jobs.$[prev].job_id': schedule.attrs._id } },
        { arrayFilters: [{ 'prev.index': jobPrevIndex.index }] },
      );
      return true;
    } else if (!jobQueuePrev) {
      const { status, error } = await cancelExecuteAndReschedule({ id_execute_template });
      if (!status) throw { error };
      return true;
    }

    await scheduleNextJob({ job: jobQueuePrev, amountOut: amountOutPrev });
    return true;
  } catch (error) {
    return false;
  }
};

// Check job failed by insufficient balance but wallet already execute transaction in on-chain
export const checkJobFailedInsufficient = async ({ job }) => {
  try {
    const { chain_id, index_wallet_out, symbol_token_in, symbol_token_out, amount } = job.attrs.data;

    if (!job?.attrs?.failedAt) return false;

    const reason = job?.attrs?.failReason?.toString()?.toLowerCase();
    if (!reason || !reason.includes('insufficient')) return false;

    const chainId = chain_id?.toString();

    let amountOut = null;
    if (symbol_token_in == SYMBOL_NATIVE[chain_id] && symbol_token_out == SYMBOL_TOKEN.LCR) {
      const priceNative = parseFloat(await fecthPriceNative_USDT({ chainId }));
      const priceLCR = parseFloat(await fecthPriceLCR_USDT({ chainId }));
      amountOut = (parseFloat(amount) * priceNative) / priceLCR;
    } else if (symbol_token_in == SYMBOL_TOKEN.USDT && symbol_token_out == SYMBOL_TOKEN.LCR) {
      const priceLCR = parseFloat(await fecthPriceLCR_USDT({ chainId }));
      amountOut = parseFloat(amount) / priceLCR;
    } else if (symbol_token_in == SYMBOL_TOKEN.LCR && symbol_token_out == SYMBOL_NATIVE[chain_id]) {
      const priceLCR = parseFloat(await fecthPriceLCR_USDT({ chainId }));
      const priceNative = parseFloat(await fecthPriceNative_USDT({ chainId }));
      amountOut = (parseFloat(amount) * priceLCR) / priceNative;
    } else if (symbol_token_in == SYMBOL_TOKEN.LCR && symbol_token_out == SYMBOL_TOKEN.USDT) {
      const priceLCR = parseFloat(await fecthPriceLCR_USDT({ chainId }));
      amountOut = parseFloat(amount) * priceLCR;
    }

    const walletOut = getWalletByIndexOffChain({ indexWallet: index_wallet_out });
    const tokenOut = getMapToken(chain_id, symbol_token_out);
    if (!tokenOut) throw { error: 'Token not supported' };
    let instance = null;
    if (tokenOut == ZERO_ADDRESS) instance = new Native({ chainId });
    else instance = new ERC20({ chainId, token: tokenOut.address });
    if (!instance) throw { error: 'Token not supported' };
    const balanceTokenOutWei = await instance.balanceOf({ address: walletOut.address });
    const balanceTokenOutEther = weiToEther(balanceTokenOutWei);

    if (roundDownToNearestAuto(amountOut) > roundDownToNearestAuto(balanceTokenOutEther)) return false;

    await scheduleNextJob({ job, amountOut: balanceTokenOutEther });
    return true;
  } catch (error) {
    return false;
  }
};

export const getGasPriceDynamic = async ({ chainId, provider }) => {
  chainId = chainId?.toString();
  provider = provider ? provider : await getProvider(chainId);
  let configBuffGasPrice = await ConfigModel.findOne({
    chain_id: chainId,
    key: KEY_CONFIG.buff_gas_price,
  });
  if (!configBuffGasPrice)
    configBuffGasPrice = await ConfigModel.create({
      chain_id: chainId,
      key: KEY_CONFIG.buff_gas_price,
      value: BUFF_GAS_PRICE?.toString(),
    });

  let gasPrice = await provider.getGasPrice();
  if (chainId.toString() === '42220') gasPrice = await getCacheGasPrice({ chainId, gasPriceOnChain: gasPrice });

  const buffGasPrice = parseUnits(configBuffGasPrice.value, 'gwei');
  const gasPriceBuffed = gasPrice.add(buffGasPrice);
  return gasPriceBuffed;
};

export const getBuffGasLimit = async ({ chainId }) => {
  chainId = chainId?.toString();
  let configBuffGasLimit = await ConfigModel.findOne({
    chain_id: chainId,
    key: KEY_CONFIG.buff_gas_limit,
  });
  if (!configBuffGasLimit)
    configBuffGasLimit = await ConfigModel.create({
      chain_id: chainId,
      key: KEY_CONFIG.buff_gas_limit,
      value: BUFF_GASLIMT[chainId] ? BUFF_GASLIMT[chainId].toString() : 0,
    });

  const buffGasLimit = configBuffGasLimit?.value ? parseInt(configBuffGasLimit?.value) : 0;
  return buffGasLimit;
};

export const getBuffGasPrice = async ({ chainId }) => {
  chainId = chainId?.toString();
  let configBuffGasPrice = await ConfigModel.findOne({
    chain_id: chainId,
    key: KEY_CONFIG.buff_gas_price,
  });
  if (!configBuffGasPrice)
    configBuffGasPrice = await ConfigModel.create({
      chain_id: chainId,
      key: KEY_CONFIG.buff_gas_price,
      value: BUFF_GAS_PRICE?.toString(),
    });
  const buffGasPrice = parseUnits(configBuffGasPrice.value, 'gwei');
  return buffGasPrice;
};

export const transferAssetBetweentWallets = async ({
  chainId,
  asset,
  typeWalletFrom,
  indexWalletFrom,
  typeWalletTo,
  indexWalletTo,
  amount,
}) => {
  try {
    let addressToken = null;
    let symbolToken = null;
    switch (asset.toLowerCase()) {
      case SYMBOL_TOKEN.BNB.toLowerCase(): {
        const infoNative = getMapToken(chainId, SYMBOL_NATIVE[chainId]);
        if (!infoNative) throw { error: `Token native ${SYMBOL_NATIVE[chainId]} not supported` };
        addressToken = infoNative.address;
        symbolToken = infoNative.symbol;
        break;
      }
      case SYMBOL_TOKEN.USDT.toLowerCase(): {
        const tokenUSDT = getMapToken(chainId, SYMBOL_TOKEN.USDT);
        if (!tokenUSDT) throw { error: `Token ${SYMBOL_TOKEN.USDT} not supported` };
        addressToken = tokenUSDT.address;
        symbolToken = tokenUSDT.symbol;
        break;
      }
      case SYMBOL_TOKEN.LCR.toLowerCase(): {
        const tokenLCR = getMapToken(chainId, SYMBOL_TOKEN.LCR);
        if (!tokenLCR) throw { error: `Token ${SYMBOL_TOKEN.LCR} not supported` };
        addressToken = tokenLCR.address;
        symbolToken = tokenLCR.symbol;
        break;
      }
    }
    if (!addressToken || !symbolToken) throw { error: 'Asset Not Found!' };

    let walletFrom = null;
    typeWalletFrom = typeWalletFrom.toLowerCase();
    switch (typeWalletFrom) {
      case TYPE_WALLET.dex:
        walletFrom = getWalletByIndexOffChain({ indexWallet: indexWalletFrom });
        break;
      case TYPE_WALLET.source_dex:
        walletFrom = getWalletSourceByIndexOffChain({ indexWallet: indexWalletFrom });
        break;
      case TYPE_WALLET.skim:
        walletFrom = getWalletSkimByIndexOffChain({ indexWallet: indexWalletFrom });
        break;
      case TYPE_WALLET.skim_source:
        walletFrom = getWalletSourceSkimByIndexOffChain({ indexWallet: indexWalletFrom });
        break;
      case TYPE_WALLET.amm:
        walletFrom = getWalletBalanceRateByIndexOffChain({ indexWallet: indexWalletFrom });
        break;
      case TYPE_WALLET.spending_free_coin:
        walletFrom = getWalletSpendingFreeCoinByIndexOffChain({ indexWallet: indexWalletFrom });
        break;
    }
    if (!walletFrom) throw { error: 'Index Wallet From Not Found!' };

    let addressTo = null;
    typeWalletTo = typeWalletTo.toLowerCase();
    switch (typeWalletTo) {
      case TYPE_WALLET.dex: {
        const walletTo = getWalletByIndexOffChain({ indexWallet: indexWalletTo });
        addressTo = walletTo.address;
        break;
      }
      case TYPE_WALLET.source_dex: {
        const walletTo = getWalletSourceByIndexOffChain({ indexWallet: indexWalletTo });
        addressTo = walletTo.address;
        break;
      }
      case TYPE_WALLET.skim: {
        const walletTo = getWalletSkimByIndexOffChain({ indexWallet: indexWalletTo });
        addressTo = walletTo.address;
        break;
      }
      case TYPE_WALLET.skim_source: {
        const walletTo = getWalletSourceSkimByIndexOffChain({ indexWallet: indexWalletTo });
        addressTo = walletTo.address;
        break;
      }
      case TYPE_WALLET.amm: {
        const walletTo = getWalletBalanceRateByIndexOffChain({ indexWallet: indexWalletTo });
        addressTo = walletTo.address;
        break;
      }
      case TYPE_WALLET.spending_free_coin:
        walletFrom = getWalletSpendingFreeCoinByIndexOffChain({ indexWallet: indexWalletFrom });
        break;
      case TYPE_WALLET.spending_paid_coin: {
        addressTo = SPENDING_WALLET_PAID_COIN[chainId] ? SPENDING_WALLET_PAID_COIN[chainId] : null;
        indexWalletTo = 'SPENDING_WALLET_PAID_COIN';
        break;
      }
    }
    if (!addressTo) throw { error: 'Wallet To Not Found!' };

    let objLogs = {
      chain_id: chainId,
      wallet_address_1: walletFrom.address,
      index_wallet_1: indexWalletFrom,
      wallet_address_2: addressTo,
      index_wallet_2: indexWalletTo,
    };

    let txHash = null;
    let gasFee = null;
    if (addressToken.toLowerCase() == ZERO_ADDRESS.toLowerCase()) {
      let native = new Native({ chainId });
      const balanceWei = await native.balanceOf({ address: walletFrom.address });
      if (balanceWei.lte(etherToWei(amount)))
        throw { error: `Insufficient ${SYMBOL_NATIVE[chainId]} Balance To Make Transaction!` };
      let txTransfer = await native.transfer({
        privateKey: walletFrom.privateKey,
        receiver: addressTo,
        amount,
        typeWallet: typeWalletFrom,
      });
      txHash = txTransfer?.data?.txHash;
      gasFee = txTransfer?.data?.gasFee;
      await logs({
        ...objLogs,
        type: NAME_JOB.onChain.transfer_on_chain_native,
        status: true,
        amount,
        token_in: SYMBOL_NATIVE[chainId],
        token_out: SYMBOL_NATIVE[chainId],
        gas_fee: txTransfer?.data?.gasFee,
        tx_hash: txTransfer?.data?.txHash,
        descriptions: `${walletFrom.address}[${indexWalletFrom}] ${NAME_JOB.onChain.transfer_on_chain_native} ${amount} ${symbolToken} to ${addressTo}[${indexWalletTo}]`,
      });
    } else {
      let erc20 = new ERC20({ chainId, token: addressToken });
      const balanceWei = await erc20.balanceOf({ address: walletFrom.address });
      if (balanceWei.lt(etherToWei(amount)))
        throw { error: `Insufficient ${symbolToken} Balance To Make Transaction!` };
      let txTransfer = await erc20.transfer({
        privateKey: walletFrom.privateKey,
        receiver: addressTo,
        amount,
        typeWallet: typeWalletTo,
      });
      txHash = txTransfer?.data?.txHash;
      gasFee = txTransfer?.data?.gasFee;
      await logs({
        ...objLogs,
        type: NAME_JOB.onChain.transfer_on_chain_token,
        status: true,
        amount,
        token_in: symbolToken,
        token_out: symbolToken,
        gas_fee: txTransfer?.data?.gasFee,
        tx_hash: txTransfer?.data?.txHash,
        descriptions: `${walletFrom.address}[${indexWalletFrom}] ${NAME_JOB.onChain.transfer_on_chain_token} ${amount} ${symbolToken} to ${addressTo}[${indexWalletTo}]`,
      });
    }

    return { status: true, txHash, gasFee, error: null };
  } catch (error) {
    console.log(error);
    return { status: false, txHash: null, gasFee: null, error: formatError(error) };
  }
};

export const getHoldingAmountBot = async ({ chainId, index }) => {
  const walletModel = await WalletSkimModel.findOne({ index, chain_id: chainId });
  return walletModel && walletModel.holding_amount ? parseFloat(walletModel.holding_amount) : 0;
};

export const getGasPriceBSC = async () => {
  try {
    const res = await axios.get(
      `https://api.bscscan.com/api?module=gastracker&action=gasoracle&apikey=${API_KEY_SCAN[56]}}`,
    );
    const gasPriceEther = res?.data?.result?.FastGasPrice;
    await ConfigModel.findOneAndUpdate(
      {
        chain_id: 56,
        key: KEY_CONFIG.gas_price,
      },
      { value: parseFloat(gasPriceEther) },
      { new: true, upsert: true },
    );
    // console.log('BSC_GasPrice_Server: ', gasPriceEther);
    return true;
  } catch (error) {
    throw { error: `Get GasPrice BSC: ${formatError(error)}` };
  }
};

export const getGasPriceCELO = async () => {
  try {
    const chain_id = 42220;
    const provider = await getProvider(chain_id);
    const numberBlock = await provider.getBlockNumber();
    const infoBlock = await provider.getBlock(numberBlock);
    const gasPrice = formatUnits(infoBlock.baseFeePerGas, 'gwei');
    console.log(42220, gasPrice);
    await ConfigModel.findOneAndUpdate(
      {
        chain_id,
        key: KEY_CONFIG.gas_price,
      },
      { value: parseFloat(gasPrice) },
      { new: true, upsert: true },
    );
    return true;
  } catch (error) {
    throw { error: `Get GasPrice CELO: ${formatError(error)}` };
  }
};

export const getInfoWallet = async ({ type, index }) => {
  try {
    let infoWallet = null;
    switch (type.toLowerCase()) {
      case TYPE_WALLET.dex:
        infoWallet = getWalletByIndexOffChain({ indexWallet: index });
        break;
      case TYPE_WALLET.source_dex:
        infoWallet = getWalletSourceByIndexOffChain({ indexWallet: index });
        break;
      case TYPE_WALLET.skim:
        infoWallet = getWalletSkimByIndexOffChain({ indexWallet: index });
        break;
      case TYPE_WALLET.skim_source:
        infoWallet = getWalletSourceSkimByIndexOffChain({ indexWallet: index });
        break;
      case TYPE_WALLET.amm:
        infoWallet = getWalletBalanceRateByIndexOffChain({ indexWallet: index });
        break;
    }
    if (!infoWallet) return { status: false, error: 'Not Found Type Wallet!', wallet: null };
    return { status: true, wallet: { address: infoWallet.address, index } };
  } catch (error) {
    return { status: false, error, wallet: null };
  }
};
