/* eslint-disable no-undef */
import { connectMongoDB } from '../../../database/conection.js';
import { getDatasByFile, writeToFileWithCreateFolder } from '../../../utils/index.js';
import { sleep } from '../../../utils/utils.js';
import { assetsRecoveryToSource } from '../../handlers/assetsRecovery.js';

const main = async () => {
  connectMongoDB();
  let chainId = 42220;
  // let chainId = 56;
  const allWallets = getDatasByFile('data/balance/walletsHaveBalancesAll.json');
  const total = allWallets.walletsHaveBalances.length;
  let listSubWallets = [];
  console.log(`Total: ${total}`);
  for (let i = 0; i < total; i += 10) {
    const subListWallets = allWallets.walletsHaveBalances.slice(i, i + 10);
    listSubWallets.push(subListWallets);
  }
  await Promise.all(
    listSubWallets.map(async (subWallets, index) => {
      await sleep(index * 5000);
      const count = index * subWallets.length;
      console.log(`Index: [${count} -> ${count + subWallets.length - 1}]/${total - 1}`);
      const list_index_wallets = subWallets.map(a => a.index);
      await assetsRecoveryToSource({
        chainId,
        indexWallets: list_index_wallets,
        scheduleId: 'All',
        isFreeCoin: chainId == 42220 ? true : false,
      });

      const walletsHaveBalancesOld = await getDatasByFile('data/balance/walletsHaveBalancesAll.json');
      const remainWallets = walletsHaveBalancesOld.walletsHaveBalances.filter(
        w => !list_index_wallets.includes(w.index),
      );
      const objSave = { ...walletsHaveBalancesOld, walletsHaveBalances: remainWallets, length: remainWallets.length };
      writeToFileWithCreateFolder('data/balance/', 'walletsHaveBalancesAll.json', objSave);
      console.log(`Index: [${count} -> ${count + subWallets.length - 1}]/${total - 1} Done!`);
    }),
  );
  console.log('Done All!');
  return process.exit(0);
};
main();
