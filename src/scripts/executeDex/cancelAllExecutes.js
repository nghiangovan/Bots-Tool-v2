/* eslint-disable no-undef */
import { connectMongoDB } from '../../../database/conection.js';
import { NAME_JOB, STATUS_JOB } from '../../../utils/enum.js';
import { sleep } from '../../../utils/utils.js';
import agendaDex from '../../dex/agendaDex.js';
import ExecuteDexModel from '../../models/ExecuteDex.js';
import { saveWalletsExecuteDexByIndexes } from '../../models/WalletExecuteDex.js';

const main = async () => {
  connectMongoDB();
  const chainId = 56;

  let executes = await ExecuteDexModel.find({
    chain_id: chainId,
    status: {
      $in: [STATUS_JOB.queued, STATUS_JOB.running, STATUS_JOB.scheduled, STATUS_JOB.rescheduled],
    },
  });
  console.log(`\nTotal: `, executes.length);
  const total = executes.length;
  let jobs = await agendaDex.jobs({
    $and: [
      // Scheduled
      { nextRunAt: { $exists: true } },
      { $expr: { $gte: ['$nextRunAt', new Date()] } },
      {
        name: {
          $in: [
            NAME_JOB.dex.schedule_execute_jobs,
            NAME_JOB.dex.swap_token_to_token_our_dex,
            NAME_JOB.dex.transfer_token_from_source,
          ],
        },
      },
    ],
  });
  console.log(`Total Jobs Queue: `, jobs.length);
  await Promise.all(jobs.map(async job => await job.remove()));
  await Promise.all(
    executes.map(async (execute, index) => {
      await sleep(index * 50);
      console.log(`\nIndex: ${index}/${total - 1}`);
      await saveWalletsExecuteDexByIndexes({
        chainId,
        indexWallets: [execute.index_wallets[0]],
        isUsing: false,
      });
      await execute.updateOne({ is_done: true, status: STATUS_JOB.canceled });
    }),
  );
  console.log('done');
  return process.exit(0);
};
main();
