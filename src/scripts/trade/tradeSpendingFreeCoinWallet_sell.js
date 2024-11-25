/* eslint-disable no-undef */
import { connectMongoDB } from '../../../database/conection.js';
import { SYMBOL_TOKEN, TYPE_WALLET } from '../../../utils/enum.js';
import { getWalletSpendingFreeCoinByIndex, tradeOurDex } from '../../handlers/common.js';

const main = async ({ chainId }) => {
  connectMongoDB();
  const wallet = await getWalletSpendingFreeCoinByIndex({ chainId, indexWallet: 0 });
  // Sell LCR
  let result = await tradeOurDex({
    chainId: 42220,
    wallet,
    symbolTokenIn: SYMBOL_TOKEN.LCR,
    symbolTokenOut: SYMBOL_TOKEN.CELO,
    amountInEther: 50,
    slippage: 0.5,
    typeWallet: TYPE_WALLET.spending_free_coin,
    isFreeCoin: true,
  });
  console.log(result);
  console.log('done');
  return process.exit(0);
};
main({ chainId: 42220 });
