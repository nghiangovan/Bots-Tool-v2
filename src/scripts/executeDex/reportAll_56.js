/* eslint-disable no-undef */

import { connectMongoDB } from '../../../database/conection.js';
import { exportArrayToCsv } from '../../../utils/export.js';
import { reportBalancesAllWalletsHaveMoney } from '../../reports/reportsBalancesWallets.js';

const main = async () => {
  connectMongoDB();
  console.log(`Start Reporting...`);
  const chainId = 56;
  const report = await reportBalancesAllWalletsHaveMoney({ chainId, isDex: true });
  const totalUSDT = report.walletsHaveBalances.reduce((acc, cur) => acc + parseFloat(cur.usdt), 0);
  const totalLCR = report.walletsHaveBalances.reduce((acc, cur) => acc + parseFloat(cur.lcr), 0);
  const totalBNB = report.walletsHaveBalances.reduce((acc, cur) => acc + parseFloat(cur.bnb), 0);
  const totalHoldingAmount = report.walletsHaveBalances.reduce((acc, cur) => acc + parseFloat(cur.holding_amount), 0);
  console.log(`Total USDT: ${totalUSDT}`);
  console.log(`Total LCR: ${totalLCR}`);
  console.log(`Total BNB: ${totalBNB}`);
  console.log(`Total Holding Amount: ${totalHoldingAmount}`);
  await exportArrayToCsv({
    data: report.walletsHaveBalances.sort((a, b) => a.index - b.index),
    columns: ['index', 'address', 'holding_amount', 'lcr', 'usdt', 'bnb'],
    fileName: 'reportAll_56.csv',
  });
};
main();
