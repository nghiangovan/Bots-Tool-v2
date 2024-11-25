import { BigNumber } from 'ethers';
import moment from 'moment';
import Web3 from 'web3';
import { ABIS } from '../../configs/ABIs.js';
import { getProvider } from '../../utils/blockchain.js';
import { getAddressFromMapJson } from '../../utils/file.js';
import { arrayRange } from '../../utils/index.js';
import { FORMAT_DATE } from '../../utils/time.js';
import {
  getGasPriceDynamic,
  getWalletByIndexOffChain,
  getWalletSourceSkimByIndexOffChain,
} from '../handlers/common.js';

export const manualCollectPoint = async ({ chainId }) => {
  try {
    const provider = await getProvider(chainId);
    const providerWeb3Socket = new Web3.providers.WebsocketProvider(provider?.connection?.url);
    const web3 = new Web3(providerWeb3Socket);
    const indexWalletSource = 0;
    const walletSource = getWalletSourceSkimByIndexOffChain({ indexWallet: indexWalletSource });
    const from_index = 0;
    const to_index = 99;

    const addressPoint = getAddressFromMapJson(chainId, 'POINT');
    const multiTransferAddress = getAddressFromMapJson(chainId, 'MultiTransfer');
    if (!addressPoint || !multiTransferAddress) throw { error: 'Point address and MultiTransfer address must exists' };

    const instancePoint = new web3.eth.Contract(ABIS.PointABI, addressPoint);
    const instanceMultiTransfer = new web3.eth.Contract(ABIS.MultiTransferABI, multiTransferAddress);

    const date = moment().format(FORMAT_DATE);
    let batch_number = Date.parse(date);

    const gasCollectPoint = await instancePoint.methods.collectPoint(batch_number).estimateGas();
    const gasPriceBuffed = await getGasPriceDynamic({ chainId, provider });
    const gasFeeCollectPoint = BigNumber.from(gasPriceBuffed).mul(BigNumber.from(gasCollectPoint));

    let mapAddressIndex = new Map();
    arrayRange({ start: from_index, stop: to_index, step: 1 }).forEach(async index => {
      let wallet = getWalletByIndexOffChain({ indexWallet: index });
      mapAddressIndex.set(wallet?.address?.toLowerCase(), index);
    });

    const listAddresses = [...mapAddressIndex.keys()];
    const amounts = arrayRange({ start: from_index, stop: to_index, step: 1 }).fill(gasFeeCollectPoint?.toString());

    const gasTransfer = await instanceMultiTransfer.methods
      .transferBatchEther(listAddresses, amounts)
      .estimateGas({
        from: walletSource.address,
        value: gasFeeCollectPoint.mul(to_index - from_index + 1)?.toString(),
      });
    let receiptTxTransferGasFee = await send({
      web3,
      privateKey: walletSource.privateKey,
      data: instanceMultiTransfer.methods.transferBatchEther(listAddresses, amounts).encodeABI(),
      gas: gasTransfer,
      gasPrice: gasPriceBuffed,
      from: walletSource.address,
      to: multiTransferAddress,
      value: gasFeeCollectPoint.mul(to_index - from_index + 1)?.toString(),
    });
    console.log(`Buff Gas txHash:`, receiptTxTransferGasFee?.transactionHash);

    for (let i = from_index; i <= to_index; i++) {
      const wallet = getWalletByIndexOffChain({ indexWallet: i });
      let txSkim = await send({
        web3,
        privateKey: wallet.privateKey,
        data: instancePoint.methods.collectPoint(batch_number).encodeABI(),
        gas: gasCollectPoint,
        gasPrice: gasPriceBuffed,
        from: wallet.address,
        to: addressPoint,
        value: 0,
      });
      console.log(`-> Fake Actives [${i}] - [${wallet.address}] txHash:`, txSkim?.transactionHash);
    }

    return { status: true, error: null };
  } catch (error) {
    console.log(error);
    return { status: false, error };
  }
};

export async function send({ web3, privateKey, data, gas, gasPrice, from, to, value }) {
  const signed = await web3.eth.accounts.signTransaction(
    { data, from, to, gas: gas?.toString(), gasPrice: gasPrice?.toString(), value: value?.toString() },
    privateKey,
  );
  const receipt = await web3.eth.sendSignedTransaction(signed.rawTransaction);
  return receipt;
}

manualCollectPoint({ chainId: 56 });
