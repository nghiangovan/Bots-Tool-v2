/* eslint-disable no-undef */
import { connectMongoDB } from '../../../database/conection.js';
import { getDatasByFile, writeToFileWithCreateFolder } from '../../../utils/index.js';
import { sleep } from '../../../utils/utils.js';
import { assetsRecoveryToSource } from '../../handlers/assetsRecovery.js';

const main = async () => {
  connectMongoDB();
  const chainId = 56;
  const schedule = await getDatasByFile('data/balance/walletsHaveBalancesSchedule.json');
  const walletsHaveBalances = schedule.walletsHaveBalances;
  const total = walletsHaveBalances.length ? walletsHaveBalances.length : 0;
  let listSubWallets = [];
  console.log(`Total: ${total}`);
  for (let i = 0; i < total; i += 10) {
    const subListWallets = walletsHaveBalances.slice(i, i + 10);
    listSubWallets.push(subListWallets);
  }
  await Promise.all(
    listSubWallets.map(async (subWallets, index) => {
      await sleep(index * 6000);
      const count = index * subWallets.length;
      console.log(`Index: [${count} -> ${count + subWallets.length - 1}]/${total - 1}`);
      const list_index_wallets = subWallets.map(a => a.index);
      await assetsRecoveryToSource({
        chainId,
        indexWallets: list_index_wallets,
        scheduleId: schedule.scheduleId,
      });
      const scheduleOld = await getDatasByFile('data/balance/walletsHaveBalancesSchedule.json');
      const remainWallets = scheduleOld.walletsHaveBalances.filter(w => !list_index_wallets.includes(w.index));
      const objSave = { ...scheduleOld, walletsHaveBalances: remainWallets, length: remainWallets.length };
      writeToFileWithCreateFolder('data/balance/', 'walletsHaveBalancesSchedule.json', objSave);
      console.log(`Index: [${count} -> ${count + subWallets.length - 1}]/${total - 1} Done!`);
    }),
  );
  console.log('Done All!');
  return process.exit(0);
};
main();
