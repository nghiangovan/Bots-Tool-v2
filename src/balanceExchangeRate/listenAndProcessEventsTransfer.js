import { Contract, Wallet, providers } from 'ethers';
import { ABIS } from '../../configs/ABIs.js';
import { WSS_RATE_BALANCER } from '../../configs/RPCs.js';
import { getMapToken } from '../../configs/addresses.js';
import { connectMongoDB } from '../../database/conection.js';
import { getProvider } from '../../utils/blockchain.js';
import { MNEMONIC_ROOT_BALANCE_RATE, SLACK_KEN, SLACK_NOLAN } from '../../utils/constant.js';
import { KEY_CONFIG, NAME_JOB, SYMBOL_NATIVE, SYMBOL_TOKEN, TYPE_WALLET } from '../../utils/enum.js';
import { etherToWei, formatError, formatFloorNumber, weiToEther } from '../../utils/format.js';
import { randomFloatBetween, randomIntBetween } from '../../utils/random.js';
import { sendNotiBackendTeam } from '../../utils/utils.js';
import { getWalletBalanceRateMaxBalances, tradeOurDex } from '../handlers/common.js';
import { deployments, maxNumberDecimal } from '../handlers/functions.js';
import ConfigModel from '../models/Config.js';
import { logs } from '../models/Log.js';
import { LOWER_BOUND_PRICE_LCR, UPPER_BOUND_PRICE_LCR, getMaxAmount } from './configBalanceRate.js';

const EXPECTED_PONG_BACK = 15000;
const KEEP_ALIVE_CHECK_INTERVAL = 900000;

export const listenAndProcessEventsTransfer = async ({ chainId }) => {
  connectMongoDB();
  try {
    let configBalanceRate = await ConfigModel.findOne({ chain_id: chainId, key: KEY_CONFIG.balance_rate });
    if (!configBalanceRate) {
      let newConfig = new ConfigModel({
        chain_id: chainId,
        key: KEY_CONFIG.balance_rate,
        value: JSON.stringify({
          lower_bound: LOWER_BOUND_PRICE_LCR,
          upper_bound: UPPER_BOUND_PRICE_LCR,
          enable_process: true,
        }),
      });
      configBalanceRate = await newConfig.save();
    }

    const tokenLCR = getMapToken(chainId, SYMBOL_TOKEN.LCR);
    if (!tokenLCR) throw { error: `Token ${SYMBOL_TOKEN.LCR} not supported` };
    const addressLCR = tokenLCR.address;

    const tokenUSDT = getMapToken(chainId, SYMBOL_TOKEN.USDT);
    if (!tokenUSDT) throw { error: `Token ${SYMBOL_TOKEN.LCR} not supported` };
    const addressUSDT = tokenUSDT.address;

    const addressPairLCR_USDT = deployments[chainId?.toString()].LCRPair[0];

    const provider = new providers.WebSocketProvider(WSS_RATE_BALANCER[chainId].rpc);

    // // ------------------------ Solution 1 for reconnect socket --------------------
    // provider._websocket.on('close', async code => {
    //   console.log('ws closed', code);
    //   provider._websocket.terminate();
    //   await sleep(3000); // wait before reconnect
    //   listenAndProcessEventsTransfer({ chainId });
    // });
    // // -------------------------------- End solution 1 -----------------------------

    // // ----------------------- Solution 2 for reconnect socket----------------------
    let pingTimeout = null;
    let keepAliveInterval = null;
    provider._websocket.on('open', () => {
      console.log(' Connected socket \n');
      keepAliveInterval = setInterval(() => {
        console.log(' Checking if the connection is alive, sending a ping...');
        provider._websocket.ping();
        // Use WebSocket#terminate(), which immediately destroys the connection,
        // instead of WebSocket#close(), which waits for the close timer.
        // Delay should be equal to the interval at which your server
        // sends out pings plus a conservative assumption of the latency.
        pingTimeout = setTimeout(() => {
          provider._websocket.terminate();
        }, EXPECTED_PONG_BACK);
      }, KEEP_ALIVE_CHECK_INTERVAL);
    });

    provider._websocket.on('close', () => {
      console.error(' The websocket connection was closed!');
      clearInterval(keepAliveInterval);
      clearTimeout(pingTimeout);
      listenAndProcessEventsTransfer({ chainId });
    });

    provider._websocket.on('pong', () => {
      console.log(' Received pong, so connection is alive, clearing the timeout!');
      clearInterval(pingTimeout);
    });
    // ------------------------------ End solution 2 ----------------------------------

    const LCR = new Contract(addressLCR, ABIS.ERC20, provider);

    const filterFromPairLCR_USDT = LCR.filters.Transfer(addressPairLCR_USDT);
    const filterToPairLCR_USDT = LCR.filters.Transfer(null, addressPairLCR_USDT);

    let firstTime = false;
    console.log(`================ start listen ================\n`);
    LCR.on(filterFromPairLCR_USDT, async (from, to, amount) => {
      console.log('\n');
      console.log('+~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~+');
      console.log('|                 Detected Transfer From Pair (OUT or BUY)                    |');
      console.log('+~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~+');
      console.log(` from  : ${from}`);
      console.log(` to    : ${to}`);
      console.log(` amount: ${amount} wei - ${weiToEther(amount)} LCR`);
      if (parseFloat(weiToEther(amount)) > 0) await processCheckAndBalanceRate({ chainId, addressLCR, addressUSDT });
    });
    LCR.on(filterToPairLCR_USDT, async (from, to, amount) => {
      console.log('\n');
      console.log('+~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~+');
      console.log('|                   Detected Transfer To Pair (IN or SELL)                    |');
      console.log('+~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~+');
      console.log(` from  : ${from}`);
      console.log(` to    : ${to}`);
      console.log(` amount: ${amount} wei - ${weiToEther(amount)} LCR`);
      if (parseFloat(weiToEther(amount)) > 0) await processCheckAndBalanceRate({ chainId, addressLCR, addressUSDT });
    });
    if (!firstTime) {
      await processCheckAndBalanceRate({ chainId, addressLCR, addressUSDT });
      firstTime = true;
    }
  } catch (error) {
    console.log(error);
    await sendNotiBackendTeam(`[BOT_TOOL]: ${SLACK_KEN}${SLACK_NOLAN} AMM error`, formatError(error));
  }
};

export const processCheckAndBalanceRate = async ({ chainId, addressLCR, addressUSDT }) => {
  try {
    const configBalanceRate = await ConfigModel.findOne({ chain_id: chainId, key: KEY_CONFIG.balance_rate });
    const { lower_bound, upper_bound, enable_process } = JSON.parse(configBalanceRate.value);
    if (enable_process) {
      const upper_bound_price_lcr_wei = etherToWei(upper_bound); // BigNumber
      const lower_bound_price_lcr_wei = etherToWei(lower_bound); // BigNumber

      const provider = await getProvider(chainId);

      const addressRouter = deployments[chainId?.toString()].LCRRouter02[0];
      const router = new Contract(addressRouter, ABIS.LCRRouter02, provider);
      const lcr = new Contract(addressLCR, ABIS.ERC20, provider);
      const usdt = new Contract(addressUSDT, ABIS.ERC20, provider);

      const amountsOut = await router.getAmountsOut(etherToWei(1), [addressLCR, addressUSDT]); // price 1 LCR / USDT
      const amountWeiUSDT = amountsOut[amountsOut.length - 1];
      const amountWeiLCR = amountsOut[0];

      console.log(` Rate 1 USDT/LCR: ${weiToEther(amountWeiUSDT)} USDT -> ${weiToEther(amountWeiLCR)} LCR`);
      console.log(` Price LCR: ${parseFloat(weiToEther(amountWeiUSDT)) / parseFloat(weiToEther(amountWeiLCR))} USDT`);

      // Price LCR UP
      if (amountWeiUSDT.gte(upper_bound_price_lcr_wei)) {
        console.log(` Price is too high for the threshold -> SELL`);
        // Get max LCR balance to swap SELL LCR to lower the price of LCR
        const [indexWalletBalanceRate] = await getWalletBalanceRateMaxBalances({
          chainId,
          listSymbolAssets: [SYMBOL_TOKEN.LCR],
        });

        const walletOffchain = Wallet.fromMnemonic(
          MNEMONIC_ROOT_BALANCE_RATE,
          `m/44'/60'/0'/0/${indexWalletBalanceRate.index}`,
        );
        const wallet = walletOffchain.connect(provider);

        const balanceNatvie = parseFloat(maxNumberDecimal(weiToEther(await wallet.getBalance())));
        if (balanceNatvie < 0.00051) {
          console.log(`- Balance (${SYMBOL_NATIVE[chainId]}) out of gas`);
          return true;
        }

        // Sell LCR

        const addressPairLCR_USDT = deployments[chainId?.toString()].LCRPair[0];
        const pair = new Contract(addressPairLCR_USDT, ABIS.BLCRPair, provider);

        const token0 = await pair.token0();
        const token1 = await pair.token1();
        const [reserve0, reserve1] = await pair.getReserves();

        const reserveLCR = token0.toLowerCase() == addressLCR.toLowerCase() ? reserve0 : reserve1;
        const reserveUSDT = token1.toLowerCase() == addressUSDT.toLowerCase() ? reserve1 : reserve0;

        const differenceHalf = parseFloat(
          weiToEther((reserveLCR.gt(reserveUSDT) ? reserveLCR.sub(reserveUSDT) : reserveUSDT.sub(reserveLCR)).div(2)),
        );

        const MAX_AMOUNT_SWAP = getMaxAmount(differenceHalf).max;
        const numberRandom = randomIntBetween(2, 4);

        let amountInEther =
          differenceHalf > MAX_AMOUNT_SWAP
            ? randomFloatBetween(MAX_AMOUNT_SWAP / parseInt(numberRandom), MAX_AMOUNT_SWAP)
            : differenceHalf;
        amountInEther = formatFloorNumber(amountInEther);

        const balanceLCR = parseFloat(maxNumberDecimal(weiToEther(await lcr.balanceOf(wallet.address))));

        if (balanceLCR < amountInEther) {
          console.log(`- Balance (${SYMBOL_TOKEN.LCR}) out of fund`);
          return true;
        }

        console.log(` Amount Sell: ${amountInEther} LCR`);
        console.log('\n');
        console.log('\n');

        const result = await tradeOurDex({
          chainId,
          wallet,
          symbolTokenIn: SYMBOL_TOKEN.LCR,
          symbolTokenOut: SYMBOL_TOKEN.USDT,
          amountInEther,
          typeWallet: TYPE_WALLET.amm,
          slippage: 0.5,
        });

        await logs({
          chain_id: chainId,
          type: NAME_JOB.balance_rate.balance_rate_sell,
          status: true,
          wallet_address_1: result?.data?.sender,
          wallet_address_2: result?.data?.sender,
          index_wallet_1: indexWalletBalanceRate.index,
          index_wallet_2: indexWalletBalanceRate.index,
          amount: amountInEther,
          token_in: SYMBOL_TOKEN.LCR,
          token_out: SYMBOL_TOKEN.USDT,
          amount_fee: 0,
          gas_fee: result?.data?.gasFee,
          tx_hash: result?.data?.txHash,
          descriptions: `${result?.data?.sender}[${indexWalletBalanceRate.index}] ${NAME_JOB.balance_rate.balance_rate_sell} ${amountInEther} ${SYMBOL_TOKEN.LCR} to ${result?.data?.amountOut} ${SYMBOL_TOKEN.USDT}`,
        });
        return true;
      }

      // Price LCR DOWN
      if (amountWeiUSDT.lte(lower_bound_price_lcr_wei)) {
        console.log(' Price is too low for the threshold -> BUY');
        // Get balance USDT max to swap BUY LCR to increase the price of LCR
        const [indexWalletBalanceRate] = await getWalletBalanceRateMaxBalances({
          chainId,
          listSymbolAssets: [SYMBOL_TOKEN.USDT],
        });
        const walletOffchain = Wallet.fromMnemonic(
          MNEMONIC_ROOT_BALANCE_RATE,
          `m/44'/60'/0'/0/${indexWalletBalanceRate.index}`,
        );
        const wallet = walletOffchain.connect(provider);

        const balanceNatvie = parseFloat(maxNumberDecimal(weiToEther(await wallet.getBalance())));
        if (balanceNatvie < 0.00051) {
          console.log(`- Balance (${SYMBOL_NATIVE[chainId]}) out of gas`);
          return true;
        }

        const addressPairLCR_USDT = deployments[chainId?.toString()].LCRPair[0];
        const pair = new Contract(addressPairLCR_USDT, ABIS.BLCRPair, provider);

        const token0 = await pair.token0();
        const token1 = await pair.token1();
        const [reserve0, reserve1] = await pair.getReserves();

        const reserveLCR = token0.toLowerCase() == addressLCR.toLowerCase() ? reserve0 : reserve1;
        const reserveUSDT = token1.toLowerCase() == addressUSDT.toLowerCase() ? reserve1 : reserve0;

        const differenceHalf = parseFloat(
          weiToEther((reserveLCR.gt(reserveUSDT) ? reserveLCR.sub(reserveUSDT) : reserveUSDT.sub(reserveLCR)).div(2)),
        );

        const MAX_AMOUNT_SWAP = getMaxAmount(differenceHalf).max;
        const numberRandom = randomIntBetween(2, 4);

        let amountInEther =
          differenceHalf > MAX_AMOUNT_SWAP
            ? randomFloatBetween(MAX_AMOUNT_SWAP / parseInt(numberRandom), MAX_AMOUNT_SWAP)
            : differenceHalf;
        amountInEther = formatFloorNumber(amountInEther);

        const balanceUSDT = parseFloat(maxNumberDecimal(weiToEther(await usdt.balanceOf(wallet.address))));

        if (balanceUSDT < amountInEther) {
          console.log(`- Balance (${SYMBOL_TOKEN.USDT}) out of fund`);
          return true;
        }

        console.log(` Amount Buy: ${amountInEther} USDT`);
        console.log('\n');
        console.log('\n');

        // Buy LCR
        const result = await tradeOurDex({
          chainId,
          wallet,
          symbolTokenIn: SYMBOL_TOKEN.USDT,
          symbolTokenOut: SYMBOL_TOKEN.LCR,
          amountInEther,
          typeWallet: TYPE_WALLET.amm,
          slippage: 0.5,
        });

        await logs({
          chain_id: chainId,
          type: NAME_JOB.balance_rate.balance_rate_buy,
          status: true,
          wallet_address_1: result?.data?.sender,
          wallet_address_2: result?.data?.sender,
          index_wallet_1: indexWalletBalanceRate.index,
          index_wallet_2: indexWalletBalanceRate.index,
          amount: amountInEther,
          token_in: SYMBOL_TOKEN.USDT,
          token_out: SYMBOL_TOKEN.LCR,
          amount_fee: 0,
          gas_fee: result?.data?.gasFee,
          tx_hash: result?.data?.txHash,
          descriptions: `${result?.data?.sender}[${indexWalletBalanceRate.index}] ${NAME_JOB.balance_rate.balance_rate_buy} ${amountInEther} ${SYMBOL_TOKEN.USDT} to ${result?.data?.amountOut} ${SYMBOL_TOKEN.LCR}`,
        });

        return true;
      }

      if (amountWeiLCR.gt(lower_bound_price_lcr_wei) && amountWeiLCR.lt(upper_bound_price_lcr_wei))
        console.log('\n => The Price Is In The Allowable Threshold! \n');
      return true;
    }
  } catch (error) {
    console.log(error);
    await sendNotiBackendTeam(`[BOT_TOOL]: N0303 - Tx Balance Rate - AMM Fail! - Error: ${formatError(error)}`);
    return false;
  }
};

// listenAndProcessEventsTransfer({ chainId: 56 });
