import { ethers } from 'ethers';
import { getMapToken, ZERO_ADDRESS } from '../../../configs/addresses.js';
import { createInstance, createInstanceAddress, getProvider } from '../../../utils/blockchain.js';
import { swapNativeToToken, swapTokenToNative, swapTokenToToken } from '../../wallet/swap/swapDexForUniV2.js';
import { SYMBOL_ADDRESS, SYMBOL_TOKEN, SYMBOL_ABI } from '../../../utils/enum.js';

export default class PancakeSwap {
  constructor({ chainId }) {
    // Check if wrap native token is supported
    const wrappedNative = getMapToken(chainId, SYMBOL_TOKEN.WRAPPED_NATIVE);
    if (!wrappedNative)
      throw {
        error: `Swap PANCAKE Error: Native token chainId ${chainId} is not supported yet`,
      };
    let addressWrappedNative = wrappedNative.address;

    this.chainId = chainId;
    this.addressWrappedNative = addressWrappedNative;
    this.wallet = null;
    this.factory = null;
  }

  connectWallet({ privateKey }) {
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.router = this.router.connect(this.wallet);
  }

  async setInstanceFactory() {
    this.provider = await getProvider(this.chainId);

    let router = await createInstance(this.chainId, SYMBOL_ABI.ROUTER_FORK_UNIV2, SYMBOL_ADDRESS.PANCAKE_ROUTER);

    if (!router)
      throw {
        error: `Swap PANCAKE Error: Contract instance chainId ${this.chainId} initialization error`,
      };

    this.router = router;

    let addressFactory = await this.router.factory();
    let factory = await createInstanceAddress(this.chainId, SYMBOL_ABI.FACTORY_FORK_UNIV2, addressFactory);
    this.factory = factory;
  }

  async swap({ privateKey, tokenIn, tokenOut, amountIn, typeWallet, slippage }) {
    if (!this.factory) await this.setInstanceFactory();

    if (!this.wallet || `0x${privateKey}` !== this.wallet.privateKey) {
      this.connectWallet({ privateKey });
    }

    if (tokenIn.toLowerCase() === ZERO_ADDRESS && tokenOut.toLowerCase() !== ZERO_ADDRESS) {
      return await swapNativeToToken({
        symbolDex: SYMBOL_ADDRESS.PANCAKE_ROUTER,
        chainId: this.chainId,
        wallet: this.wallet,
        router: this.router,
        factory: this.factory,
        tokenIn: this.addressWrappedNative,
        tokenOut,
        amountIn,
        typeWallet,
        slippage,
        provider: this.provider,
      });
    }

    if (tokenIn.toLowerCase() !== ZERO_ADDRESS && tokenOut.toLowerCase() === ZERO_ADDRESS) {
      return await swapTokenToNative({
        symbolDex: SYMBOL_ADDRESS.PANCAKE_ROUTER,
        chainId: this.chainId,
        wallet: this.wallet,
        router: this.router,
        factory: this.factory,
        tokenIn,
        tokenOut: this.addressWrappedNative,
        amountIn,
        typeWallet,
        slippage,
        provider: this.provider,
      });
    }

    if (tokenIn.toLowerCase() !== ZERO_ADDRESS && tokenOut.toLowerCase() !== ZERO_ADDRESS) {
      return await swapTokenToToken({
        symbolDex: SYMBOL_ADDRESS.PANCAKE_ROUTER,
        chainId: this.chainId,
        wallet: this.wallet,
        router: this.router,
        factory: this.factory,
        tokenIn,
        tokenOut,
        amountIn,
        typeWallet,
        slippage,
        provider: this.provider,
      });
    }
  }
}
