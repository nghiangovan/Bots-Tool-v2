import { BigNumber, ethers } from 'ethers';
import { awaitTransaction, getGasPriceDynamic, saveBalanceRecent } from '../../../src/handlers/common.js';
import WalletSourceModel from '../../../src/models/WalletSource.js';
import { getProvider } from '../../../utils/blockchain.js';
import { SYMBOL_NATIVE } from '../../../utils/enum.js';
import { etherToWei, weiToEther } from '../../../utils/format.js';

export default class Native {
  constructor({ chainId }) {
    this.chainId = chainId;
    this.wallet = null;
  }

  async init() {
    this.provider = await getProvider(this.chainId);
  }

  connectWallet({ privateKey }) {
    this.wallet = new ethers.Wallet(privateKey, this.provider);
  }

  async transfer({ privateKey, receiver, amount, typeWallet }) {
    if (!this.provider) await this.init();

    if (!this.wallet || privateKey !== this.wallet.privateKey) {
      this.connectWallet({ privateKey });
    }

    const amountWei = etherToWei(amount?.toString());
    const balanceOfWei = await this.provider.getBalance(this.wallet.address);

    // check balance is enough for transfer
    if (amountWei.gt(balanceOfWei))
      throw {
        error: `Native Transfer Error - balance ${weiToEther(balanceOfWei)} ${SYMBOL_NATIVE[this.chainId]}: [chainId: ${
          this.chainId
        }] sender ${this.wallet.address} insufficient balance for transfer ${amount} to wallet ${receiver}`,
      };

    // let nonce = await this.wallet.getTransactionCount('pending');
    // nonce += 1;
    const gasPrice = await getGasPriceDynamic({ chainId: this.chainId, provider: this.provider });

    // Excute transer
    let txTransfer = await this.wallet.sendTransaction({
      to: receiver,
      value: etherToWei(amount?.toString()),
      gasPrice,
      // nonce,
    });

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
        symbolToken: SYMBOL_NATIVE[this.chainId],
        sender: this.wallet.address,
        receiver,
        txHash: txTransfer.hash,
        gasFee,
      },
    };
  }

  async transferAll({ privateKey, receiver, gasLimit = 21000, typeWallet }) {
    if (!this.provider) await this.init();

    if (!this.wallet || privateKey !== this.wallet.privateKey) {
      this.connectWallet({ privateKey });
    }
    gasLimit = BigNumber.from(gasLimit);
    let balance = await this.balanceOf({ address: this.wallet.address });
    const gasPrice = await getGasPriceDynamic({ chainId: this.chainId, provider: this.provider });
    let feeTx = gasLimit.mul(gasPrice);

    if (balance.lte(feeTx))
      throw {
        error: `Native Transfer All Error - balance ${weiToEther(balance)} ${SYMBOL_NATIVE[this.chainId]}: [chainId: ${
          this.chainId
        }] sender ${this.wallet.address} insufficient balance for gas fee transfer all to wallet ${receiver}`,
      };
    let amount = balance.sub(feeTx);

    // Excute transer
    let txTransfer = await this.wallet.sendTransaction({
      to: receiver,
      value: amount,
      gasLimit,
      gasPrice,
    });

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
        amountIn: weiToEther(amount?.toString()),
        amountOut: weiToEther(amount?.toString()),
        symbolToken: SYMBOL_NATIVE[this.chainId],
        sender: this.wallet.address,
        receiver,
        txHash: txTransfer.hash,
        gasFee,
      },
    };
  }

  async balanceOf({ address }) {
    if (!this.provider) await this.init();

    return await this.provider.getBalance(address);
  }
}
