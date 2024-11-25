/* eslint-disable no-undef */
import { connectMongoDB } from '../../../database/conection.js';
import { SYMBOL_TOKEN, TYPE_WALLET } from '../../../utils/enum.js';
import { getWalletSpendingFreeCoinByIndex, tradeOurDex } from '../../handlers/common.js';

const main = async () => {
  connectMongoDB();
  const chainId = 56;
  const wallet = await getWalletSpendingFreeCoinByIndex({ chainId, indexWallet: 0 });
  // Sell LCR
  let result = await tradeOurDex({
    chainId: 56,
    wallet,
    symbolTokenIn: SYMBOL_TOKEN.LCR,
    symbolTokenOut: SYMBOL_TOKEN.USDT,
    amountInEther: 50,
    typeWallet: TYPE_WALLET.balance_rate,
    slippage: 0.5,
  });
  console.log(result);
  console.log('done');
  return process.exit(0);
};
main();
