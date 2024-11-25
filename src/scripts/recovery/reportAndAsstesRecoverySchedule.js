/* eslint-disable no-undef */
import { connectMongoDB } from '../../../database/conection.js';
import { getDatasByFile, writeToFileWithCreateFolder } from '../../../utils/index.js';
import { sleep } from '../../../utils/utils.js';
import { assetsRecoveryToSource } from '../../handlers/assetsRecovery.js';
import ExecuteTemplateModel from '../../models/ExecuteTemplate.js';
import { saveWalletsByIndexes } from '../../models/Wallet.js';
import { reportBalancesWallets } from '../../reports/reportsBalancesWallets.js';

const main = async () => {
  connectMongoDB();
  const chainId = 56;
  let is_repeat = true;
  let schedule_id = '64fc39d07f86116866edd45b';

  const executes = await ExecuteTemplateModel.find({
    chain_id: chainId,
    schedule_id: schedule_id,
  });

  let allIndexWallets = (await Promise.all(executes.map(execute => execute.index_wallets))).flat(1);
  console.log(`Start Reporting...`);
  const report = await reportBalancesWallets({ chainId, indexWallets: allIndexWallets });
  const objectSave = {
    chainId,
    isRepeat: is_repeat,
    scheduleId: schedule_id,
    walletsHaveBalances: report.walletsHaveBalances,
  };
  writeToFileWithCreateFolder('data/balance/', 'walletsHaveBalancesSchedule.json', objectSave);
  console.log('Report Done!');

  const balancesSchedule = await getDatasByFile('data/balance/walletsHaveBalancesSchedule.json');
  const walletsHaveBalances = balancesSchedule.walletsHaveBalances;
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
        scheduleId: balancesSchedule.scheduleId,
      });
      const balancesScheduleOld = await getDatasByFile('data/balance/walletsHaveBalancesSchedule.json');
      const remainWallets = balancesScheduleOld.walletsHaveBalances.filter(w => !list_index_wallets.includes(w.index));
      const objSave = { ...balancesScheduleOld, walletsHaveBalances: remainWallets, length: remainWallets.length };
      writeToFileWithCreateFolder('data/balance/', 'walletsHaveBalancesSchedule.json', objSave);
      console.log(`Index: [${count} -> ${count + subWallets.length - 1}]/${total - 1} Done!`);
    }),
  );
  await saveWalletsByIndexes({ chainId, indexWallets: allIndexWallets, is_using: false });
  console.log('Assets Recovery Done All!');
  return process.exit(0);
};
main();
