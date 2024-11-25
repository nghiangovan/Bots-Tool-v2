/* eslint-disable no-undef */
import { connectMongoDB } from '../../../database/conection.js';
import { assetsRecoveryToSource } from '../../handlers/assetsRecovery.js';
import ExecuteTemplateModel from '../../models/ExecuteTemplate.js';
import { saveWalletsByIndexes } from '../../models/Wallet.js';

const main = async () => {
  connectMongoDB();
  const chainId = 56;
  let schedule_id = '652bbf683db6856a92a7908f';

  let executes = await ExecuteTemplateModel.find({
    chain_id: chainId,
    schedule_id: schedule_id,
    // status: {
    //   $in: [STATUS_JOB.queued, STATUS_JOB.running, STATUS_JOB.scheduled, STATUS_JOB.rescheduled],
    // },
  });
  const total = executes.length;
  console.log(`\nTotal: `, executes.length);
  await Promise.all(
    executes.map(async (execute, index) => {
      console.log(`\nIndex: ${index}/${total - 1}`);
      await assetsRecoveryToSource({
        chainId,
        indexWallets: execute.index_wallets,
        idExecuteTemplate: execute._id,
      });
      await saveWalletsByIndexes({ chainId, indexWallets: execute.index_wallets, is_using: false });
      await execute.deleteOne();
    }),
  );
  console.log('done');
  return process.exit(0);
};
main();
