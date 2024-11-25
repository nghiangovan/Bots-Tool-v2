/* eslint-disable no-undef */
import { ethers } from 'ethers';
import { ABIS } from '../../../configs/ABIs.js';
import { getMapToken } from '../../../configs/addresses.js';
import { getProvider } from '../../../utils/blockchain.js';
import { SYMBOL_TOKEN } from '../../../utils/enum.js';
import { getDataByFile, writeNewToFile } from '../../../utils/file.js';

const MNEMONIC_ROOT_SKIM = '';

const main = async () => {
  const chainId = 56;

  const { index_from, current, target, total_holders } = getDataByFile('data/count_holders_skim_old.json');

  let holders = total_holders;

  const start_index = index_from == current ? index_from : current;

  if (start_index > target) return process.exit(0);

  for (let index = start_index; index < target; index++) {
    const wallet = ethers.Wallet.fromMnemonic(MNEMONIC_ROOT_SKIM, `m/44'/60'/0'/0/${index}`);
    const address = wallet.address;
    const resBalance = await getBalanceOnChainToken({ chainId, symbolToken: SYMBOL_TOKEN.LCR, address });

    if (resBalance > 0) {
      holders++;
    }

    writeNewToFile('data/count_holders_skim_old.json', {
      index_from,
      target,
      current: index,
      total_holders: holders,
    });

    console.log(`Index: ${index} - Address: ${address} - Balance: ${resBalance} - total_holders: ${holders}`);
  }
  console.log('Total holders: ', total_holders);
  return process.exit(0);
};

export const getBalanceOnChainToken = async ({ chainId, symbolToken, address }) => {
  const token = getMapToken(chainId, symbolToken);
  if (!token) throw { error: `Token ${symbolToken} not supported` };
  const addressToken = token.address;
  const provider = await getProvider(chainId);

  const erc20 = new ethers.Contract(addressToken, ABIS.ERC20, provider);
  const balance = await erc20.balanceOf(address);
  return parseFloat(ethers.utils.formatEther(balance));
};

main();
