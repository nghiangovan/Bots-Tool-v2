/* eslint-disable no-undef */
import { connectMongoDB } from '../../../database/conection.js';
import { getDatasByFile, writeToFileWithCreateFolder } from '../../../utils/index.js';
import { sleep } from '../../../utils/utils.js';
import { assetsRecoveryToSource } from '../../handlers/assetsRecovery.js';
import WalletModel from '../../models/Wallet.js';
import WalletExecuteDexModel from '../../models/WalletExecuteDex.js';
import { reportBalancesAllWalletsHaveMoney } from '../../reports/reportsBalancesWallets.js';

export const assetsRecoveryCommon = async ({ isDex = false } = {}) => {
  connectMongoDB();
  console.log(`Start Reporting...`);
  const chainId = 56;
  const is_using = false;
  const chain_id = chainId.toString();
  const report = await reportBalancesAllWalletsHaveMoney({ chainId, isDex });
  const objectSave = {
    type: 'All',
    chainId,
    length: report.walletsHaveBalances.length,
    walletsHaveBalances: report.walletsHaveBalances,
  };
  console.log('total have money: ', report.walletsHaveBalances.length);
  writeToFileWithCreateFolder('data/balance/', 'walletsHaveBalancesAll.json', objectSave);
  console.log('Report Done !');
  if (isDex) {
    await WalletExecuteDexModel.updateMany({ chain_id }, { is_using });
    console.log('Update All Wallets `is_using` Done !');
  } else {
    await WalletModel.updateMany({ chain_id }, { is_using });
    console.log('Update All Wallets `is_using` Done !');
  }

  const walletsHaveBalances = getDatasByFile('data/balance/walletsHaveBalancesAll.json');
  const total = walletsHaveBalances.walletsHaveBalances.length;
  let listSubWallets = [];
  console.log(`Total: ${total}`);
  for (let i = 0; i < total; i += 10) {
    const subListWallets = walletsHaveBalances.walletsHaveBalances.slice(i, i + 10);
    listSubWallets.push(subListWallets);
  }
  await Promise.all(
    listSubWallets.map(async (subWallets, index) => {
      await sleep(index * 2000);
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
