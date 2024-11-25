import { ethers } from 'ethers';
import { CONSTANT } from '../../../configs/constant.js';
import {
  awaitTransaction,
  buffGasByGasLimitAndCheckBalance,
  getGasPriceDynamic,
  saveBalanceRecent,
} from '../../../src/handlers/common.js';
import { createInstanceAddress, getProvider } from '../../../utils/blockchain.js';
import WalletSourceModel from '../../../src/models/WalletSource.js';
export default class ERC721 {
  constructor({ chainId, nft }) {
    this.chainId = chainId;
    this.nft = nft;
    this.wallet = null;
  }

  async init() {
    this.provider = await getProvider(this.chainId);
    this.instance = await createInstanceAddress(this.chainId, CONSTANT.ERC721, this.nft, this.provider);
  }

  connectWallet({ privateKey }) {
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.instance = this.instance.connect(this.wallet);
  }

  async transfer({ privateKey, receiver, tokenId, typeWallet }) {
    if (!this.instance) await this.init();

    if (!this.wallet || privateKey !== this.wallet.privateKey) {
      this.connectWallet({ privateKey });
    }

    let owner = await this.instance.ownerOf(tokenId);

    // Get symbol token
    let symbolToken = await this.instance.symbol();

    // check if sender is owner of tokenId
    if (owner.toLowerCase() !== this.wallet.address.toLocaleLowerCase())
      throw `ERC721 Transfer Error - ${symbolToken}: [chainId: ${this.chainId}] Sender ${this.wallet.address} is not owner of tokenId ${tokenId}`;

    let gasLimit = await this.instance.estimateGas.transferFrom(this.wallet.address, receiver, tokenId);
    await buffGasByGasLimitAndCheckBalance({
      chainId: this.chainId,
      wallet: this.wallet,
      gasLimit,
      amountNative: 0,
    });

    const gasPrice = await getGasPriceDynamic({ chainId: this.chainId, provider: this.provider });

    let txTransfer = await this.instance.transferFrom(this.wallet.address, receiver, tokenId, { gasPrice });

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

    return {
      status: true,
      data: {
        chainId: this.chainId,
        tokenId,
        symbolToken,
        sender: this.wallet.address,
        receiver,
        txHash: txTransfer.hash,
        gasFee,
      },
    };
  }

  async approve({ privateKey, to, tokenId, typeWallet }) {
    if (!this.instance) await this.init();

    if (!this.wallet || privateKey !== this.wallet.privateKey) {
      this.connectWallet({ privateKey });
    }

    let owner = await this.instance.ownerOf(tokenId);

    // Get symbol token
    let symbolToken = await this.instance.symbol();

    // check if sender is owner of tokenId
    if (owner.toLowerCase() !== this.wallet.address.toLocaleLowerCase())
      throw `ERC721 Approve ERROR - ${symbolToken}: [chainId: ${this.chainId}] Approver ${this.wallet.address} is not owner of tokenId ${tokenId}`;

    // check if to is owner of tokenId
    if (owner.toLowerCase() === to.toLocaleLowerCase())
      throw `ERC721 Approve ERROR - ${symbolToken}: [chainId: ${this.chainId}] Approval ${tokenId} to current owner ${this.wallet.address}`;

    let gasLimit = await this.instance.estimateGas.approve(to, tokenId);
    await buffGasByGasLimitAndCheckBalance({
      chainId: this.chainId,
      wallet: this.wallet,
      gasLimit,
      amountNative: 0,
    });

    const gasPrice = await getGasPriceDynamic({ chainId: this.chainId, provider: this.provider });

    let txApprove = await this.instance.approve(to, tokenId, { gasPrice });

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
        tokenId,
        symbolToken,
        sender: this.wallet.address,
        to,
        txHash: txApprove.hash,
        gasFee,
      },
    };
  }

  async approvalForAll({ privateKey, operator, approved, typeWallet }) {
    if (!this.instance) await this.init();

    if (!this.wallet || privateKey !== this.wallet.privateKey) {
      this.connectWallet({ privateKey });
    }

    // Get symbol token
    let symbolToken = await this.instance.symbol();

    const gasPrice = await getGasPriceDynamic({ chainId: this.chainId, provider: this.provider });

    let txApprove = await this.instance.setApprovalForAll(operator, approved, { gasPrice });

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
        approved,
        symbolToken,
        sender: this.wallet.address,
        operator,
        txHash: txApprove.hash,
        gasFee,
      },
    };
  }
}
