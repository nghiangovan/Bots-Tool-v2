import { getWalletByIndex, getWalletByIndexOffChain, getWalletSourceByIndexOffChain } from '../src/handlers/common.js';
import WalletModel from '../src/models/Wallet.js';

export const getIndexByWallet = ({ wallet }) => {
  return wallet?.mnemonic?.path?.split('/')?.pop();
};

export const getWalletByAddress = async ({ chainId, address, maxIndex }) => {
  let wallet = null;
  let index = null;

  let results = await Promise.all(
    [...Array(maxIndex + 1).keys()].map(async index => {
      let w = await getWalletByIndex({ chainId, indexWallet: index });
      if (w?.address.toLowerCase() == address.toLowerCase()) return index;
    }),
  );
  results = results.filter(index => index);
  if (results.length > 0) {
    index = results.pop();
    wallet = await getWalletByIndex({ chainId, indexWallet: index });
  }
  return { wallet, index };
};

export const getWalletByAddressOffChain = async ({ address, maxIndex }) => {
  let wallet = null;
  let index = null;

  let results = await Promise.all(
    [...Array(maxIndex + 1).keys()]
      .map(index => {
        let w = getWalletByIndexOffChain({ indexWallet: index });
        if (w?.address.toLowerCase() == address.toLowerCase()) return index;
      })
      .filter(index => !!index),
  );
  if (results.length > 0) {
    index = results.pop();
    wallet = getWalletByIndexOffChain({ indexWallet: index });
  }
  return { wallet, index };
};

export const getWalleSourcetByAddress = async ({ chainId, address, maxIndex }) => {
  let wallet = null;
  let index = null;

  let results = await Promise.all(
    [...Array(maxIndex + 1).keys()].map(async index => {
      let w = getWalletSourceByIndexOffChain({ chainId, indexWallet: index });
      if (w?.address.toLowerCase() == address.toLowerCase()) return index;
    }),
  );
  results = results.filter(index => index);
  if (results.length > 0) {
    index = results.pop();
    wallet = getWalletSourceByIndexOffChain({ chainId, indexWallet: index });
  }
  return { wallet, index };
};

export const queryWalletByAddressDatabase = async ({ chainId, address }) => {
  return await WalletModel.findOne({ chain_id: chainId, address });
};
