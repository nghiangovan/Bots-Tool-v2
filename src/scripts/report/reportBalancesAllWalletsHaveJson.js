/* eslint-disable no-undef */
import { connectMongoDB } from '../../../database/conection.js';
import { reportBalancesAllWallets } from '../../reports/reportsBalancesWallets.js';

const main = async () => {
  connectMongoDB();

  // const chainId = 42220;
  const chainId = 56;

  let report = await reportBalancesAllWallets({ chainId });
  console.log('total have money: ', report.walletsHaveBalances.length);

  console.log('Report Done All!');
  return process.exit(0);
};
main();
