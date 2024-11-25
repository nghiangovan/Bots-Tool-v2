/* eslint-disable no-undef */
import mongoose from 'mongoose';
import { connectMongoDB } from '../../../database/conection.js';
import { NAME_JOB, STATUS_JOB } from '../../../utils/enum.js';
import { sleep } from '../../../utils/utils.js';
import { assetsRecoveryToSource } from '../../handlers/assetsRecovery.js';
import { saveWalletsByIndexes } from '../../models/Wallet.js';
import ExecuteTemplateFreeCoinModel from '../../models/ExecuteTemplateFreeCoin.js';
import agendaFreeCoin from '../../jobs/agendaFreeCoin.js';

const main = async () => {
  connectMongoDB();
  const chainId = 42220;
  let schedule_id = '650ac41458cb69338c7c7849';
  let date = '2023-09-20';

  let executes = await ExecuteTemplateFreeCoinModel.find({
    chain_id: chainId,
    schedule_id: schedule_id,
    status: {
      $in: [STATUS_JOB.queued, STATUS_JOB.running, STATUS_JOB.scheduled, STATUS_JOB.rescheduled],
    },
  });
  console.log(`\nTotal: `, executes.length);
  const total = executes.length;
  let jobs = await agendaFreeCoin.jobs({
    $and: [
      { 'data.date': date },
      { 'data.schedule_id': { $eq: new mongoose.Types.ObjectId(schedule_id) } },
      {
        name: {
          $in: [
            NAME_JOB.free_coin.transfer_native_from_spending,
            NAME_JOB.free_coin.transfer_token_from_spending,
            NAME_JOB.free_coin.transfer_native_from_source,
            NAME_JOB.free_coin.transfer_token_from_source,
            NAME_JOB.free_coin.transfer_on_chain_token,
            NAME_JOB.free_coin.transfer_on_chain_native,
            NAME_JOB.free_coin.swap_token_to_token_our_dex,
            NAME_JOB.free_coin.deposit_token_free_to_spending,
            NAME_JOB.free_coin.spending_swap_token_to_token_our_dex,
            NAME_JOB.free_coin.withdraw_free_coin,
          ],
        },
      },
    ],
  });
  console.log(`Total Jobs Free Coin Queue: `, jobs.length);
  await Promise.all(jobs.map(async job => await job.remove()));
  await Promise.all(
    executes.map(async (execute, index) => {
      await sleep(index * 800);
      console.log(`\nIndex: ${index}/${total - 1}`);
      await assetsRecoveryToSource({
        chainId,
        indexWallets: execute.index_wallets,
        idExecuteTemplate: execute._id,
        scheduleId: schedule_id,
        isFreeCoin: true,
      });
      await saveWalletsByIndexes({ chainId, indexWallets: execute.index_wallets, is_using: false });
      await ExecuteTemplateFreeCoinModel.updateOne(
        { _id: execute._id },
        { is_done: true, status: STATUS_JOB.canceled, error: null },
      );
    }),
  );
  console.log('done');
  return process.exit(0);
};
main();
