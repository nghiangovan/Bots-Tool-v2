import { SYMBOL_NATIVE } from '../utils/enum.js';

export const ADDRESSES = {
  1: {
    PANCAKE_ROUTER: '0xEfF92A263d31888d860bD50809A8D171709b7b1c',
  },
  56: {
    PANCAKE_ROUTER: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
  },
  97: {
    PANCAKE_ROUTER: '0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3',
  },
  42220: {
    PANCAKE_ROUTER: '0xE3D8bd6Aed4F159bc8000a9cD47CffDb95F96121',
  },
};

export const MAP_TOKEN = {
  1: {
    WRAPPED_NATIVE: {
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      symbol: 'WETH',
    },
    WETH: {
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      symbol: 'WETH',
    },
  },
  56: {
    BNB: {
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'BNB',
    },
    WBNB: {
      address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
      symbol: 'WBNB',
    },
    WRAPPED_NATIVE: {
      address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
      symbol: 'WBNB',
    },
    LCR: {
      address: '0xc1315db0aee1232e3f68396e62549cacda7016a8',
      symbol: 'LCR',
    },
    USDT: {
      address: '0x55d398326f99059fF775485246999027B3197955',
      symbol: 'USDT',
    },
  },
  97: {
    BNB: {
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'BNB',
    },
    WBNB: {
      address: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd',
      symbol: 'WBNB',
    },
    WRAPPED_NATIVE: {
      address: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd',
      symbol: 'WBNB',
    },
    LCR: {
      address: '0x06168006ae648545d47c0d75484fc3f47db662be',
      symbol: 'LCR',
    },
    USDT: {
      address: '0x675bd82c198f2af3304a3a62e18d8b32f9ea7b48',
      symbol: 'USDT',
    },
  },
  42220: {
    CELO: {
      address: '0x471EcE3750Da237f93B8E339c536989b8978a438',
      symbol: 'CELO',
    },
    WCELO: {
      address: '0x471EcE3750Da237f93B8E339c536989b8978a438',
      symbol: 'WCELO',
    },
    WRAPPED_NATIVE: {
      address: '0x471EcE3750Da237f93B8E339c536989b8978a438',
      symbol: 'WCELO',
    },
    LCR: {
      address: '0x9f896399af00292438bf4fbaCD657D408f53d6fc',
      symbol: 'LCR',
    },
    USDT: {
      address: '0x617f3112bf5397D0467D315cC709EF968D9ba546',
      symbol: 'USDT',
    },
  },
};

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
export const MAX_VALUE = '0xffffffffffffffffffffffffffffffffffffffff';

export const SPENDING_WALLET_PAID_COIN = {
  56: '0x3eefAd673e2E54940b2fcA9B1704B01Da2633d54',
  97: '0xC2643DB3b847BE2974c346B5a036dc9524562039',
};

export function getMapToken(chainId, symbol) {
  chainId = typeof chainId !== 'string' ? chainId?.toString() : chainId;
  symbol = typeof symbol !== 'string' ? symbol?.toString() : symbol;
  return MAP_TOKEN[chainId][symbol] ? MAP_TOKEN[chainId][symbol] : null;
}

export function getSymbolNative(chainId) {
  chainId = typeof chainId !== 'string' ? chainId?.toString() : chainId;
  return SYMBOL_NATIVE[chainId] ? SYMBOL_NATIVE[chainId] : null;
}

export function getAddresses(chainId) {
  chainId = typeof chainId !== 'string' ? chainId?.toString() : chainId;
  return ADDRESSES[chainId] ? ADDRESSES[chainId] : null;
}

export function getContractAddress(chainId, symbol) {
  chainId = typeof chainId !== 'string' ? chainId?.toString() : chainId;
  symbol = typeof symbol !== 'string' ? symbol?.toString() : symbol;
  const addresses = getAddresses(chainId);
  return addresses ? (addresses[symbol] ? addresses[symbol] : null) : null;
}
