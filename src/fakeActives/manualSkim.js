import { ethers } from 'ethers';
import { parseUnits } from 'ethers/lib/utils.js';
import { ABIS } from '../../configs/ABIs.js';
import { getProvider } from '../../utils/blockchain.js';
import { BUFF_GAS_PRICE_SKIM } from '../../utils/constant.js';
import { getAddressFromMapJson } from '../../utils/file.js';
import { arrayRange } from '../../utils/index.js';
import { randomIntBetween } from '../../utils/random.js';
import { sleep } from '../../utils/utils.js';
import { getWalletByIndexOffChain, getWalletSourceSkimByIndexOffChain } from '../handlers/common.js';

export const manualSkim = async ({ chainId }) => {
  try {
    const provider = await getProvider(chainId);
    const indexWalletSource = 0;
    const walletSource = getWalletSourceSkimByIndexOffChain({ indexWallet: indexWalletSource }).connect(provider);
    const from_index = 21159;
    const to_index = 27235;

    const addressPair = '0x10877eb0eDD0fe548fE376A9095A9c59D2B1Ac8D'; // Pair  LCR/USDT
    const multiTransferAddress = getAddressFromMapJson(chainId, 'MultiTransfer');
    if (!addressPair || !multiTransferAddress) throw { error: 'Pair address and MultiTransfer address must exists' };

    const instancePair = new ethers.Contract(addressPair, ABIS.BLCRPair, walletSource);
    const instanceMultiTransfer = new ethers.Contract(multiTransferAddress, ABIS.MultiTransferABI, walletSource);

    const gasLimitSkim = await instancePair.estimateGas.skim(walletSource.address);
    const buffGasPrice = parseUnits(BUFF_GAS_PRICE_SKIM?.toString(), 'gwei');
    const gasPriceBuffed = (await provider.getGasPrice()).add(buffGasPrice);
    const gasFeeSkim = gasPriceBuffed.mul(gasLimitSkim);

    let mapAddressIndex = new Map();
    arrayRange({ start: from_index, stop: to_index, step: 1 }).forEach(async index => {
      let wallet = getWalletByIndexOffChain({ indexWallet: index });
      mapAddressIndex.set(wallet?.address?.toLowerCase(), index);
    });

    const listAddresses = [...mapAddressIndex.keys()];
    const amounts = arrayRange({ start: from_index, stop: to_index, step: 1 }).fill(gasFeeSkim?.toString());

    const receiptTxTransferGasFee = await instanceMultiTransfer.transferBatchEther(listAddresses, amounts, {
      from: walletSource.address,
      value: gasFeeSkim.mul(to_index - from_index + 1)?.toString(),
    });

    console.log(`Buff Gas txHash:`, receiptTxTransferGasFee?.hash);

    for (let i = from_index; i <= to_index; i++) {
      let walletOffChain = getWalletByIndexOffChain({ indexWallet: i });
      const wallet = walletOffChain.connect(provider);
      let txSkim = await instancePair.skim(wallet.address);
      console.log(`-> Fake Actives [${i}] - [${wallet.address}] txHash:`, txSkim?.hash);
      let randomTime = randomIntBetween(3, 8);
      let time = randomTime * 60000;
      await sleep(time);
    }

    return { status: true, error: null };
  } catch (error) {
    console.log(error);
    return { status: false, error };
  }
};

manualSkim({ chainId: 56 });
