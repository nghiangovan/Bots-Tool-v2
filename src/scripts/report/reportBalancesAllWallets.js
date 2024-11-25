/* eslint-disable no-undef */
import { connectMongoDB } from '../../../database/conection.js';
import { writeToFileWithCreateFolder } from '../../../utils/index.js';
import { reportBalancesAllWalletsHaveMoney } from '../../reports/reportsBalancesWallets.js';

const main = async () => {
  connectMongoDB();

  // const chainId = 42220;
  const chainId = 56;

  const report = await reportBalancesAllWalletsHaveMoney({ chainId });
  const objectSave = {
    type: 'All',
    chainId,
    length: report.walletsHaveBalances.length,
    walletsHaveBalances: report.walletsHaveBalances,
  };
  console.log('total have money: ', report.walletsHaveBalances.length);
  writeToFileWithCreateFolder('data/balance/', 'walletsHaveBalancesAll.json', objectSave);

  console.log('Report Done All!');
  return process.exit(0);
};
main();
