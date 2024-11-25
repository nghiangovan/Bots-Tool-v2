/* eslint-disable no-undef */
import { connectMongoDB } from '../../../database/conection.js';
import { SYMBOL_TOKEN, TYPE_WALLET } from '../../../utils/enum.js';
import { getWalletByIndex, tradeOurDex } from '../../handlers/common.js';

const main = async () => {
  connectMongoDB();
  const chainId = 56;
  const wallet = await getWalletByIndex({ chainId, indexWallet: 15205 });
  // Buy LCR
  let result = await tradeOurDex({
    chainId,
    wallet,
    symbolTokenIn: SYMBOL_TOKEN.USDT,
    symbolTokenOut: SYMBOL_TOKEN.LCR,
    amountInEther: 51.9,
    typeWallet: TYPE_WALLET.dex,
    slippage: 0.5,
  });
  console.log(result);
  console.log('done');
  return process.exit(0);
};
main();
