import mongoose from 'mongoose';
import { connectMongoDB } from '../../database/conection.js';
import { sleep } from '../../utils/utils.js';
import agendaSkim from './jobsSkim/agendaSkim.js';
import { getWalletSkimByIndexOffChain } from '../handlers/common.js';
import LogModel from '../models/Log.js';
import { NAME_JOB } from '../../utils/enum.js';
import moment from 'moment';

const main = async () => {
  connectMongoDB();
  // agendaSkim.on('ready', async () => {
  //   await sleep(1000);
  //   let jobs = await agendaSkim.jobs({ _id: { $eq: new mongoose.Types.ObjectId('64f9f973dd81e78e8f9ba239') } });
  //   await jobs[0].run();
  //   console.log('done');
  // });
  // await sleep(1000);
  // const wallet = getWalletSkimByIndexOffChain({ indexWallet: 0 });
  // console.log(wallet.address);
  //
  //
  // await sleep(1000);
  // for (let i = 1; i <= 98050; i += 500) {
  //   const logScheduleQueue = await LogModel.findOne({
  //     chain_id: 42220,
  //     type: NAME_JOB.fake_actives.schedule_fake_actives,
  //     status: true,
  //     date: '2023-12-18',
  //     id_execute: '656d8cc37330a848d2326f63',
  //     index_wallet_2: `FROM_${i}_TO_${i + 500}`,
  //   });

  //   if (logScheduleQueue) {
  //     console.log(i, `FROM_${i}_TO_${i + 500}`);
  //     await logScheduleQueue.deleteOne();
  //   }
  // }
  //
  //
  // await sleep(1000);
  // let jobs = await agendaSkim.jobs({
  //   $and: [
  //     // Completed
  //     { lastFinishedAt: { $exists: true } },
  //     { $expr: { $gte: ['$lastFinishedAt', '$failedAt'] } },
  //     {
  //       name: {
  //         $in: [NAME_JOB.fake_actives.execute_fake_actives, NAME_JOB.fake_actives.execute_fake_actives_free_coin],
  //       },
  //     },
  //   ],
  // });
  // await Promise.all(jobs.map(async job => await job.remove()));
  //
  //
  // console.log(`moment.utc().hours(): ${moment.utc().hours()}`);
  // console.log(`moment.utc().minutes(): ${moment.utc().minutes()}`);
  // console.log('\n');
  // const condition = moment.utc().hours() > 22 || (moment.utc().hours() == 22 && moment.utc().minutes() >= 22);
  // console.log(`moment.utc().hours() > 22: ${moment.utc().hours() > 22}`);
  // console.log(`moment.utc().hours() == 22: ${moment.utc().hours() == 22}`);
  // console.log(`moment.utc().minutes() >= 22: ${moment.utc().minutes() >= 22}`);
  // console.log(`condition: ${condition}`);
};
main();
