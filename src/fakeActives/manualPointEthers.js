import { ethers } from 'ethers';
import { parseUnits } from 'ethers/lib/utils.js';
import moment from 'moment';
import { ABIS } from '../../configs/ABIs.js';
import { getProvider } from '../../utils/blockchain.js';
import { BUFF_GAS_PRICE_SKIM } from '../../utils/constant.js';
import { getAddressFromMapJson } from '../../utils/file.js';
import { arrayRange } from '../../utils/index.js';
import { randomIntBetween } from '../../utils/random.js';
import { FORMAT_DATE } from '../../utils/time.js';
import { sleep } from '../../utils/utils.js';
import { getWalletByIndexOffChain, getWalletSourceSkimByIndexOffChain } from '../handlers/common.js';

export const manualPointEthers = async ({ chainId }) => {
  try {
    const provider = await getProvider(chainId);
    const indexWalletSource = 0;
    const walletSource = getWalletSourceSkimByIndexOffChain({ indexWallet: indexWalletSource }).connect(provider);
    const from_index = 460;
    const to_index = 800;

    const addressPoint = getAddressFromMapJson(chainId, 'POINT');
    const multiTransferAddress = getAddressFromMapJson(chainId, 'MultiTransfer');
    if (!addressPoint || !multiTransferAddress) throw { error: 'Point address and MultiTransfer address must exists' };

    const instancePoint = new ethers.Contract(addressPoint, ABIS.PointABI, walletSource);
    const instanceMultiTransfer = new ethers.Contract(multiTransferAddress, ABIS.MultiTransferABI, walletSource);

    const date = moment().format(FORMAT_DATE);
    let batch_number = Date.parse(date);

    const gasLimitCollectPoint = await instancePoint.estimateGas.collectPoint(batch_number);
    const buffGasPrice = parseUnits(BUFF_GAS_PRICE_SKIM?.toString(), 'gwei');
    const gasPriceBuffed = (await provider.getGasPrice()).add(buffGasPrice);
    const gasFeeCollectPoint = gasPriceBuffed.mul(gasLimitCollectPoint);

    let mapAddressIndex = new Map();
    arrayRange({ start: from_index, stop: to_index, step: 1 }).forEach(async index => {
      let wallet = getWalletByIndexOffChain({ indexWallet: index });
      mapAddressIndex.set(wallet?.address?.toLowerCase(), index);
    });

    const listAddresses = [...mapAddressIndex.keys()];
    const amounts = arrayRange({ start: from_index, stop: to_index, step: 1 }).fill(gasFeeCollectPoint?.toString());

    const receiptTxTransferGasFee = await instanceMultiTransfer.transferBatchEther(listAddresses, amounts, {
      from: walletSource.address,
      value: gasFeeCollectPoint.mul(to_index - from_index + 1)?.toString(),
    });

    console.log(`Buff Gas txHash:`, receiptTxTransferGasFee?.hash);

    for (let i = from_index; i <= to_index; i++) {
      let walletOffChain = getWalletByIndexOffChain({ indexWallet: i });
      const wallet = walletOffChain.connect(provider);
      let txCollectPoint = await instancePoint.collectPoint(wallet.address);
      console.log(`-> Fake Actives Point [${i}] - [${wallet.address}] txHash:`, txCollectPoint?.hash);
      let randomTime = randomIntBetween(3, 8);
      let time = randomTime * 100;
      await sleep(time);
    }

    return { status: true, error: null };
  } catch (error) {
    console.log(error);
    return { status: false, error };
  }
};

manualPointEthers({ chainId: 42220 });
