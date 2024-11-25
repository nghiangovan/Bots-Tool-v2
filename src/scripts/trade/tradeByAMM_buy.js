/* eslint-disable no-undef */
import { connectMongoDB } from '../../../database/conection.js';
import { SYMBOL_TOKEN, TYPE_WALLET } from '../../../utils/enum.js';
import { getWalletBalanceRateByIndex, tradeOurDex } from '../../handlers/common.js';

const main = async () => {
  connectMongoDB();
  const chainId = 56;
  const wallet = await getWalletBalanceRateByIndex({ chainId, indexWallet: 0 });
  // Buy LCR
  let result = await tradeOurDex({
    chainId,
    wallet,
    symbolTokenIn: SYMBOL_TOKEN.USDT,
    symbolTokenOut: SYMBOL_TOKEN.LCR,
    amountInEther: 100,
    typeWallet: TYPE_WALLET.balance_rate,
    slippage: 0.5,
  });
  console.log(result);
  console.log('done');
  return process.exit(0);
};
main();
