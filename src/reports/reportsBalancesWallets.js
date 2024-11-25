import { ZERO_ADDRESS, getMapToken } from '../../configs/addresses.js';
import { MIN_AMOUNT_BNB_RECOVERY, MIN_AMOUNT_LCR_RECOVERY, MIN_AMOUNT_USDT_RECOVERY } from '../../utils/constant.js';
import { SYMBOL_NATIVE, SYMBOL_TOKEN } from '../../utils/enum.js';
import { writeToFileWithCreateFolder } from '../../utils/index.js';
import { adjacentDumbersDivByFour } from '../../utils/number.js';
import { sleep } from '../../utils/utils.js';
import { getMultiBalancesByContrat } from '../handlers/assetsRecovery.js';
import WalletModel from '../models/Wallet.js';
import WalletExecuteDexModel from '../models/WalletExecuteDex.js';
import WalletSkimModel from '../models/WalletSkim.js';

export const reportCommon = async ({ chainId, isDex = false, indexWallets }) => {
  try {
    const infoTokenLcr = getMapToken(chainId, SYMBOL_TOKEN.LCR);
    if (!infoTokenLcr) throw { error: `Token ${SYMBOL_TOKEN.LCR} not supported` };

    const infoTokenUsdt = getMapToken(chainId, SYMBOL_TOKEN.USDT);
    if (!infoTokenUsdt) throw { error: `Token ${SYMBOL_TOKEN.USDT} not supported` };

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

    let listIndex = [];
    const chain_id = chainId;

    if (isDex) {
      const listAdjacentNumbers = indexWallets?.map(index => adjacentDumbersDivByFour(index));
      const listIndex1 = listAdjacentNumbers?.map(a => a[0]);
      const filter = indexWallets ? { chain_id: chainId, index_1: { $in: listIndex1 } } : { chain_id: chainId };
      const walletsDex = await WalletExecuteDexModel.find(filter);
      listIndex = walletsDex.map(w => [w.index_1, w.index_2, w.index_3, w.index_4]).flat(1);
    } else {
      const filter = indexWallets ? { chain_id: chainId, index: { $in: indexWallets } } : { chain_id: chainId };
      const walletsDex = await WalletModel.find(filter);
      listIndex = walletsDex.map(w => w.index);
    }

    const wallets = await WalletSkimModel.find({ chain_id, index: { $in: listIndex } });

    const total = wallets.length;

    console.log(`Total Wallets: ${total}`);

    let listSubWallets = [];
    for (let i = 0; i < total; i += 1000) {
      const subListWallets = wallets.slice(i, i + 1000);
      listSubWallets.push(subListWallets);
    }

    let results = await Promise.all(
      listSubWallets.map(async (subWallets, i) => {
        await sleep(i * 100);
        console.log(`GetBalancesByContract: ${i}/${listSubWallets.length - 1}`);
        const subListAddress = subWallets.map(w => w.address.toLowerCase());

        const infoBalances = await getMultiBalancesByContrat(chainId, subListAddress, listTokens);
        if (!infoBalances.status) throw infoBalances.error;

        let mapWallets = new Map();
        subWallets.forEach(async wallet => {
          mapWallets.set(wallet?.address?.toLowerCase(), wallet);
        });

        const balances = Object.keys(infoBalances.balances).map(address => {
          const infoWallet = mapWallets.get(address?.toLowerCase());
          let infoBalance = {
            index: infoWallet?.index,
            address: address.toLowerCase(),
            holding_amount: infoWallet?.holding_amount ? parseFloat(infoWallet?.holding_amount) : 0,
          };
          return { ...infoBalance, ...infoBalances.balances[address.toLowerCase()] };
        });

        return balances;
      }),
    );

    let listBalancesOnChain = [];
    results.map(result => {
      listBalancesOnChain = listBalancesOnChain.concat(Object.values(result));
    });

    return listBalancesOnChain;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const reportBalancesAllWallets = async ({ chainId, isDex = false }) => {
  try {
    let listBalancesOnChain = await reportCommon({ chainId, isDex });
    listBalancesOnChain = listBalancesOnChain ? listBalancesOnChain : [];

    writeToFileWithCreateFolder(
      'data/balance/',
      'balanceWalletsSortBNB.json',
      listBalancesOnChain.sort(
        (a, b) => b[SYMBOL_NATIVE[chainId].toLowerCase()] - a[SYMBOL_NATIVE[chainId].toLowerCase()],
      ),
    );
    writeToFileWithCreateFolder(
      'data/balance/',
      'balanceWalletsSortUSDT.json',
      listBalancesOnChain.sort((a, b) => b.usdt - a.usdt),
    );
    writeToFileWithCreateFolder(
      'data/balance/',
      'balanceWalletsSortLCR.json',
      listBalancesOnChain.sort((a, b) => b.lcr - a.lcr),
    );

    const walletsHaveBalances = listBalancesOnChain
      .sort((a, b) => b.usdt - a.usdt)
      .filter(
        item =>
          item[SYMBOL_NATIVE[chainId].toLowerCase()] > MIN_AMOUNT_BNB_RECOVERY[chainId] ||
          item.usdt > MIN_AMOUNT_USDT_RECOVERY ||
          parseFloat(item.lcr) - parseFloat(item.holding_amount) > MIN_AMOUNT_LCR_RECOVERY,
      );

    const objectSave = {
      type: 'All',
      chainId,
      length: walletsHaveBalances.length,
      walletsHaveBalances: walletsHaveBalances,
    };
    writeToFileWithCreateFolder('data/balance/', 'walletsHaveBalancesAll.json', objectSave);

    return {
      status: true,
      error: null,
      listBalancesOnChain,
      walletsHaveBalances,
    };
  } catch (error) {
    return {
      status: false,
      error,
      listBalancesOnChain: [],
      walletsHaveBalances: [],
    };
  }
};

export const reportBalancesAllWalletsHaveMoney = async ({ chainId, isDex = false }) => {
  try {
    let listBalancesOnChain = await reportCommon({ chainId, isDex });
    listBalancesOnChain = listBalancesOnChain ? listBalancesOnChain : [];

    const walletsHaveBalances = listBalancesOnChain
      .sort((a, b) => b.usdt - a.usdt)
      .filter(
        item =>
          item[SYMBOL_NATIVE[chainId].toLowerCase()] > MIN_AMOUNT_BNB_RECOVERY[chainId] ||
          item.usdt > MIN_AMOUNT_USDT_RECOVERY ||
          parseFloat(item.lcr) - parseFloat(item.holding_amount) > MIN_AMOUNT_LCR_RECOVERY,
      );

    return {
      status: true,
      error: null,
      listBalancesOnChain,
      walletsHaveBalances,
    };
  } catch (error) {
    return {
      status: false,
      error,
      listBalancesOnChain: [],
      walletsHaveBalances: [],
    };
  }
};

export const reportBalancesWallets = async ({ chainId, isDex = false, indexWallets }) => {
  try {
    let listBalancesOnChain = await reportCommon({ chainId, isDex, indexWallets });
    listBalancesOnChain = listBalancesOnChain ? listBalancesOnChain : [];

    const walletsHaveBalances = listBalancesOnChain
      .sort((a, b) => b.usdt - a.usdt)
      .filter(
        item =>
          item[SYMBOL_NATIVE[chainId].toLowerCase()] > MIN_AMOUNT_BNB_RECOVERY[chainId] ||
          item.usdt > MIN_AMOUNT_USDT_RECOVERY ||
          parseFloat(item.lcr) - parseFloat(item.holding_amount) > MIN_AMOUNT_LCR_RECOVERY,
      );

    return {
      status: true,
      error: null,
      listBalancesOnChain,
      walletsHaveBalances,
    };
  } catch (error) {
    return {
      status: false,
      error,
      listBalancesOnChain: [],
      walletsHaveBalances: [],
    };
  }
};

export const reportBalancesWalletsDex = async ({ chainId, indexWallets }) => {
  try {
    const infoTokenLcr = getMapToken(chainId, SYMBOL_TOKEN.LCR);
    if (!infoTokenLcr) throw { error: `Token ${SYMBOL_TOKEN.LCR} not supported` };

    const infoTokenUsdt = getMapToken(chainId, SYMBOL_TOKEN.USDT);
    if (!infoTokenUsdt) throw { error: `Token ${SYMBOL_TOKEN.USDT} not supported` };

    const listTokens = [
      { address: infoTokenLcr.address, symbol: SYMBOL_TOKEN.LCR },
      { address: infoTokenUsdt.address, symbol: SYMBOL_TOKEN.USDT },
    ];

    const chain_id = chainId;
    const wallets = await WalletSkimModel.find({ chain_id, index: { $in: indexWallets } });

    const listAddress = wallets.map(w => w.address.toLowerCase());

    const infoBalances = await getMultiBalancesByContrat(chainId, listAddress, listTokens);
    if (!infoBalances.status) throw infoBalances.error;

    let mapWallets = new Map();
    wallets.forEach(async wallet => {
      mapWallets.set(wallet?.address?.toLowerCase(), wallet);
    });

    const balancesAll = Object.keys(infoBalances.balances).map(address => {
      const infoWallet = mapWallets.get(address?.toLowerCase());
      let dataWallet = {
        index: infoWallet?.index,
        address: address.toLowerCase(),
        holding_amount: infoWallet?.holding_amount ? parseFloat(infoWallet?.holding_amount) : 0,
      };
      const mapBalanceWallet = infoBalances.balances[address.toLowerCase()];
      return {
        ...dataWallet,
        ...Object.keys(mapBalanceWallet).reduce((a, k) => {
          a[k] = parseFloat(mapBalanceWallet[k]);
          return a;
        }, {}),
      };
    });

    const availableBalances = balancesAll.map(balance => ({
      ...balance,
      lcr: balance.lcr > balance.holding_amount ? balance.lcr - balance.holding_amount : 0,
    }));

    const mapAvailableBalances = Object.fromEntries(new Map(availableBalances.map(o => [o.index, o])));

    return {
      status: true,
      error: null,
      availableBalances,
      mapAvailableBalances,
    };
  } catch (error) {
    return {
      status: false,
      error,
      availableBalances: [],
      mapAvailableBalances: new Map(),
    };
  }
};
