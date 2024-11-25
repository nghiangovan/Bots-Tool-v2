/* eslint-disable no-undef */
import { connectMongoDB } from '../../../database/conection.js';
import { SYMBOL_TOKEN, TYPE_WALLET } from '../../../utils/enum.js';
import { getWalletSpendingFreeCoinByIndex, tradeOurDex } from '../../handlers/common.js';

const main = async ({ chainId }) => {
  connectMongoDB();
  const wallet = await getWalletSpendingFreeCoinByIndex({ chainId, indexWallet: 0 });
  // Buy LCR
  let result = await tradeOurDex({
    chainId,
    wallet,
    symbolTokenIn: SYMBOL_TOKEN.CELO,
    symbolTokenOut: SYMBOL_TOKEN.LCR,
    amountInEther: 200,
    slippage: 0.5,
    typeWallet: TYPE_WALLET.spending_free_coin,
    isFreeCoin: true,
  });
  console.log(result);
  console.log('done');
  return process.exit(0);
};
main({ chainId: 42220 });
