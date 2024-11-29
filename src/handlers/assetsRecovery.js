import axios from 'axios';
import { BigNumber, ethers } from 'ethers';
import mongoose from 'mongoose';
import { ABIS } from '../../configs/ABIs.js';
import { ZERO_ADDRESS, getMapToken } from '../../configs/addresses.js';
import ERC20 from '../../modules/wallet/transfer/ERC20.js';
import Native from '../../modules/wallet/transfer/Native.js';
import { getProvider } from '../../utils/blockchain.js';
import {
  API_KEY_BITQUERY,
  API_KEY_SCAN,
  BASE_URL_API_SCAN,
  LIST_INDEX_SOURCE_SKIM,
  LIST_INDEX_WALLET_BALANCE_RATE,
  LIST_INDEX_WALLET_SOURCE,
  LIST_INDEX_WALLET_SPENDING,
  MIN_AMOUNT_LCR_RECOVERY,
  MIN_AMOUNT_USDT_RECOVERY,
  NETWORK_BITQUERY,
  PAIR_ADDRESS,
} from '../../utils/constant.js';
import { NAME_JOB, SYMBOL_NATIVE, SYMBOL_TOKEN, TYPE_WALLET } from '../../utils/enum.js';
import { getAddressFromMapJson } from '../../utils/file.js';
import { weiToEther } from '../../utils/format.js';
import { sleep } from '../../utils/utils.js';
import { logs } from '../models/Log.js';
import WalletSourceModel from '../models/WalletSource.js';
import { reportBalancesAllWallets } from '../reports/reportsBalancesWallets.js';
import {
  getGasPriceDynamic,
  getHoldingAmountBot,
  getSourceWalletMinBalances,
  getWalletBalanceRateByIndexOffChain,
  getWalletByIndexOffChain,
  getWalletSourceByIndexOffChain,
  getWalletSourceSkimByIndexOffChain,
  getWalletSpendingFreeCoinByIndexOffChain,
} from './common.js';
import { maxNumberDecimal } from './functions.js';
import HistoryBalancesModel from '../models/HistoryBalances.js';
import moment from 'moment';
import { FORMAT_DATE } from '../../utils/time.js';

export const assetsRecoveryToSource = async ({ chainId, indexWallets, idExecuteTemplate, scheduleId }) => {
  try {
    const infoTokenLcr = getMapToken(chainId, SYMBOL_TOKEN.LCR);
    if (!infoTokenLcr) throw { error: `Token ${SYMBOL_TOKEN.LCR} not supported` };
    let lcr = new ERC20({ chainId, token: infoTokenLcr.address });

    const infoTokenUsdt = getMapToken(chainId, SYMBOL_TOKEN.USDT);
    if (!infoTokenUsdt) throw { error: `Token ${SYMBOL_TOKEN.USDT} not supported` };
    let usdt = new ERC20({ chainId, token: infoTokenUsdt.address });

    let native = new Native({ chainId });

    let [sourceWalletNative, sourceWalletUSDT, sourceWalletLCR] = [null, null, null];

    [sourceWalletNative, sourceWalletUSDT, sourceWalletLCR] = await getSourceWalletMinBalances({
      type: TYPE_WALLET.source_dex,
      chainId,
      listSymbolAssets: [SYMBOL_NATIVE[chainId], SYMBOL_TOKEN.USDT, SYMBOL_TOKEN.LCR],
    });

    const title = scheduleId ? `Schedule Id [ ${scheduleId} ]` : `Id Execute Template [ ${idExecuteTemplate} ]`;
    const totalIndexWallets = indexWallets.length;
    console.log(`- ${title} Total:`, totalIndexWallets, ` wallets`);
    let listTxHash = [];
    for (let i = 0; i < totalIndexWallets; i++) {
      const index = indexWallets[i];
      console.log(`- ${title} Index: ${i}/${totalIndexWallets - 1} - Index Wallet: ${index}`);
      const wallet = getWalletByIndexOffChain({ chainId, indexWallet: index });

      const holdingAmount = await getHoldingAmountBot({ chainId, index });
      const balanceWeiLcr = await lcr.balanceOf({ address: wallet.address });
      const balanceEtherLcr = parseFloat(maxNumberDecimal(weiToEther(balanceWeiLcr)));
      const balanceDeductedEtherLcr = balanceEtherLcr - holdingAmount;

      const balanceWeiUsdt = await usdt.balanceOf({ address: wallet.address });
      const balanceEtherUsdt = parseFloat(weiToEther(balanceWeiUsdt));

      let objLogs = {
        chain_id: chainId,
        type: NAME_JOB.onChain.assets_recovery,
        wallet_address_1: wallet.address,
        index_wallet_1: index,
      };

      if (idExecuteTemplate) objLogs.id_execute_template = idExecuteTemplate;
      if (scheduleId) objLogs.schedule_id = scheduleId;

      let txLCR = null;
      if (balanceDeductedEtherLcr >= MIN_AMOUNT_LCR_RECOVERY) {
        txLCR = await lcr.transfer({
          privateKey: wallet.privateKey,
          receiver: sourceWalletLCR.address,
          amount: balanceDeductedEtherLcr,
          typeWallet: TYPE_WALLET.dex,
        });

        await logs({
          ...objLogs,
          wallet_address_2: sourceWalletLCR.address,
          index_wallet_2: sourceWalletLCR.index,
          status: txLCR.status,
          amount: balanceDeductedEtherLcr,
          token_in: SYMBOL_TOKEN.LCR,
          token_out: SYMBOL_TOKEN.LCR,
          gas_fee: txLCR?.data?.gasFee,
          tx_hash: txLCR?.data?.txHash,
          descriptions: `${wallet.address}[${index}] ${NAME_JOB.onChain.assets_recovery} ${balanceDeductedEtherLcr} ${SYMBOL_TOKEN.LCR} to ${sourceWalletLCR.address}[${sourceWalletLCR.index}]`,
        });
      }

      let txUSDT = null;
      if (balanceEtherUsdt >= MIN_AMOUNT_USDT_RECOVERY) {
        txUSDT = await usdt.transferAll({
          privateKey: wallet.privateKey,
          receiver: sourceWalletUSDT.address,
          typeWallet: TYPE_WALLET.dex,
        });
        await logs({
          ...objLogs,
          wallet_address_2: sourceWalletUSDT.address,
          index_wallet_2: sourceWalletUSDT.index,
          status: txUSDT.status,
          amount: balanceEtherUsdt,
          token_in: SYMBOL_TOKEN.USDT,
          token_out: SYMBOL_TOKEN.USDT,
          gas_fee: txUSDT?.data?.gasFee,
          tx_hash: txUSDT?.data?.txHash,
          descriptions: `${wallet.address}[${index}] ${NAME_JOB.onChain.assets_recovery} ${balanceEtherUsdt} ${SYMBOL_TOKEN.USDT} to ${sourceWalletUSDT.address}[${sourceWalletUSDT.index}]`,
        });
      }

      const balanceEtherNativeWei = await native.balanceOf({ address: wallet.address });
      const gasPriceBuffed = await getGasPriceDynamic({ chainId });
      const gasLimit = 21000;
      const feeTransacion = BigNumber.from(gasLimit).mul(gasPriceBuffed);
      const balanceEtherNative = parseFloat(maxNumberDecimal(weiToEther(balanceEtherNativeWei)));
      let txNative = null;
      if (balanceEtherNativeWei.gt(feeTransacion)) {
        txNative = await native.transferAll({
          privateKey: wallet.privateKey,
          receiver: sourceWalletNative.address,
          gasLimit,
          typeWallet: TYPE_WALLET.dex,
        });

        await logs({
          ...objLogs,
          wallet_address_2: sourceWalletNative.address,
          index_wallet_2: sourceWalletNative.index,
          status: txNative.status,
          amount: balanceEtherNative,
          token_in: SYMBOL_NATIVE[chainId],
          token_out: SYMBOL_NATIVE[chainId],
          gas_fee: txNative?.data?.gasFee,
          tx_hash: txNative?.data?.txHash,
          descriptions: `${wallet.address}[${index}] ${NAME_JOB.onChain.assets_recovery} ${balanceEtherNative} ${SYMBOL_NATIVE[chainId]} to ${sourceWalletNative.address}[${sourceWalletNative.index}]`,
        });
      }
      listTxHash.push({
        txLCR,
        txUSDT,
        txNative,
      });
    }
    console.log(`- ${title} DONE!`);
    return {
      status: true,
      error: null,
      listTxHash,
    };
  } catch (error) {
    console.log(error);
    // return {
    //   status: false,
    //   error,
    //   listTxHash: null,
    // };
  }
};

export const assetsRecoveryAllWalletsToSource = async ({ chainId }) => {
  try {
    const infoTokenLcr = getMapToken(chainId, SYMBOL_TOKEN.LCR);
    if (!infoTokenLcr) throw { error: `Token ${SYMBOL_TOKEN.LCR} not supported` };
    let lcr = new ERC20({ chainId, token: infoTokenLcr.address });

    const infoTokenUsdt = getMapToken(chainId, SYMBOL_TOKEN.USDT);
    if (!infoTokenUsdt) throw { error: `Token ${SYMBOL_TOKEN.USDT} not supported` };
    let usdt = new ERC20({ chainId, token: infoTokenUsdt.address });

    let native = new Native({ chainId });

    const [sourceWalletNative, sourceWalletUSDT, sourceWalletLCR] = await getSourceWalletMinBalances({
      type: TYPE_WALLET.source_dex,
      chainId,
      listSymbolAssets: [SYMBOL_NATIVE[chainId], SYMBOL_TOKEN.USDT, SYMBOL_TOKEN.LCR],
    });

    const report = await reportBalancesAllWallets({ chainId });

    const provider = await getProvider(chainId);
    const gasPriceBuffed = await getGasPriceDynamic({ chainId, provider });
    const feeTransacion = 21000 * gasPriceBuffed;
    console.log('Total Wallets: ', report.walletsHaveBalances.length);
    for (let i = 0; i < report.walletsHaveBalances.length; i++) {
      const infoBalance = report.walletsHaveBalances[i];
      console.log('Index: ', i);
      const wallet = getWalletByIndexOffChain({ indexWallet: infoBalance.index });

      const holdingAmount = await getHoldingAmountBot({ chainId, index: infoBalance.index });
      const balanceWeiLcr = await lcr.balanceOf({ address: wallet.address });
      const balanceEtherLcr = parseFloat(maxNumberDecimal(weiToEther(balanceWeiLcr)));
      const balanceDeductedEtherLcr = balanceEtherLcr - holdingAmount;

      const balanceWeiUsdt = await usdt.balanceOf({ address: wallet.address });
      const balanceEtherUsdt = parseFloat(weiToEther(balanceWeiUsdt));

      let objLogs = {
        chain_id: chainId,
        type: NAME_JOB.onChain.assets_recovery,
        wallet_address_1: wallet.address,
        index_wallet_1: infoBalance.index,
      };

      let txLCR = null;
      if (balanceDeductedEtherLcr >= MIN_AMOUNT_LCR_RECOVERY) {
        txLCR = await lcr.transfer({
          privateKey: wallet.privateKey,
          receiver: sourceWalletLCR.address,
          amount: balanceDeductedEtherLcr,
          typeWallet: TYPE_WALLET.dex,
        });

        await logs({
          ...objLogs,
          wallet_address_2: sourceWalletLCR.address,
          index_wallet_2: sourceWalletLCR.index,
          status: txLCR.status,
          amount: balanceDeductedEtherLcr,
          token_in: SYMBOL_TOKEN.LCR,
          token_out: SYMBOL_TOKEN.LCR,
          gas_fee: txLCR?.data?.gasFee,
          tx_hash: txLCR?.data?.txHash,
          descriptions: `${wallet.address}[${infoBalance.index}] ${NAME_JOB.onChain.assets_recovery} ${balanceDeductedEtherLcr} ${SYMBOL_TOKEN.LCR} to ${sourceWalletLCR.address}[${sourceWalletLCR.index}]`,
        });
      }

      let txUSDT = null;
      if (balanceEtherUsdt >= MIN_AMOUNT_USDT_RECOVERY) {
        txUSDT = await usdt.transferAll({
          privateKey: wallet.privateKey,
          receiver: sourceWalletUSDT.address,
          typeWallet: TYPE_WALLET.dex,
        });
        await logs({
          ...objLogs,
          wallet_address_2: sourceWalletUSDT.address,
          index_wallet_2: sourceWalletUSDT.index,
          status: txUSDT.status,
          amount: balanceEtherUsdt,
          token_in: SYMBOL_TOKEN.USDT,
          token_out: SYMBOL_TOKEN.USDT,
          gas_fee: txUSDT?.data?.gasFee,
          tx_hash: txUSDT?.data?.txHash,
          descriptions: `${wallet.address}[${infoBalance.index}] ${NAME_JOB.onChain.assets_recovery} ${balanceEtherUsdt} ${SYMBOL_TOKEN.USDT} to ${sourceWalletUSDT.address}[${sourceWalletUSDT.index}]`,
        });
      }
      const balanceEtherNativeWei = await native.balanceOf({ address: wallet.address });
      const balanceEtherNative = parseFloat(maxNumberDecimal(weiToEther(balanceEtherNativeWei)));
      let txNative = null;
      if (balanceEtherNativeWei.gt(feeTransacion)) {
        txNative = await native.transferAll({
          privateKey: wallet.privateKey,
          receiver: sourceWalletNative.address,
          typeWallet: TYPE_WALLET.dex,
        });
        await logs({
          ...objLogs,
          wallet_address_2: sourceWalletNative.address,
          index_wallet_2: sourceWalletNative.index,
          status: txNative.status,
          amount: balanceEtherNative,
          token_in: SYMBOL_NATIVE[chainId],
          token_out: SYMBOL_NATIVE[chainId],
          gas_fee: txNative?.data?.gasFee,
          tx_hash: txNative?.data?.txHash,
          descriptions: `${wallet.address}[${infoBalance.index}] ${NAME_JOB.onChain.assets_recovery} ${balanceEtherNative} ${SYMBOL_NATIVE[chainId]} to ${sourceWalletNative.address}[${sourceWalletNative.index}]`,
        });
      }
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

export const getBalanceWallets = async ({ chainId, listAddress, listTokens }) => {
  try {
    const infoBalances = await getMultiBalancesByContrat(chainId, listAddress, listTokens);
    if (!infoBalances.status) throw infoBalances.error;
    const balances = Object.keys(infoBalances.balances).map(address => {
      let infoBalance = { address: address.toLowerCase() };
      return { ...infoBalance, balances: infoBalances.balances[address.toLowerCase()] };
    });

    return {
      status: true,
      error: null,
      balances,
    };
  } catch (error) {
    console.log(error);
    return {
      status: false,
      error,
      balances: [],
    };
  }
};

export const getBalancePair = async ({ chainId }) => {
  try {
    const infoTokenLcr = getMapToken(chainId, SYMBOL_TOKEN.LCR);
    if (!infoTokenLcr) throw { error: `Token ${SYMBOL_TOKEN.LCR} not supported` };
    const infoTokenUsdt = getMapToken(chainId, SYMBOL_TOKEN.USDT);
    if (!infoTokenUsdt) throw { error: `Token ${SYMBOL_TOKEN.USDT} not supported` };
    const listTokens = [
      { address: infoTokenLcr.address, symbol: SYMBOL_TOKEN.LCR },
      { address: infoTokenUsdt.address, symbol: SYMBOL_TOKEN.USDT },
    ];
    const result = await getBalanceWallets({
      chainId,
      listAddress: [PAIR_ADDRESS[chainId]],
      listTokens,
    });

    if (!result.status) throw result.error;

    let balance = {
      address: result.balances[0]?.address,
      lcr: parseFloat(result.balances[0]?.balances.lcr),
      usdt: parseFloat(result.balances[0]?.balances.usdt),
    };

    return {
      status: true,
      error: null,
      balance,
    };
  } catch (error) {
    console.log(error);
    return {
      status: false,
      error,
      balance: null,
    };
  }
};

export const cacheBalanceWallets = async ({ type, chainId, mapWallets, listAddress, listTokens }) => {
  try {
    const infoBalances = await getMultiBalancesByContrat(chainId, listAddress, listTokens);
    if (!infoBalances.status) throw infoBalances.error;
    const balances = Object.keys(infoBalances.balances).map(address => {
      let infoBalance = { index: mapWallets.get(address.toLowerCase()), address: address.toLowerCase() };
      return { ...infoBalance, balances: infoBalances.balances[address.toLowerCase()] };
    });

    let dataSave = await Promise.all(
      balances.map(async info => {
        return [
          ...Object.keys(info.balances).map(asset => {
            return {
              chain_id: chainId,
              index: info.index,
              address: info.address,
              asset: asset?.toLowerCase(),
              balance: new mongoose.Types.Decimal128(info.balances[asset]?.toString()),
            };
          }),
        ];
      }),
    );
    dataSave = [].concat(...dataSave);

    await Promise.all(
      dataSave.map(async data => {
        await WalletSourceModel.findOneAndUpdate(
          { type, chain_id: chainId, index: data.index, asset: data.asset },
          data,
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
          },
        );
      }),
    );

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

export const cacheBalanceWalletsSource = async ({ chainId }) => {
  try {
    const infoTokenLcr = getMapToken(chainId, SYMBOL_TOKEN.LCR);
    if (!infoTokenLcr) throw { error: `Token ${SYMBOL_TOKEN.LCR} not supported` };
    const infoTokenUsdt = getMapToken(chainId, SYMBOL_TOKEN.USDT);
    if (!infoTokenUsdt) throw { error: `Token ${SYMBOL_TOKEN.USDT} not supported` };

    let mapSourceWallets = new Map();
    LIST_INDEX_WALLET_SOURCE.forEach(async index => {
      let wallet = getWalletSourceByIndexOffChain({ indexWallet: index });
      mapSourceWallets.set(wallet?.address?.toLowerCase(), index);
    });

    const listAddress = [...mapSourceWallets.keys()];

    const listTokens = [
      {
        address: infoTokenLcr.address,
        symbol: SYMBOL_TOKEN.LCR,
      },
      {
        address: infoTokenUsdt.address,
        symbol: SYMBOL_TOKEN.USDT,
      },
      {
        address: ZERO_ADDRESS,
        symbol: SYMBOL_NATIVE[chainId],
      },
    ];

    await cacheBalanceWallets({
      type: TYPE_WALLET.source_dex,
      chainId,
      mapWallets: mapSourceWallets,
      listAddress,
      listTokens,
    });

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

export const cacheBalanceWalletsSpending = async ({ chainId }) => {
  try {
    const infoTokenLcr = getMapToken(chainId, SYMBOL_TOKEN.LCR);
    if (!infoTokenLcr) throw { error: `Token ${SYMBOL_TOKEN.LCR} not supported` };

    let mapSpendingWallets = new Map();
    LIST_INDEX_WALLET_SPENDING.forEach(async index => {
      let wallet = getWalletSpendingFreeCoinByIndexOffChain({ indexWallet: index });
      mapSpendingWallets.set(wallet?.address?.toLowerCase(), index);
    });

    const listAddress = [...mapSpendingWallets.keys()];

    const listTokens = [
      {
        address: infoTokenLcr.address,
        symbol: SYMBOL_TOKEN.LCR,
      },
      {
        address: ZERO_ADDRESS,
        symbol: SYMBOL_NATIVE[chainId],
      },
    ];

    await cacheBalanceWallets({
      type: TYPE_WALLET.spending_free_coin,
      chainId,
      mapWallets: mapSpendingWallets,
      listAddress,
      listTokens,
    });

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

export const cacheBalanceSourceSkim = async ({ chainId }) => {
  try {
    const infoTokenLcr = getMapToken(chainId, SYMBOL_TOKEN.LCR);
    if (!infoTokenLcr) throw { error: `Token ${SYMBOL_TOKEN.LCR} not supported` };

    let mapSkimWallets = new Map();
    LIST_INDEX_SOURCE_SKIM.forEach(async index => {
      let wallet = getWalletSourceSkimByIndexOffChain({ indexWallet: index });
      mapSkimWallets.set(wallet?.address?.toLowerCase(), index);
    });

    const listAddress = [...mapSkimWallets.keys()];

    const listTokens = [
      {
        address: infoTokenLcr.address,
        symbol: SYMBOL_TOKEN.LCR,
      },
      {
        address: ZERO_ADDRESS,
        symbol: SYMBOL_NATIVE[chainId],
      },
    ];

    await cacheBalanceWallets({
      type: TYPE_WALLET.skim_source,
      chainId,
      mapWallets: mapSkimWallets,
      listAddress,
      listTokens,
    });

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

export const cacheBalanceAll = async () => {
  try {
    const CHAIN_ID_BSC = 56;
    const infoTokenLcr_BSC = getMapToken(CHAIN_ID_BSC, SYMBOL_TOKEN.LCR);
    if (!infoTokenLcr_BSC) throw { error: `Token ${SYMBOL_TOKEN.LCR} not supported` };
    const infoTokenUsdt_BSC = getMapToken(CHAIN_ID_BSC, SYMBOL_TOKEN.USDT);
    if (!infoTokenUsdt_BSC) throw { error: `Token ${SYMBOL_TOKEN.USDT} not supported` };

    let mapWallets_BSC = new Map();
    LIST_INDEX_WALLET_SOURCE.forEach(async index => {
      let wallet = getWalletSourceByIndexOffChain({ indexWallet: index });
      mapWallets_BSC.set(wallet?.address?.toLowerCase(), { index, type: TYPE_WALLET.source_dex });
    });
    LIST_INDEX_WALLET_BALANCE_RATE.forEach(async index => {
      let wallet = getWalletBalanceRateByIndexOffChain({ indexWallet: index });
      mapWallets_BSC.set(wallet?.address?.toLowerCase(), { index, type: TYPE_WALLET.amm });
    });

    mapWallets_BSC.set('0x3eefAd673e2E54940b2fcA9B1704B01Da2633d54'.toLowerCase(), { index: 0, type: 'spending_prod' }); // Spending Wallet PROD
    mapWallets_BSC.set('0x8C5e8c73BA43D0A580c2663F149044e6fb3E7515'.toLowerCase(), { index: 0, type: 'spending_beta' }); // Spending Wallet BETA

    const listAddress_BSC = [...mapWallets_BSC.keys()];

    const listTokens_BSC = [
      {
        address: infoTokenLcr_BSC.address,
        symbol: SYMBOL_TOKEN.LCR,
      },
      {
        address: infoTokenUsdt_BSC.address,
        symbol: SYMBOL_TOKEN.USDT,
      },
      {
        address: ZERO_ADDRESS,
        symbol: SYMBOL_NATIVE[CHAIN_ID_BSC],
      },
    ];

    const CHAIN_ID_CELO = 42220;
    const infoTokenLcr_CELO = getMapToken(CHAIN_ID_CELO, SYMBOL_TOKEN.LCR);
    if (!infoTokenLcr_CELO) throw { error: `Token ${SYMBOL_TOKEN.LCR} not supported` };

    let mapWallets_CELO = new Map();
    LIST_INDEX_WALLET_SOURCE.forEach(async index => {
      let wallet = getWalletSourceByIndexOffChain({ indexWallet: index });
      mapWallets_CELO.set(wallet?.address?.toLowerCase(), { index, type: TYPE_WALLET.source_dex });
    });
    LIST_INDEX_SOURCE_SKIM.forEach(async index => {
      let wallet = getWalletSourceSkimByIndexOffChain({ indexWallet: index });
      mapWallets_CELO.set(wallet?.address?.toLowerCase(), { index, type: TYPE_WALLET.skim_source });
    });
    LIST_INDEX_WALLET_SPENDING.forEach(async index => {
      let wallet = getWalletSpendingFreeCoinByIndexOffChain({ indexWallet: index });
      mapWallets_CELO.set(wallet?.address?.toLowerCase(), { index, type: TYPE_WALLET.spending_free_coin });
    });

    const listAddress_CELO = [...mapWallets_CELO.keys()];

    const listTokens_CELO = [
      {
        address: infoTokenLcr_CELO.address,
        symbol: SYMBOL_TOKEN.LCR,
      },
      {
        address: ZERO_ADDRESS,
        symbol: SYMBOL_NATIVE[CHAIN_ID_CELO],
      },
    ];

    let balances = {};
    const infoBalances_BSC = await getMultiBalancesByContrat(CHAIN_ID_BSC, listAddress_BSC, listTokens_BSC);
    if (!infoBalances_BSC.status) throw infoBalances_BSC.error;
    Object.keys(infoBalances_BSC.balances).map(address => {
      const info = mapWallets_BSC.get(address.toLowerCase());
      let infoBalance = { index: info.index, type: info.type, address: address.toLowerCase() };
      balances[address.toLowerCase()] = {
        ...balances[address.toLowerCase()],
        ...infoBalance,
        56: {
          ...balances[address.toLowerCase()]?.balances,
          ...infoBalances_BSC.balances[address.toLowerCase()],
        },
      };
    });

    const infoBalances_CELO = await getMultiBalancesByContrat(CHAIN_ID_CELO, listAddress_CELO, listTokens_CELO);
    if (!infoBalances_CELO.status) throw infoBalances_CELO.error;
    Object.keys(infoBalances_CELO.balances).map(address => {
      const info = mapWallets_CELO.get(address.toLowerCase());
      let infoBalance = { index: info.index, type: info.type, address: address.toLowerCase() };
      balances[address.toLowerCase()] = {
        ...balances[address.toLowerCase()],
        ...infoBalance,
        42220: {
          ...balances[address.toLowerCase()]?.balances,
          ...infoBalances_CELO.balances[address.toLowerCase()],
        },
      };
    });

    balances = Array.from(Object.values(balances));

    await HistoryBalancesModel.create({
      balances: JSON.stringify(balances),
      date: moment().format(FORMAT_DATE),
      time_cache: moment(),
    });

    return {
      status: true,
      error: null,
      balances,
    };
  } catch (error) {
    console.log(error);
    return {
      status: false,
      error,
      balances: null,
    };
  }
};

export const getBalancesScan = async (chainId, addresses, tokens) => {
  const baseURL = BASE_URL_API_SCAN[chainId];
  try {
    let results = await Promise.all(
      tokens.map(async (token, index) => {
        await sleep(index * 1000);
        let balanceObject = {};
        addresses.map(address => {
          balanceObject[address.toLowerCase()] = { ...balanceObject[address.toLowerCase()] };
          balanceObject[address.toLowerCase()][token.symbol.toLowerCase()] = 0;
        });

        if (token.symbol === SYMBOL_NATIVE[chainId]) {
          const url = `${baseURL}?module=account&action=balancemulti&address=${addresses?.toString()}&tag=latest&apikey=${
            API_KEY_SCAN[chainId]
          }`;
          const res = await axios.get(url);
          res?.data?.result?.map(info => {
            let balance = balanceObject[info.account.toLowerCase()];
            balance[SYMBOL_NATIVE[chainId].toLowerCase()] = weiToEther(info.balance);
            balanceObject[info.account.toLowerCase()] = { ...balance };
          });
          return balanceObject;
        } else {
          let res = await Promise.all(
            addresses?.map(async (address, i) => {
              await sleep(i * 1000);
              const res = await axios.get(
                `${baseURL}?module=account&action=tokenbalance&contractaddress=${token.address}&address=${address}&tag=latest&apikey=${API_KEY_SCAN[chainId]}`,
              );
              return { address, balance: res?.data?.result ? weiToEther(res?.data?.result) : 0 };
            }),
          );
          res?.map(info => {
            let balance = balanceObject[info.address.toLowerCase()];
            balance[token.symbol.toLowerCase()] = info.balance;
            balanceObject[info.address.toLowerCase()] = { ...balance };
          });
          return balanceObject;
        }
      }),
    );

    let balances = {};
    results?.map(item =>
      Object.keys(item)?.map(address => (balances[address] = { ...balances[address], ...item[address] })),
    );

    return { status: true, error: null, balances };
  } catch (error) {
    console.log(error);
    return { status: false, error, balances: null };
  }
};

export const getBalancesBitquery = async (chainId, addresses, tokens) => {
  var data = JSON.stringify({
    query: `
      query ($network: EthereumNetwork!) {
        ethereum(network: $network) {
          address(address: {in: ${JSON.stringify(addresses)}}) {
            balances(currency: {in: ${JSON.stringify(tokens)}}) {
              value
              currency {
                symbol
                address
              }
            }
            address
          }
        }
      }`,
    variables: {
      network: NETWORK_BITQUERY[chainId],
    },
  });

  var config = {
    method: 'post',
    url: 'https://graphql.bitquery.io',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': API_KEY_BITQUERY,
    },
    data: data,
  };

  let res = await axios(config);

  return res.data.data.ethereum.address;
};

export const getMultiBalancesByContrat = async (chainId, addresses, tokens) => {
  try {
    const provider = await getProvider(chainId);
    const multiTransferAddress = getAddressFromMapJson(chainId, 'MultiTransfer');
    if (!multiTransferAddress) throw { error: 'MultiTransfer address must exists' };
    const instanceMultiTransfer = new ethers.Contract(multiTransferAddress, ABIS.MultiTransferABI, provider);

    const lsitAddressTokens = tokens.map(a => a.address.toLowerCase());
    const mapSymbol = new Map(tokens.map(i => [i.address.toLowerCase(), i.symbol.toLowerCase()]));

    const values = await instanceMultiTransfer.balances(addresses, lsitAddressTokens);

    let balances = {};

    await Promise.all(
      addresses.map((address, addressIdx) => {
        balances[address.toLowerCase()] = {};
        lsitAddressTokens.forEach((tokenAddress, tokenIdx) => {
          const balance = values[addressIdx * lsitAddressTokens.length + tokenIdx];
          const symbolToken = mapSymbol.get(tokenAddress.toLowerCase());
          balances[address.toLowerCase()][symbolToken] = weiToEther(balance.toString());
        });
      }),
    );

    return { status: true, error: null, balances };
  } catch (error) {
    console.log(error);
    return { status: false, error, balances: {} };
  }
};
