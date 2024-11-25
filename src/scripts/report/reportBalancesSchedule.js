/* eslint-disable no-undef */
import { connectMongoDB } from '../../../database/conection.js';
import { writeToFileWithCreateFolder } from '../../../utils/index.js';
import ExecuteTemplateModel from '../../models/ExecuteTemplate.js';
import { reportBalancesWallets } from '../../reports/reportsBalancesWallets.js';

const main = async () => {
  connectMongoDB();
  const chainId = 56;
  let is_repeat = true;
  let schedule_id = '64f6ca788fbb621b076944d0';

  const executes = await ExecuteTemplateModel.find({
    chain_id: chainId,
    schedule_id: schedule_id,
  });

  let allIndexWallets = (await Promise.all(executes.map(execute => execute.index_wallets))).flat(1);
  const report = await reportBalancesWallets({ chainId, indexWallets: allIndexWallets });
  const objectSave = {
    chainId,
    isRepeat: is_repeat,
    scheduleId: schedule_id,
    length: report.walletsHaveBalances.length,
    walletsHaveBalances: report.walletsHaveBalances,
  };
  writeToFileWithCreateFolder('data/balance/', 'walletsHaveBalancesSchedule.json', objectSave);
  console.log('done');
  return process.exit(0);
};
main();
