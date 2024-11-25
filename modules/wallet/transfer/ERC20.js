import { ethers } from 'ethers';
import {
  awaitTransaction,
  buffNativeHaveCheckMinBalance,
  getGasPriceDynamic,
  saveBalanceRecent,
} from '../../../src/handlers/common.js';
import { createInstanceAddress, getProvider } from '../../../utils/blockchain.js';
import { SYMBOL_ABI } from '../../../utils/enum.js';
import { etherToWeiUnit, weiToEther, weiToEtherUnit } from '../../../utils/format.js';
import WalletSourceModel from '../../../src/models/WalletSource.js';
import { MAX_VALUE } from '../../../configs/addresses.js';

export default class ERC20 {
  constructor({ chainId, token }) {
    this.token = token;
    this.chainId = chainId;
    this.wallet = null;
    this.decimals = null;
  }

  async init() {
    this.provider = await getProvider(this.chainId);
    this.instance = await createInstanceAddress(this.chainId, SYMBOL_ABI.ERC20, this.token, this.provider);
    this.decimals = await this.instance.decimals();
  }

  connectWallet({ privateKey }) {
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.instance = this.instance.connect(this.wallet);
  }

  async transfer({ privateKey, receiver, amount, typeWallet }) {
    if (!this.instance) await this.init();

    if (!this.wallet || privateKey !== this.wallet.privateKey) {
      this.connectWallet({ privateKey });
    }

    const amountWei = etherToWeiUnit(amount?.toString(), this.decimals);
    const balanceOfWei = await this.instance.balanceOf(this.wallet.address);

    // Get symbol token
    let symbolToken = await this.instance.symbol();

    // check balance is enough for transfer
    if (amountWei.gt(balanceOfWei))
      throw {
        error: `ERC20 Transfer Error - balance ${weiToEtherUnit(
          balanceOfWei,
          this.decimals,
        )} ${symbolToken}: [chainId: ${this.chainId}] Insufficient balance for transfer ${amount} - wallet ${
          this.wallet.address
        }`,
      };

    await buffNativeHaveCheckMinBalance({ chainId: this.chainId, wallet: this.wallet, amountNativeNeedSend: 0 });

    // let nonce = await this.wallet.getTransactionCount('pending');
    // nonce += 1;
    const gasPrice = await getGasPriceDynamic({ chainId: this.chainId, provider: this.provider });

    // Execute transer
    let txTransfer = await this.instance.transfer(receiver, amountWei, { gasPrice });

    await WalletSourceModel.findOneAndUpdate(
      {
        chain_id: this.chainId,
        address: { $regex: new RegExp('^' + this.wallet.address.toLowerCase(), 'i') },
      },
      { tx_hash_recent: txTransfer.hash },
    );

    await txTransfer.wait(1);

    const gasFee = await awaitTransaction({ chainId: this.chainId, txHash: txTransfer.hash });
    await saveBalanceRecent({ chainId: this.chainId, addressWallet: this.wallet.address, typeWallet });
    await saveBalanceRecent({ chainId: this.chainId, addressWallet: receiver, typeWallet });

    return {
      status: true,
      data: {
        chainId: this.chainId,
        amountIn: amount,
        amountOut: amount,
        symbolToken,
        sender: this.wallet.address,
        receiver,
        txHash: txTransfer.hash,
        gasFee,
      },
    };
  }

  async transferAll({ privateKey, receiver, typeWallet }) {
    if (!this.instance) await this.init();

    if (!this.wallet || privateKey !== this.wallet.privateKey) {
      this.connectWallet({ privateKey });
    }

    const balanceOfWei = await this.instance.balanceOf(this.wallet.address);

    // Get symbol token
    let symbolToken = await this.instance.symbol();

    await buffNativeHaveCheckMinBalance({ chainId: this.chainId, wallet: this.wallet, amountNativeNeedSend: 0 });

    const gasPrice = await getGasPriceDynamic({ chainId: this.chainId, provider: this.provider });

    // Execute transer
    let txTransfer = await this.instance.transfer(receiver, balanceOfWei, { gasPrice });

    await WalletSourceModel.findOneAndUpdate(
      {
        chain_id: this.chainId,
        address: { $regex: new RegExp('^' + this.wallet.address.toLowerCase(), 'i') },
      },
      { tx_hash_recent: txTransfer.hash },
    );

    await txTransfer.wait(1);

    const gasFee = await awaitTransaction({ chainId: this.chainId, txHash: txTransfer.hash });
    await saveBalanceRecent({ chainId: this.chainId, addressWallet: this.wallet.address, typeWallet });
    await saveBalanceRecent({ chainId: this.chainId, addressWallet: receiver, typeWallet });

    return {
      status: true,
      data: {
        chainId: this.chainId,
        amountIn: weiToEther(balanceOfWei),
        amountOut: weiToEther(balanceOfWei),
        symbolToken,
        sender: this.wallet.address,
        receiver,
        txHash: txTransfer.hash,
        gasFee,
      },
    };
  }

  async approve({ privateKey, spender, amount, typeWallet }) {
    if (!this.instance) await this.init();

    if (!this.wallet || privateKey !== this.wallet.privateKey) {
      this.connectWallet({ privateKey });
    }

    const amountWei = etherToWeiUnit(amount?.toString(), this.decimals);

    // Get symbol token
    let symbolToken = await this.instance.symbol();

    await buffNativeHaveCheckMinBalance({ chainId: this.chainId, wallet: this.wallet, amountNativeNeedSend: 0 });

    const gasPrice = await getGasPriceDynamic({ chainId: this.chainId, provider: this.provider });

    let txApprove = await this.instance.approve(spender, amountWei, { gasPrice });

    await WalletSourceModel.findOneAndUpdate(
      {
        chain_id: this.chainId,
        address: { $regex: new RegExp('^' + this.wallet.address.toLowerCase(), 'i') },
      },
      { tx_hash_recent: txApprove.hash },
    );

    await txApprove.wait(1);

    const gasFee = await awaitTransaction({ chainId: this.chainId, txHash: txApprove.hash });

    await saveBalanceRecent({ chainId: this.chainId, addressWallet: this.wallet.address, typeWallet });

    return {
      status: true,
      data: {
        chainId: this.chainId,
        amountIn: amount,
        amountOut: amount,
        symbolToken,
        sender: this.wallet.address,
        spender,
        txHash: txApprove.hash,
        gasFee,
      },
    };
  }

  async approveMax({ privateKey, spender, typeWallet }) {
    if (!this.instance) await this.init();

    if (!this.wallet || privateKey !== this.wallet.privateKey) {
      this.connectWallet({ privateKey });
    }

    // Get symbol token
    let symbolToken = await this.instance.symbol();

    await buffNativeHaveCheckMinBalance({ chainId: this.chainId, wallet: this.wallet, amountNativeNeedSend: 0 });

    const gasPrice = await getGasPriceDynamic({ chainId: this.chainId, provider: this.provider });

    let txApprove = await this.instance.approve(spender, MAX_VALUE, { gasPrice });

    await WalletSourceModel.findOneAndUpdate(
      {
        chain_id: this.chainId,
        address: { $regex: new RegExp('^' + this.wallet.address.toLowerCase(), 'i') },
      },
      { tx_hash_recent: txApprove.hash },
    );

    await txApprove.wait(1);

    const gasFee = await awaitTransaction({ chainId: this.chainId, txHash: txApprove.hash });

    await saveBalanceRecent({ chainId: this.chainId, addressWallet: this.wallet.address, typeWallet });

    return {
      status: true,
      data: {
        chainId: this.chainId,
        symbolToken,
        sender: this.wallet.address,
        spender,
        txHash: txApprove.hash,
        gasFee,
      },
    };
  }

  async balanceOf({ address }) {
    if (!this.instance) await this.init();
    return await this.instance.balanceOf(address);
  }

  async allowance({ owner, spender }) {
    if (!this.instance) await this.init();
    return await this.instance.allowance(owner, spender);
  }
}
