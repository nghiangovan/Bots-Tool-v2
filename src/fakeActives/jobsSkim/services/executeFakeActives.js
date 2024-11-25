import { ethers } from 'ethers';
import { ABIS } from '../../../../configs/ABIs.js';
import Native from '../../../../modules/wallet/transfer/Native.js';
import { getProvider } from '../../../../utils/blockchain.js';
import { NAME_JOB, SYMBOL_NATIVE, TYPE_WALLET } from '../../../../utils/enum.js';
import { getAddressFromMapJson } from '../../../../utils/file.js';
import { weiToEther } from '../../../../utils/format.js';
import { sleep } from '../../../../utils/utils.js';
import {
  awaitTransaction,
  getCurrentIndexWalletSourceSkim,
  getWalletSkimByIndexOffChain,
  getWalletSourceSkimByIndexOffChain,
} from '../../../handlers/common.js';
import { getCacheGasPrice } from '../../../handlers/functions.js';
import { logs } from '../../../models/Log.js';
import WalletSourceModel from '../../../models/WalletSource.js';

export const executeFakeActives = async ({ job }) => {
  try {
    const { date, chain_id, index } = job.attrs.data;

    const provider = await getProvider(chain_id);
    const addressPair = getAddressFromMapJson(chain_id, 'LCRPair');
    if (!addressPair) throw { error: 'LCRPair address must exists' };
    const chainId = chain_id;
    const indexWalletSource = await getCurrentIndexWalletSourceSkim({ chainId });
    const walletSourceOffChain = getWalletSourceSkimByIndexOffChain({ indexWallet: indexWalletSource });
    const walletOffChain = getWalletSkimByIndexOffChain({ indexWallet: index });

    const wallet = walletOffChain.connect(provider);
    const instancePair = new ethers.Contract(addressPair, ABIS.BLCRPair, wallet);

    const gasLimit = await instancePair.estimateGas.skim(wallet.address);
    let gasPrice = await provider.getGasPrice();
    if (chain_id.toString() === '42220') gasPrice = await getCacheGasPrice({ chainId, gasPriceOnChain: gasPrice });

    // const buffGasPrice = parseUnits(BUFF_GAS_PRICE_SKIM?.toString(), 'gwei');
    // const gasPriceBuffed = (await provider.getGasPrice()).add(buffGasPrice);
    const gasPriceBuffed = gasPrice;

    const gasFeeSkim = gasLimit.mul(gasPriceBuffed);
    const balanceWallet = await provider.getBalance(wallet.address);

    // Check balance enough fee for call function skim()
    if (balanceWallet.lt(gasFeeSkim)) {
      let count = 0;
      while (count < 100) {
        const infoSourceWallet = await WalletSourceModel.findOne({
          chain_id,
          address: { $regex: new RegExp('^' + walletSourceOffChain.address.toLowerCase(), 'i') },
        });
        if (!infoSourceWallet || !infoSourceWallet.tx_hash_recent) break;
        const receipt = await provider.getTransactionReceipt(infoSourceWallet.tx_hash_recent);
        if (receipt) break;
        await sleep(1000);
        count++;
      }

      // Buff fee gas
      let native = new Native({ chainId: chain_id });
      let txBuffGas = await native.transfer({
        privateKey: walletSourceOffChain.privateKey,
        receiver: wallet.address,
        amount: weiToEther(gasFeeSkim),
        typeWallet: TYPE_WALLET.skim_source,
      });

      await WalletSourceModel.findOneAndUpdate(
        {
          chain_id,
          address: { $regex: new RegExp('^' + walletSourceOffChain.address.toLowerCase(), 'i') },
        },
        { tx_hash_recent: txBuffGas.data.txHash },
        { new: true, upsert: true },
      );

      await logs({
        chain_id,
        type: NAME_JOB.onChain.buff_gas_fee_fake_actives,
        status: true,
        wallet_address_1: walletSourceOffChain.address,
        wallet_address_2: wallet.address,
        index_wallet_1: indexWalletSource,
        index_wallet_2: index,
        token_in: SYMBOL_NATIVE[chain_id],
        token_out: SYMBOL_NATIVE[chain_id],
        amount: weiToEther(gasFeeSkim),
        amount_fee: 0,
        date,
        gas_fee: txBuffGas?.data?.gasFee,
        tx_hash: txBuffGas?.data?.txHash,
        descriptions: 'Buff gas fee for fake actives',
      });
    }

    // Execute call function skim()

    let txSkim = await instancePair.skim(wallet.address, { gasLimit, gasPrice: gasPriceBuffed });

    const gasFee = await awaitTransaction({ chainId, txHash: txSkim.hash });

    await logs({
      chain_id,
      type: job.attrs.name,
      status: true,
      wallet_address_1: wallet.address,
      wallet_address_2: addressPair,
      index_wallet_1: index,
      index_wallet_2: null,
      amount: 0,
      amount_fee: 0,
      date,
      gas_fee: gasFee,
      tx_hash: txSkim?.hash,
      descriptions: 'Fake actives',
    });

    return { status: true, error: null };
  } catch (error) {
    console.log(error);
    return { status: false, error };
  }
};
