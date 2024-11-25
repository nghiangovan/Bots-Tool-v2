import { Contract, Wallet, providers } from 'ethers';
import { ABIS } from '../../configs/ABIs.js';
import { WSS_FAKE_TRANSACTIONS } from '../../configs/RPCs.js';
import { MNEMONIC_ROOT_BALANCE_RATE } from '../../utils/constant.js';
import { NAME_JOB, SYMBOL_TOKEN, TYPE_WALLET } from '../../utils/enum.js';
import { randomFloatBetween, randomOneFromArray } from '../../utils/random.js';
import { getWalletBalanceRateMaxBalances, tradeOurDex } from '../handlers/common.js';
import { deployments } from '../handlers/functions.js';
import { logs } from '../models/Log.js';
import { getProvider } from '../../utils/blockchain.js';
import { formatFloorNumber } from '../../utils/format.js';

export const scanLogsAndFakeTransactions = async ({ chainId }) => {
  try {
    const addressPairLCR_USDT = deployments[chainId?.toString()].LCRPair[0];

    const providerWS = new providers.WebSocketProvider(WSS_FAKE_TRANSACTIONS[chainId].rpc);
    const instancePair = new Contract(addressPairLCR_USDT, ABIS.BLCRPair, providerWS);

    const minusBlocks = -600; // Each block time ~ 3s -> 600 blocks = 30 minutes

    let eventsMint = await instancePair.queryFilter(instancePair.filters.Mint(), minusBlocks, 'latest');
    let eventsBurn = await instancePair.queryFilter(instancePair.filters.Burn(), minusBlocks, 'latest');
    let eventsSwap = await instancePair.queryFilter(instancePair.filters.Swap(), minusBlocks, 'latest');

    const totalTransactions = eventsMint.length + eventsBurn.length + eventsSwap.length;

    if (totalTransactions <= 0) {
      let amountInEther = randomFloatBetween(5, 10);
      amountInEther = formatFloorNumber(amountInEther);
      const type = randomOneFromArray([
        NAME_JOB.fake_transactions.fake_transaction_buy,
        NAME_JOB.fake_transactions.fake_transaction_sell,
      ]); // buy - sell LCR
      let wallet = null;
      let symbolTokenIn = null;
      let symbolTokenOut = null;
      let index = null;
      if (type == NAME_JOB.fake_transactions.fake_transaction_buy) {
        symbolTokenIn = SYMBOL_TOKEN.USDT;
        symbolTokenOut = SYMBOL_TOKEN.LCR;
        const [indexWalletBalanceRate] = await getWalletBalanceRateMaxBalances({
          chainId,
          listSymbolAssets: [SYMBOL_TOKEN.USDT],
        });
        index = indexWalletBalanceRate.index;
        const walletOffchain = Wallet.fromMnemonic(
          MNEMONIC_ROOT_BALANCE_RATE,
          `m/44'/60'/0'/0/${indexWalletBalanceRate.index}`,
        );
        const provider = await getProvider(chainId);
        wallet = walletOffchain.connect(provider);
      } else {
        symbolTokenIn = SYMBOL_TOKEN.LCR;
        symbolTokenOut = SYMBOL_TOKEN.USDT;
        const [indexWalletBalanceRate] = await getWalletBalanceRateMaxBalances({
          chainId,
          listSymbolAssets: [SYMBOL_TOKEN.LCR],
        });
        index = indexWalletBalanceRate.index;
        const walletOffchain = Wallet.fromMnemonic(
          MNEMONIC_ROOT_BALANCE_RATE,
          `m/44'/60'/0'/0/${indexWalletBalanceRate.index}`,
        );
        wallet = walletOffchain.connect(providerWS);
      }

      const result = await tradeOurDex({
        chainId,
        wallet,
        symbolTokenIn,
        symbolTokenOut,
        amountInEther,
        typeWallet: TYPE_WALLET.balance_rate,
        slippage: 1,
      });

      await logs({
        chain_id: chainId,
        type,
        status: true,
        wallet_address_1: result?.data?.sender,
        wallet_address_2: result?.data?.sender,
        index_wallet_1: index,
        index_wallet_2: index,
        amount: amountInEther,
        token_in: symbolTokenIn,
        token_out: symbolTokenOut,
        amount_fee: 0,
        gas_fee: result?.data?.gasFee,
        tx_hash: result?.data?.txHash,
        descriptions: `${result?.data?.sender}[${index}] ${type} ${amountInEther} ${symbolTokenIn} to ${result?.data?.amountOut} ${symbolTokenOut}`,
      });
    }
    return {
      status: true,
      error: null,
    };
  } catch (error) {
    console.log(error);
    return {
      status: false,
      error,
    };
  }
};

// scanLogsAndFakeTransactions({ chainId: 56 });
