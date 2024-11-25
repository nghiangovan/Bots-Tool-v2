import mongoose from 'mongoose';
import { ZERO_ADDRESS, getMapToken } from '../../configs/addresses.js';
import { LIST_INDEX_WALLET_BALANCE_RATE } from '../../utils/constant.js';
import { SYMBOL_NATIVE, SYMBOL_TOKEN } from '../../utils/enum.js';
import { getMultiBalancesByContrat } from '../handlers/assetsRecovery.js';
import { getWalletBalanceRateByIndexOffChain } from '../handlers/common.js';
import WalletBalanceRateModel from '../models/WalletBalanceRate.js';

export const cacheBalanceWalletsBalanceRate = async ({ chainId }) => {
  try {
    const infoTokenLcr = getMapToken(chainId, SYMBOL_TOKEN.LCR);
    if (!infoTokenLcr) throw { error: `Token ${SYMBOL_TOKEN.LCR} not supported` };
    const infoTokenUsdt = getMapToken(chainId, SYMBOL_TOKEN.USDT);
    if (!infoTokenUsdt) throw { error: `Token ${SYMBOL_TOKEN.USDT} not supported` };

    let mapBalanceRateWallets = new Map();
    LIST_INDEX_WALLET_BALANCE_RATE.forEach(async index => {
      let wallet = getWalletBalanceRateByIndexOffChain({ indexWallet: index });
      mapBalanceRateWallets.set(wallet?.address?.toLowerCase(), index);
    });

    const listAddressBalanceRate = [...mapBalanceRateWallets.keys()];

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
    const infoBalances = await getMultiBalancesByContrat(chainId, listAddressBalanceRate, listTokens);
    if (!infoBalances.status) throw infoBalances.error;
    const balances = Object.keys(infoBalances.balances).map(address => {
      let infoBalance = { index: mapBalanceRateWallets.get(address.toLowerCase()), address: address.toLowerCase() };
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
        await WalletBalanceRateModel.findOneAndUpdate(
          { chain_id: chainId, index: data.index, asset: data.asset },
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
