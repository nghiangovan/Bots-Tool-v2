import { getSymbolNative, MAX_VALUE, ZERO_ADDRESS } from '../../../configs/addresses.js';
import {
  awaitTransaction,
  buffNativeHaveCheckMinBalance,
  getBuffGasLimit,
  getGasPriceDynamic,
  saveBalanceRecent,
} from '../../../src/handlers/common.js';
import { decodeAmountOutTransactionSwap } from '../../../src/handlers/functions.js';
import { createInstanceAddress } from '../../../utils/blockchain.js';
import { SYMBOL_ABI } from '../../../utils/enum.js';
import { etherToWei, etherToWeiUnit, weiToEther, weiToEtherUnit } from '../../../utils/format.js';
import { timestampNow } from '../../../utils/time.js';

export async function swapNativeToToken({
  symbolDex,
  chainId,
  wallet,
  router,
  factory,
  tokenIn,
  tokenOut,
  amountIn,
  typeWallet,
  slippage,
  provider,
}) {
  // Check if pair swap exists
  let addressPair = await factory.getPair(tokenIn, tokenOut);
  if (addressPair.toLowerCase() === ZERO_ADDRESS)
    throw {
      error: `Swap ${symbolDex} Error: Pair in chainId ${chainId} does not exist [${tokenIn},${tokenOut}]`,
    };

  // Get symbol token out
  let instancetokenOut = await createInstanceAddress(chainId, SYMBOL_ABI.ERC20, tokenOut);
  let symbolTokenOut = await instancetokenOut.symbol();
  let decimalTokenOut = await instancetokenOut.decimals();

  // Excute swap from native token to token
  let path = [tokenIn, tokenOut];
  let deadline = timestampNow() + 10000;
  let amountWeiNativeIn = etherToWei(amountIn);
  let amountsOut = await router.getAmountsOut(amountWeiNativeIn, path);

  let amountOutMinEther = weiToEtherUnit(amountsOut[amountsOut.length - 1], decimalTokenOut);

  let amountEtherSlippage = (parseFloat(amountOutMinEther) * ((100 - slippage) / 100)).toFixed(decimalTokenOut);

  let amountOutMinWei = etherToWeiUnit(amountEtherSlippage?.toString(), decimalTokenOut);

  await buffNativeHaveCheckMinBalance({ chainId, wallet, amountNativeNeedSend: amountIn });

  let gasLimit = await router.estimateGas.swapExactETHForTokens(amountOutMinWei, path, wallet.address, deadline, {
    value: amountWeiNativeIn,
  });

  const buffGasLimit = await getBuffGasLimit({ chainId });
  gasLimit = gasLimit.add(buffGasLimit);

  const gasPrice = await getGasPriceDynamic({ chainId, provider });

  let txSwap = await router.swapExactETHForTokens(amountOutMinWei, path, wallet.address, deadline, {
    value: amountWeiNativeIn,
    gasLimit,
    gasPrice,
  });

  await txSwap.wait(1);

  const gasFee = await awaitTransaction({ chainId, txHash: txSwap.hash });
  await saveBalanceRecent({ chainId, addressWallet: wallet.address, typeWallet });

  const receipt = await provider.getTransactionReceipt(txSwap.hash);
  const amountOutWei = await decodeAmountOutTransactionSwap({ receipt });
  const amountOutEther = weiToEtherUnit(amountOutWei, decimalTokenOut);

  return {
    status: true,
    data: {
      symbolDex,
      chainId,
      symbolTokenIn: getSymbolNative(chainId),
      symbolTokenOut,
      amountIn,
      amountOut: amountOutEther,
      amountsOut,
      sender: wallet.address,
      txHash: txSwap.hash,
      gasFee,
    },
  };
}

export async function swapTokenToNative({
  symbolDex,
  chainId,
  wallet,
  router,
  factory,
  tokenIn,
  tokenOut,
  amountIn,
  typeWallet,
  slippage,
  provider,
}) {
  // Check if pair swap exists
  let addressPair = await factory.getPair(tokenIn, tokenOut);
  if (addressPair.toLowerCase() === ZERO_ADDRESS)
    throw {
      error: `Swap ${symbolDex} Error: Pair in chainId ${chainId} does not exist [${tokenIn},${tokenOut}]`,
    };

  const gasPrice = await getGasPriceDynamic({ chainId, provider });

  // Get symbol token in
  let instancetokenIn = await createInstanceAddress(chainId, SYMBOL_ABI.ERC20, tokenIn);
  let symbolTokenIn = await instancetokenIn.symbol();
  let decimalTokenIn = await instancetokenIn.decimals();

  // Check and approve max tokenIn for router
  let allowance = await instancetokenIn.allowance(wallet.address, router.address);

  if (allowance <= 0) {
    await buffNativeHaveCheckMinBalance({ chainId, wallet, amountNativeNeedSend: 0 });
    const instancetokenInConnectedSigner = instancetokenIn.connect(wallet);

    let txApproveMax = await instancetokenInConnectedSigner.approve(router.address, MAX_VALUE, { gasPrice });
    await txApproveMax.wait(1);
    await saveBalanceRecent({ chainId, addressWallet: wallet.address, typeWallet });
  }

  // Excute swap from token to native token
  let routerConnectedSigner = router.connect(wallet);
  let path = [tokenIn, tokenOut];
  let deadline = timestampNow() + 10000;
  let amountWeiIn = etherToWeiUnit(amountIn, decimalTokenIn);
  let amountsOut = await router.getAmountsOut(amountWeiIn, path);

  let amountOutMinEther = weiToEther(amountsOut[amountsOut.length - 1]);

  let amountEtherSlippage = (parseFloat(amountOutMinEther) * ((100 - slippage) / 100)).toFixed(18);

  let amountOutMinWei = etherToWei(amountEtherSlippage);

  await buffNativeHaveCheckMinBalance({ chainId, wallet, amountNativeNeedSend: 0 });

  let gasLimit = await router.estimateGas.swapExactTokensForETH(
    amountWeiIn,
    amountOutMinWei,
    path,
    wallet.address,
    deadline,
  );

  const buffGasLimit = await getBuffGasLimit({ chainId });
  gasLimit = gasLimit.add(buffGasLimit);

  let txSwap = await routerConnectedSigner.swapExactTokensForETH(
    amountWeiIn,
    amountOutMinWei,
    path,
    wallet.address,
    deadline,
    { gasLimit: gasLimit, gasPrice },
  );

  await txSwap.wait(1);

  const gasFee = await awaitTransaction({ chainId, txHash: txSwap.hash });
  await saveBalanceRecent({ chainId, addressWallet: wallet.address, typeWallet });

  const receipt = await provider.getTransactionReceipt(txSwap.hash);
  const amountOutWei = await decodeAmountOutTransactionSwap({ receipt });
  const amountOutEther = weiToEther(amountOutWei);

  return {
    status: true,
    data: {
      symbolDex,
      chainId,
      symbolTokenIn,
      symbolTokenOut: getSymbolNative(chainId),
      amountIn,
      amountOut: amountOutEther,
      amountsOut,
      sender: wallet.address,
      txHash: txSwap.hash,
      gasFee,
    },
  };
}

export async function swapTokenToToken({
  symbolDex,
  chainId,
  wallet,
  router,
  factory,
  tokenIn,
  tokenOut,
  amountIn,
  typeWallet,
  slippage,
  provider,
}) {
  // Check if pair swap exists
  let addressPair = await factory.getPair(tokenIn, tokenOut);
  if (addressPair.toLowerCase() === ZERO_ADDRESS)
    throw {
      error: `Swap ${symbolDex} Error: Pair in chainId ${chainId} does not exist [${tokenIn},${tokenOut}]`,
    };

  const gasPrice = await getGasPriceDynamic({ chainId, provider });

  // Get symbol token in
  let instancetokenIn = await createInstanceAddress(chainId, SYMBOL_ABI.ERC20, tokenIn);
  let symbolTokenIn = await instancetokenIn.symbol();
  let decimalTokenIn = await instancetokenIn.decimals();

  // Get symbol token out
  let instancetokenOut = await createInstanceAddress(chainId, SYMBOL_ABI.ERC20, tokenOut);
  let symbolTokenOut = await instancetokenOut.symbol();
  let decimalTokenOut = await instancetokenOut.decimals();

  // Check and approve max tokenIn for router
  let allowance = await instancetokenIn.allowance(wallet.address, router.address);
  if (allowance <= 0) {
    await buffNativeHaveCheckMinBalance({ chainId, wallet, amountNativeNeedSend: 0 });

    const instancetokenInConnectedSigner = instancetokenIn.connect(wallet);

    let txApproveMax = await instancetokenInConnectedSigner.approve(router.address, MAX_VALUE, { gasPrice });
    await txApproveMax.wait(1);
    await saveBalanceRecent({ chainId, addressWallet: wallet.address, typeWallet });
  }

  // Excute swap from token to token
  let routerConnectedSigner = router.connect(wallet);
  let path = [tokenIn, tokenOut];
  let deadline = timestampNow() + 10000;
  let amountWeiIn = etherToWeiUnit(amountIn, decimalTokenIn);
  let amountsOut = await router.getAmountsOut(amountWeiIn, path);

  let amountOutMinEther = weiToEtherUnit(amountsOut[amountsOut.length - 1], decimalTokenOut);

  let amountEtherSlippage = (parseFloat(amountOutMinEther) * ((100 - slippage) / 100)).toFixed(decimalTokenOut);

  let amountOutMinWei = etherToWeiUnit(amountEtherSlippage, decimalTokenOut);

  await buffNativeHaveCheckMinBalance({ chainId, wallet, amountNativeNeedSend: 0 });

  let gasLimit = await router.estimateGas.swapExactTokensForTokens(
    amountWeiIn,
    amountOutMinWei,
    path,
    wallet.address,
    deadline,
  );

  const buffGasLimit = await getBuffGasLimit({ chainId });
  gasLimit = gasLimit.add(buffGasLimit);

  let txSwap = await routerConnectedSigner.swapExactTokensForTokens(
    amountWeiIn,
    amountOutMinWei,
    path,
    wallet.address,
    deadline,
    { gasLimit: gasLimit, gasPrice },
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
      symbolDex,
      chainId,
      symbolTokenIn,
      symbolTokenOut,
      amountIn,
      amountOut: amountOutEther,
      amountsOut,
      sender: wallet.address,
      txHash: txSwap.hash,
      gasFee,
    },
  };
}
