import moment from 'moment';
import { connectMongoDB } from '../../database/conection.js';
import { KEY_CONFIG, NAME_JOB, STATUS_JOB } from '../../utils/enum.js';
import { sleep } from '../../utils/utils.js';
import ExecuteTemplateModel from '../models/ExecuteTemplate.js';
import agenda from './agenda.js';
import { geoRandom, normalizeRandom, randomDatetimesFromRange, randomFloatBetween } from '../../utils/random.js';
import LogModel from '../models/Log.js';
import mongoose from 'mongoose';
import ReportExecuteModel from '../models/ReportExecute.js';
import ConfigModel from '../models/Config.js';
import { cacheKpiServerFromLogsToReportExecute } from '../handlers/functions.js';
import { FORMAT_DATE } from '../../utils/time.js';
import { backupAndManageDatabase } from '../handlers/backupDB.js';
import { log } from 'util';
import { reportBalancesWalletsDex } from '../reports/reportsBalancesWallets.js';
import { RANGE_BALANCE } from '../../utils/constant.js';
import { formatCeilNearest } from '../../utils/format.js';

const main = async () => {
  connectMongoDB();

  // const chainId = 56;
  // let schedule_id = '652bbf1f3db6856a92a78ec2';

  // let executes = await ExecuteTemplateModel.find({
  //   chain_id: chainId,
  //   schedule_id: schedule_id,
  //   status: {
  //     $in: [STATUS_JOB.queued, STATUS_JOB.running, STATUS_JOB.scheduled, STATUS_JOB.rescheduled],
  //   },
  // });

  // const total = executes.length;

  // await Promise.all(
  //   executes.map(async (execute, index) => {
  //     console.log(`\nIndex: ${index}/${total - 1}`);

  //     const indexWalletGap = execute.jobs
  //       .filter(job => Number.isInteger(job.index_wallet_gap))
  //       .map(job => job.index_wallet_gap);
  //     const indexWalletsAll = execute.index_wallets;
  //     if (indexWalletGap.length > 0) {
  //       console.log(execute._id.toString(), indexWalletGap);
  //     }
  //     const indexWalletsSave = indexWalletsAll.filter(indexWallet => !indexWalletGap.includes(indexWallet));

  //     await execute.updateOne({ index_wallets: indexWalletsSave });
  //   }),
  // );
  //

  // const jobs = await agenda.jobs({
  //   $and: [
  //     { lastFinishedAt: { $exists: true } },
  //     { failedAt: { $exists: true } },
  //     { $expr: { $eq: ['$lastFinishedAt', '$failedAt'] } },
  //   ],
  // });
  // await Promise.all(
  //   jobs.map(async (job, idx) => {
  //     await sleep(idx * 100);
  //     const reason = job?.attrs?.failReason?.toString()?.toLowerCase();
  //     if (reason && reason.includes('insufficient')) {
  //       const { job_index, id_execute_template } = job.attrs.data;
  //       const execute = await ExecuteTemplateModel.findById(id_execute_template);
  //       const jobPrevIndex = execute.jobs.find(j => j.index == job_index - 1);
  //       let jobQueuePrev = (await agenda.jobs({ _id: { $eq: jobPrevIndex?.job_id } }))[0];
  //       await execute.updateOne(
  //         { $set: { 'jobs.$[prev].job_id': null, 'jobs.$[i].job_id': null } },
  //         {
  //           arrayFilters: [{ 'prev.index': jobPrevIndex.index }, { 'i.index': job_index }],
  //           upsert: true,
  //           new: true,
  //           setDefaultsOnInsert: true,
  //         },
  //       );
  //       const runAt = moment().add(1, 'minutes');
  //       let schedule = jobQueuePrev.schedule(runAt);
  //       await execute.updateOne(
  //         { $set: { 'jobs.$[prev].job_id': schedule.attrs._id } },
  //         { arrayFilters: [{ 'prev.index': jobPrevIndex.index }] },
  //       );
  //       await job.remove();
  //     }
  //   }),
  // );
  // console.log(jobs);
  //
  // await sleep(1000);
  //
  //
  // const date = '2023-10-25';
  // const start_time_day = moment(date).diff(moment(), 'minutes') > 0 ? moment(date) : moment();
  // const start_time = start_time_day.add(5, 'minutes');
  // const end_time = moment(date).add(22, 'hours');
  // const runAt = randomDatetimesFromRange(start_time, end_time, 1);
  // console.log(runAt.toString());
  //
  //
  // await sleep(1000);
  // let jobs = await agenda.jobs({
  //   $and: [
  //     // Completed
  //     { lastFinishedAt: { $exists: true } },
  //     { $expr: { $gte: ['$lastFinishedAt', '$failedAt'] } },
  //     {
  //       name: {
  //         $nin: [
  //           NAME_JOB.auto.generate_templates_auto,
  //           NAME_JOB.fake_transactions.repeat_scan_logs,
  //           NAME_JOB.fake_actives.schedule_fake_actives_daily,
  //           NAME_JOB.cache.balance_all,
  //         ],
  //       },
  //     },
  //   ],
  // });
  // await Promise.all(jobs.map(async job => await job.remove()));
  //
  //
  // await cacheKpiServerFromLogsToReportExecute({ chainId: 56 });
  // await cacheKpiServerFromLogsToReportExecute({ chainId: 42220 });
  //
  //
  // const chain_id = '56';
  // const skip = 0;
  // const limit = 2;
  // const total_documents = await ReportExecuteModel.countDocuments({ chain_id }).skip(skip).limit(limit);
  // console.log(total_documents);
  // await sleep(1000);
  // await backupAndManageDatabase();
  //
  //
  // const start_time = new Date();
  // const chain_id = '42220';
  // const dateStr = moment().subtract(1, 'days').format('YYYY-MM-DD').toString();
  // const date = new Date(dateStr);
  // let query = [
  //   {
  //     $facet: {
  //       skim_filter: [
  //         {
  //           $match: {
  //             chain_id,
  //             createdAt: { $gt: date },
  //             type: {
  //               $in: [NAME_JOB.fake_actives.execute_fake_actives_free_coin, NAME_JOB.fake_actives.execute_fake_actives],
  //             },
  //             status: true,
  //           },
  //         },
  //         {
  //           $group: {
  //             _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
  //             date: { $first: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } },
  //             uaw: { $addToSet: '$wallet_address_1' },
  //           },
  //         },
  //         {
  //           $sort: {
  //             date: -1,
  //           },
  //         },
  //         {
  //           $project: {
  //             date: '$date',
  //             uaw_skim: { $size: '$uaw' },
  //             _id: 0,
  //           },
  //         },
  //       ],
  //       dex_filter: [
  //         {
  //           $match: {
  //             chain_id,
  //             createdAt: { $gt: date },
  //             type: {
  //               $in: [
  //                 NAME_JOB.onChain.deposit_token_utt_to_spending,
  //                 NAME_JOB.onChain.swap_token_to_token_our_dex,
  //                 NAME_JOB.free_coin.swap_token_to_token_our_dex,
  //                 NAME_JOB.free_coin.deposit_token_free_to_spending,
  //               ],
  //             },
  //             status: true,
  //           },
  //         },
  //         {
  //           $group: {
  //             _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
  //             date: { $first: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } },
  //             uaw: { $addToSet: '$wallet_address_1' },
  //           },
  //         },
  //         {
  //           $sort: {
  //             _id: -1,
  //           },
  //         },
  //         {
  //           $project: {
  //             date: '$date',
  //             uaw_dex: { $size: '$uaw' },
  //             _id: 0,
  //           },
  //         },
  //       ],
  //     },
  //   },
  //   {
  //     $project: {
  //       all: { $concatArrays: ['$skim_filter', '$dex_filter'] },
  //     },
  //   },
  //   { $unwind: '$all' },
  //   {
  //     $group: {
  //       _id: '$all.date',
  //       uaw_skim: { $sum: '$all.uaw_skim' },
  //       uaw_dex: { $sum: '$all.uaw_dex' },
  //     },
  //   },
  //   { $sort: { _id: -1 } },
  //   {
  //     $project: {
  //       _id: 0,
  //       date: '$_id',
  //       uaw_skim: 1,
  //       uaw_dex: 1,
  //       total: { $add: ['$uaw_skim', '$uaw_dex'] },
  //     },
  //   },
  // ];

  // const logs_uaw = await LogModel.aggregate(query);

  // const end_time = new Date();

  // const time = end_time - start_time;

  // console.log(logs_uaw, time);
  //
  //
  // await sleep(1000);
  // let jobs = await agenda.jobs({
  //   $and: [
  //     // Completed
  //     { lastFinishedAt: { $exists: true } },
  //     { $expr: { $gte: ['$lastFinishedAt', '$failedAt'] } },
  //     {
  //       name: {
  //         $nin: [
  //           NAME_JOB.auto.generate_templates_auto,
  //           NAME_JOB.fake_transactions.repeat_scan_logs,
  //           NAME_JOB.fake_actives.schedule_fake_actives_daily,
  //           NAME_JOB.cache.backup_database,
  //           NAME_JOB.cache.cache_balance_source_all,
  //           NAME_JOB.cache.cache_kpi_server,
  //         ],
  //       },
  //     },
  //   ],
  // });
  // await Promise.all(jobs.map(async job => await job.remove()));
  //
  //
  // await reportBalancesWalletsDex({ chainId: 56, indexWallets: [0, 1, 2, 3] });
  //
  //
  // const randomBalance = formatCeilNearest(randomFloatBetween(RANGE_BALANCE.min, RANGE_BALANCE.max));
  // console.log(randomBalance);
  //
  //
  const maxVolume = 80;
  let randomVolumeAmount = 0;
  do {
    const average = 100;
    const randomGeo = geoRandom(average);
    randomVolumeAmount = normalizeRandom(randomGeo);
    console.log(randomGeo, randomVolumeAmount);
    console.log('\n');
  } while (randomVolumeAmount != 0 && randomVolumeAmount >= maxVolume);

  console.log('done');
};

main();
