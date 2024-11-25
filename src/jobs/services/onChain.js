import Native from '../../../modules/wallet/transfer/Native.js';
import { NAME_JOB, SYMBOL_NATIVE, TYPE_WALLET } from '../../../utils/enum.js';
import { formatError } from '../../../utils/format.js';
import {
  awaitTransaction,
  checkDuplicateOrRunAgainJob,
  checkJobErrorAmount,
  checkJobFailedInsufficient,
  depositTokenUttByAdminToken,
  getCurrentIndexWalletSource,
  getWalletByIndex,
  getWalletSourceByIndex,
  tradeNativeToTokenPancake,
  tradeTokenToNativePancke,
  tradeTokenToTokenOurDex,
  tradeTokenToTokenPancke,
  transferNative,
  transferOnChainTokens,
} from '../../handlers/common.js';
import { maxNumberDecimal } from '../../handlers/functions.js';
import { logs } from '../../models/Log.js';
import { rescheduleFailedJob, scheduleNextJob } from './index.js';
export const transferOnChainToken = async ({
  chainId,
  symbolToken,
  indexWalletSender,
  indexWalletReceiver,
  amount,
  typeWallet,
}) => {
  const walletSender = await getWalletByIndex({ chainId, indexWallet: indexWalletSender });
  const walletReceiver = await getWalletByIndex({ chainId, indexWallet: indexWalletReceiver });
  try {
    let txTransfer = await transferOnChainTokens({
      chainId,
      symbolToken,
      walletSender,
      to: walletReceiver.address,
      amount,
      typeWallet,
    });
    return {
      status: true,
      result: txTransfer,
      error: null,
      addressSender: walletSender.address,
      addressReceiver: walletReceiver.address,
    };
  } catch (error) {
    console.log(error);
    return {
      status: false,
      result: null,
      error,
      addressSender: walletSender.address,
      addressReceiver: walletReceiver.address,
    };
  }
};

export const transferOnChainTokenFromSource = async ({
  chainId,
  symbolToken,
  indexWalletReceiver,
  amount,
  typeWallet,
}) => {
  const indexSourceWallet = await getCurrentIndexWalletSource({ chainId });
  const walletSender = await getWalletSourceByIndex({ chainId, indexWallet: indexSourceWallet });
  const walletReceiver = await getWalletByIndex({ chainId, indexWallet: indexWalletReceiver });
  try {
    let txTransfer = await transferOnChainTokens({
      chainId,
      symbolToken,
      walletSender,
      to: walletReceiver.address,
      amount,
      typeWallet,
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

export const transferOnChainNative = async ({
  chainId,
  indexWalletSender,
  indexWalletReceiver,
  amount,
  typeWallet,
}) => {
  const walletSender = await getWalletByIndex({ chainId, indexWallet: indexWalletSender });
  const walletReceiver = await getWalletByIndex({ chainId, indexWallet: indexWalletReceiver });
  try {
    let txTransfer = await transferNative({ chainId, walletSender, to: walletReceiver.address, amount, typeWallet });
    return {
      status: true,
      result: txTransfer,
      error: null,
      addressSender: walletSender.address,
      addressReceiver: walletReceiver.address,
    };
  } catch (error) {
    console.log(error);
    return {
      status: false,
      result: null,
      error,
      addressSender: walletSender.address,
      addressReceiver: walletReceiver.address,
    };
  }
};

export const transferOnChainNativeFromSource = async ({ chainId, indexWalletReceiver, amount, typeWallet }) => {
  const native = new Native({ chainId });
  const walletReceiver = await getWalletByIndex({ chainId, indexWallet: indexWalletReceiver });
  const indexSourceWallet = await getCurrentIndexWalletSource({ chainId });
  const walletSender = await getWalletSourceByIndex({ chainId, indexWallet: indexSourceWallet });

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

export const depositTokenUttToSpendingByAdminToken = async ({
  chainId,
  symbolToken,
  indexWalletSender,
  amount,
  typeWallet,
}) => {
  const walletSender = await getWalletByIndex({ chainId, indexWallet: indexWalletSender });
  try {
    let txDeposit = await depositTokenUttByAdminToken({
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

export const swapTokenToTokenOurDex = async ({
  chainId,
  symbolTokenIn,
  symbolTokenOut,
  indexWalletSender,
  amount,
  typeWallet,
  isFreeCoin = false,
}) => {
  const walletSender = await getWalletByIndex({ chainId, indexWallet: indexWalletSender });
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

export const swapNativeToTokenPancke = async ({ chainId, symbolTokenOut, indexWalletSender, amount, typeWallet }) => {
  const walletSender = await getWalletByIndex({ chainId, indexWallet: indexWalletSender });
  try {
    let txSwap = await tradeNativeToTokenPancake({ wallet: walletSender, chainId, symbolTokenOut, amount, typeWallet });
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

export const swapTokenToNativePancke = async ({ chainId, indexWalletSender, symbolTokenIn, amount, typeWallet }) => {
  const walletSender = await getWalletByIndex({ chainId, indexWallet: indexWalletSender });
  try {
    let txSwap = await tradeTokenToNativePancke({
      chainId,
      wallet: walletSender,
      symbolTokenIn,
      amountInEther: amount,
      typeWallet,
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

export const swapTokenToTokenPancke = async ({
  chainId,
  indexWalletSender,
  symbolTokenIn,
  symbolTokenOut,
  amount,
  typeWallet,
}) => {
  const walletSender = await getWalletByIndex({ chainId, indexWallet: indexWalletSender });
  try {
    let txSwap = await tradeTokenToTokenPancke({
      chainId,
      wallet: walletSender,
      symbolTokenIn,
      symbolTokenOut,
      amountInEther: amount,
      typeWallet,
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

export const commonProcessOnChain = async ({ queue, job, done }) => {
  if (job.attrs.shouldSaveResult) return await done();
  const isDuplicate = await checkDuplicateOrRunAgainJob({ job });
  if (isDuplicate) return await done();
  const isErrorAmount = await checkJobErrorAmount({ queue, job });
  if (isErrorAmount) return await done();
  const isAlreadyOnChain = await checkJobFailedInsufficient({ job });
  if (isAlreadyOnChain) return await done();

  const {
    chain_id,
    date,
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
    case NAME_JOB.onChain.transfer_native_from_source:
      respone = await transferOnChainNativeFromSource({
        chainId: chain_id,
        indexWalletReceiver: index_wallet_out,
        amount,
        typeWallet: TYPE_WALLET.dex,
      });

      type = NAME_JOB.onChain.transfer_native_from_source;
      index_wallet_1 = respone.index_wallet_1;
      index_wallet_2 = index_wallet_out;
      token_in = SYMBOL_NATIVE[chain_id];
      token_out = SYMBOL_NATIVE[chain_id];
      amount_fee = 0;
      descriptions = `${respone.addressSender}[0] ${job.attrs.name} ${amount} ${SYMBOL_NATIVE[chain_id]} to ${respone.addressReceiver}[${index_wallet_out}]`;
      break;

    case NAME_JOB.onChain.transfer_token_from_source:
      respone = await transferOnChainTokenFromSource({
        chainId: chain_id,
        symbolToken: symbol_token_in,
        indexWalletReceiver: index_wallet_out,
        amount,
        typeWallet: TYPE_WALLET.dex,
      });

      type = NAME_JOB.onChain.transfer_token_from_source;
      index_wallet_1 = respone.index_wallet_1;
      index_wallet_2 = index_wallet_out;
      token_in = symbol_token_in;
      token_out = symbol_token_out;
      amount_fee = 0;
      descriptions = `${respone.addressSender}[0] ${job.attrs.name} ${amount} ${symbol_token_in} to ${respone.addressReceiver}[${index_wallet_out}]`;
      break;

    case NAME_JOB.onChain.transfer_on_chain_native:
      respone = await transferOnChainNative({
        chainId: chain_id,
        indexWalletSender: index_wallet_in,
        indexWalletReceiver: index_wallet_out,
        amount,
        typeWallet: TYPE_WALLET.dex,
      });

      type = NAME_JOB.onChain.transfer_on_chain_native;
      index_wallet_1 = index_wallet_in;
      index_wallet_2 = index_wallet_out;
      token_in = symbol_token_in;
      token_out = symbol_token_out;
      amount_fee = 0;
      descriptions = `${respone.addressSender}[${index_wallet_in}] ${job.attrs.name} ${amount} ${symbol_token_in} to ${respone.addressReceiver}[${index_wallet_out}]`;
      break;

    case NAME_JOB.onChain.transfer_on_chain_token:
      respone = await transferOnChainToken({
        chainId: chain_id,
        symbolToken: symbol_token_in,
        indexWalletSender: index_wallet_in,
        indexWalletReceiver: index_wallet_out,
        amount,
        typeWallet: TYPE_WALLET.dex,
      });

      type = NAME_JOB.onChain.transfer_on_chain_token;
      index_wallet_1 = index_wallet_in;
      index_wallet_2 = index_wallet_out;
      token_in = symbol_token_in;
      token_out = symbol_token_out;
      amount_fee = 0;
      descriptions = `${respone.addressSender}[${index_wallet_in}] ${job.attrs.name} ${amount} ${symbol_token_in} to ${respone.addressReceiver}[${index_wallet_out}]`;
      break;

    case NAME_JOB.onChain.deposit_token_utt_to_spending:
      respone = await depositTokenUttToSpendingByAdminToken({
        chainId: chain_id,
        symbolToken: symbol_token_in,
        indexWalletSender: index_wallet_in,
        amount,
        typeWallet: TYPE_WALLET.dex,
      });

      type = NAME_JOB.onChain.deposit_token_utt_to_spending;
      index_wallet_1 = index_wallet_in;
      token_in = symbol_token_in;
      token_out = symbol_token_out;
      amount_fee = 0;
      descriptions = `${respone.addressSender}[${index_wallet_in}] ${job.attrs.name} ${amount} ${symbol_token_in} to spending wallet`;
      break;

    case NAME_JOB.onChain.swap_native_to_token_pancake:
      respone = await swapNativeToTokenPancke({
        chainId: chain_id,
        symbolTokenOut: symbol_token_out,
        indexWalletSender: index_wallet_in,
        amount,
        typeWallet: TYPE_WALLET.dex,
      });

      type = NAME_JOB.onChain.swap_native_to_token_pancake;
      index_wallet_1 = index_wallet_in;
      index_wallet_2 = index_wallet_in;
      token_in = SYMBOL_NATIVE[chain_id];
      token_out = symbol_token_out;
      amount_fee = 0;
      descriptions = `${respone.addressSender}[${index_wallet_in}] ${job.attrs.name} ${amount} ${SYMBOL_NATIVE[chain_id]} to ${respone?.result?.data?.amountOut} ${symbol_token_out}`;
      break;

    case NAME_JOB.onChain.swap_token_to_native_pancake:
      respone = await swapTokenToNativePancke({
        chainId: chain_id,
        indexWalletSender: index_wallet_in,
        symbolTokenIn: symbol_token_in,
        amount,
        typeWallet: TYPE_WALLET.dex,
      });

      type = NAME_JOB.onChain.swap_token_to_native_pancake;
      index_wallet_1 = index_wallet_in;
      index_wallet_2 = index_wallet_in;
      token_in = symbol_token_in;
      token_out = SYMBOL_NATIVE[chain_id];
      amount_fee = 0;
      descriptions = `${respone.addressSender}[${index_wallet_in}] ${job.attrs.name} ${amount} ${symbol_token_in} to ${respone?.result?.data?.amountOut} ${SYMBOL_NATIVE[chain_id]}`;
      break;

    case NAME_JOB.onChain.swap_token_to_token_pancake:
      respone = await swapTokenToTokenPancke({
        chainId: chain_id,
        indexWalletSender: index_wallet_in,
        symbolTokenIn: symbol_token_in,
        symbolTokenOut: symbol_token_out,
        amount,
        typeWallet: TYPE_WALLET.dex,
      });

      type = NAME_JOB.onChain.swap_token_to_token_pancake;
      index_wallet_1 = index_wallet_in;
      index_wallet_2 = index_wallet_in;
      token_in = symbol_token_in;
      token_out = symbol_token_out;
      amount_fee = 0;
      descriptions = `${respone.addressSender}[${index_wallet_in}] ${job.attrs.name} ${amount} ${symbol_token_in} to ${respone?.result?.data?.amountOut} ${symbol_token_out}`;
      break;

    case NAME_JOB.onChain.swap_token_to_token_our_dex:
      respone = await swapTokenToTokenOurDex({
        chainId: chain_id,
        symbolTokenIn: symbol_token_in,
        symbolTokenOut: symbol_token_out,
        indexWalletSender: index_wallet_in,
        typeWallet: TYPE_WALLET.dex,
        amount,
      });

      type = NAME_JOB.onChain.swap_token_to_token_our_dex;
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
    await scheduleNextJob({ job, amountOut: result?.data?.amountOut });
  } else {
    job.fail(formatError(error));
    await job.save();
    await rescheduleFailedJob({ job, error: formatError(error) });
  }

  await logs({
    chain_id,
    date,
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
