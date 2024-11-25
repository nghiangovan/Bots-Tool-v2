/* eslint-disable no-undef */
import { connectMongoDB } from '../../../database/conection.js';
import { NAME_JOB, STATUS_JOB } from '../../../utils/enum.js';
import { sleep } from '../../../utils/utils.js';
import { assetsRecoveryToSource } from '../../handlers/assetsRecovery.js';
import agenda from '../../jobs/agenda.js';
import ExecuteTemplateModel from '../../models/ExecuteTemplate.js';
import { saveWalletsByIndexes } from '../../models/Wallet.js';

const main = async () => {
  connectMongoDB();
  const chainId = 56;

  let executes = await ExecuteTemplateModel.find({
    chain_id: chainId,
    status: {
      $in: [STATUS_JOB.queued, STATUS_JOB.running, STATUS_JOB.scheduled, STATUS_JOB.rescheduled],
    },
  });
  console.log(`\nTotal: `, executes.length);
  const total = executes.length;
  let jobs = await agenda.jobs({
    $and: [
      // Scheduled
      { nextRunAt: { $exists: true } },
      { $expr: { $gte: ['$nextRunAt', new Date()] } },
      {
        name: {
          $in: [
            NAME_JOB.offChain.withdraw_token_utt,
            NAME_JOB.onChain.swap_token_to_token_our_dex,
            NAME_JOB.onChain.deposit_token_utt_to_spending,
            NAME_JOB.onChain.transfer_token_from_source,
            NAME_JOB.onChain.transfer_on_chain_token,
          ],
        },
      },
    ],
  });
  console.log(`Total Jobs Queue: `, jobs.length);
  await Promise.all(jobs.map(async job => await job.remove()));
  await Promise.all(
    executes.map(async (execute, index) => {
      await sleep(index * 800);
      console.log(`\nIndex: ${index}/${total - 1}`);
      await assetsRecoveryToSource({
        chainId,
        indexWallets: execute.index_wallets,
        idExecuteTemplate: execute._id,
      });
      await saveWalletsByIndexes({ chainId, indexWallets: execute.index_wallets, is_using: false });
      await ExecuteTemplateModel.updateOne(
        { _id: execute._id },
        { is_done: true, status: STATUS_JOB.canceled, error: null },
      );
    }),
  );
  console.log('done');
  return process.exit(0);
};
main();
