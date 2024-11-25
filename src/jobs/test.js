import mongoose from 'mongoose';
import { connectMongoDB } from '../../database/conection.js';
import { NAME_JOB, STATUS_JOB } from '../../utils/enum.js';
import agenda from './agenda.js';
import { checkDuplicateOrRunAgainJob } from '../handlers/common.js';
import { getJobsByType } from '../../server/routes/agenda.js';
import { sleep } from '../../utils/utils.js';

const main = async () => {
  connectMongoDB();
  agenda.on('ready', async () => {
    // let a = BigNumber.from('1000000000000000000').sub(BigNumber.from('1000000000000000000').sub());
    // console.log(weiToEther(a));
    //
    //
    // let listIndexes = LIST_INDEX_WALLET_SOURCE;
    // let indexWalletRandom = randomOneFromArray(listIndexes);
    // let wallet = await getWalletSourceByIndex({ chainId: 97, indexWallet: indexWalletRandom });
    // console.log(wallet?.mnemonic?.path?.split('/')?.pop());
    //
    //
    // await agenda.now(NAME_JOB.auto.generate_templates_auto); // create execute template
    // //
    // //
    // // console.log(moment('2023-06-22').add(30, 'minutes'));
    // //
    // //
    // let start = new Date().getTime();
    // console.log('start: ', start);
    // let maxAddHours = getMaxHour(110000);
    // let schedulesTemplate1 = randomDatetimesFromRange(
    //   moment().add(30, 'seconds'),
    //   moment().add(maxAddHours.number, maxAddHours.unit),
    //   110000,
    // );
    // // schedulesTemplate1.sort().map(date => console.log(date, '\n'));
    // let end = new Date().getTime();
    // console.log('end: ', end);
    // console.log('time: ', end - start);
    // //
    // //
    // let wallet = await getWalletByIndex({ chainId: '97', indexWallet: 5 });
    // console.log(wallet);
    // //
    // //
    // let result = await getWalletByAddress({
    //   chainId: '97',
    //   maxIndex: 100,
    //   address: '0xbda068b363a209dce9c885ee451c876c4858e52b',
    // });
    // console.log(result);
    //
    //
    // const provider = await getProvider(97);
    // const gasPrice = await provider.getGasPrice();
    // const gasPriceGwei = ethers.utils.formatUnits(gasPrice, 'gwei');
    // console.log(gasPriceGwei, weiToEther(gasPrice.mul(200000)));
    //
    //
    // let job1 = await agenda.jobs({ _id: { $eq: new mongoose.Types.ObjectId('64b651cc1201a952d2f15e52') } });
    // let job2 = await agenda.jobs({ _id: job1.at(0).attrs._id });
    // console.log(job2.at(0).isRunning());
    // await job[0].run().then(e => {
    //   console.log(e);
    // });
    //
    //
    // let job = (await agenda.jobs({ _id: { $eq: new mongoose.Types.ObjectId('64b6c11506123cb1296e0c56') } }))[0];
    // scheduleNextJob({ job });
    //
    //
    // await assetsRecovery({ chainId: 97, indexWallets: [1, 2, 3] });
    // await saveWalletsByIndexes({ chainId: 97, indexWallets: [1, 2], is_using: false });
    //
    //
    // let jobs = await agenda.jobs({
    //   'name': 'execute_fake_actives',
    //   'data.chain_id': '97',
    //   'data.date': '2023-07-02',
    //   'data.index': 0,
    //   'shouldSaveResult': false,
    //   'failCount': { $gt: 5 },
    // });
    // console.log(jobs);
    //
    //
    // agenda.now(NAME_JOB.fake_actives.execute_fake_actives, {
    //   date: '2023-07-02',
    //   chain_id: '97',
    //   index: 2,
    //   id_execute: '0123456',
    // });
    //
    //
    // const result = await agenda.disable({
    //   'name': NAME_JOB.fake_actives.execute_fake_actives,
    //   'data.date': '2023-07-02',
    //   'data.chain_id': '97',
    // });
    // console.log(result);
    //
    //
    // const result = await agenda.enable({
    //   'name': NAME_JOB.fake_actives.execute_fake_actives,
    //   'data.date': '2023-07-02',
    //   'data.chain_id': '97',
    // });
    // console.log(result);
    //
    //
    // await agenda.now(NAME_JOB.fake_actives.schedule_fake_actives, { chainId: 56 });
    //
    //
    // await sendNoti('[BOT_TOOL_ERROR]: ', `Test Fail!`);
    //
    //
    // let result = await TemplateModel.aggregate([
    //   {
    //     $match: {
    //       jobs: {
    //         $not: {
    //           $all: [
    //             {
    //               $elemMatch: {
    //                 name_job: {
    //                   $eq: NAME_JOB.onChain.swap_token_to_token_our_dex,
    //                 },
    //               },
    //             },
    //           ],
    //         },
    //       },
    //     },
    //   },
    //   { $sample: { size: 1 } },
    // ]);
    // console.log(result);
    //
    //
    // const session = await mongoose.startSession();
    // session.startTransaction();
    // await generateTemplateExecute({
    //   chainId: 56,
    //   kpiUAW: 50,
    //   kpiVolume: 50,
    //   numberNewWallets: 25,
    //   amountMin: 10, // USDT
    //   amountMax: 50, // USDT
    //   date: '2023-07-22',
    //   session,
    // });
    // await session.abortTransaction();
    // await session.endSession();
    //
    //
    // await cacheBalanceWalletsSource({ chainId: '97' });
    //
    //
    // let [minBNB, minUSDT, minLCR] = await Promise.all([
    //   WalletSourceModel.aggregate([
    //     { $match: { chain_id: '97', asset: 'bnb' } },
    //     { $sort: { balance: 1 } },
    //     {
    //       $group: {
    //         _id: '$chain_id',
    //         data: { $first: '$$ROOT' },
    //       },
    //     },
    //     { $replaceRoot: { newRoot: '$data' } },
    //   ]),
    //   WalletSourceModel.aggregate([
    //     { $match: { chain_id: '97', asset: 'usdt' } },
    //     { $sort: { balance: 1 } },
    //     {
    //       $group: {
    //         _id: '$chain_id',
    //         data: { $first: '$$ROOT' },
    //       },
    //     },
    //     { $replaceRoot: { newRoot: '$data' } },
    //   ]),
    //   WalletSourceModel.aggregate([
    //     { $match: { chain_id: '97', asset: 'lcr' } },
    //     { $sort: { balance: 1 } },
    //     {
    //       $group: {
    //         _id: '$chain_id',
    //         data: { $first: '$$ROOT' },
    //       },
    //     },
    //     { $replaceRoot: { newRoot: '$data' } },
    //   ]),
    // ]);
    // console.log(minBNB.at(0).address, minBNB.at(0).balance?.toString());
    // console.log(minUSDT.at(0).address, minUSDT.at(0).balance?.toString());
    // console.log(minLCR.at(0).address, minLCR.at(0).balance?.toString());
    // getSourceWalletMinBalances({
    //   chainId: '97',
    //   listSymbolAssets: [SYMBOL_TOKEN.BNB, SYMBOL_TOKEN.USDT, SYMBOL_TOKEN.LCR],
    // });
    //
    //
    // getCurrentIndexWalletSource({ chainId: '97' });
    //
    //
    // await sendNotiBackendTeam(
    //   `[BOT_TOOL]: N0302 - ${SLACK_JAY} Withdraw UTT token failed bot_id [${'Test'}] - receviver [${'Test'}] - job_id [${'Test'}]`,
    // );
    //
    //
    // getMaxHour(5);
    //
    //
    // const [sourceWalletBNB, sourceWalletUSDT, sourceWalletLCR] = await getSourceWalletMaxBalances({
    //   chainId: '56',
    //   listSymbolAssets: [SYMBOL_NATIVE['97'], SYMBOL_TOKEN.USDT, SYMBOL_TOKEN.LCR],
    // });
    // console.log(sourceWalletBNB, sourceWalletUSDT, sourceWalletLCR);
    //
    //
    // let job = (
    //   await agenda.jobs({
    //     name: NAME_JOB.auto.generate_templates_auto,
    //     type: 'single',
    //   })
    // )[0];
    // console.log(job);
    //
    //
    // const wallet = getWalletSourceSkimByIndexOffChain({ indexWallet: 5 });
    // console.log(wallet);
    // 0: 0x25ebf1aa1B6718Dd67709e6A31692A72D5Dfd778
    // 1: 0x3cDdCEA588a4bF967CfA3b2B63787e8ef2b6E14f
    // 2: 0xF7A5700d40Ec9Eb7c6a002E4A347305458dabd04
    // 3: 0x48573e36f42bff359162D73ec5E526bc9a04CCCc
    // 4: 0xC091b27546586D0f1624503DCF4ABF39B87ae276
    // 5: 0xad61bB2e591Be820004A38E35c9a0156773cfB60
    //
    //
    // await agenda.cancel({
    //   name: NAME_JOB.fake_actives.execute_fake_actives,
    //   shouldSaveResult: false,
    // });
    //
    //
    // const date = moment().format(FORMAT_DATE);
    // for (let index = 0; index < 10; index++) {
    //   await agenda.now(NAME_JOB.fake_actives.execute_fake_actives, {
    //     is_daily: true,
    //     date: date,
    //     chain_id: '56',
    //   });
    // }
    //
    //
    // let jobs = await agenda.cancel({
    //   'name': NAME_JOB.fake_actives.execute_fake_actives,
    //   'data.is_daily': true,
    //   'data.date': date,
    //   'data.chain_id': '56',
    // });
    // console.log(jobs);
    //
    //
    // const date = moment().format(FORMAT_DATE);
    // for (let index = 0; index < 10; index++) {
    //   await agenda.now(NAME_JOB.fake_actives.execute_fake_actives, {
    //     is_daily: false,
    //     date: date,
    //     chain_id: '56',
    //     id_execute: '0123123123',
    //   });
    // }
    // let jobs = await agenda.cancel({
    //   'name': NAME_JOB.fake_actives.execute_fake_actives,
    //   'data.id_execute': '0123123123',
    // });
    // console.log(jobs);
    // scanLogsAndFakeTransactions({ chainId: 56 });
    //
    //
    // // running
    // let jobs = await agenda.jobs({
    //   lastRunAt: { $exists: true },
    //   $expr: {
    //     $gt: ['$lastRunAt', '$lastFinishedAt'],
    //   },
    // });
    // // queued
    // let jobs = await agenda.jobs({
    //   $and: [
    //     { nextRunAt: { $exists: true } },
    //     { nextRunAt: { $lt: new Date() } },
    //     { $expr: { $gte: ['$nextRunAt', '$lastFinishedAt'] } },
    //   ],
    // });
    // // failed
    // let jobs = await agenda.jobs({
    //   $and: [
    //     { lastFinishedAt: { $exists: true } },
    //     { failedAt: { $exists: true } },
    //     { $expr: { $eq: ['$lastFinishedAt', '$failedAt'] } },
    //   ],
    // });
    // for (let i = 0; i < jobs.length; i++) {
    //   let job = jobs[i];
    //   await job.run();
    //   await job.save();
    // }
    // console.log(jobs);
    // // scheduled
    // let jobs = await agenda.jobs({
    //   $and: [
    //     { nextRunAt: { $exists: true } },
    //     { $expr: { $gte: ['$nextRunAt', new Date()] } },
    //     {
    //       name: {
    //         $nin: [
    //           NAME_JOB.auto.generate_templates_auto,
    //           NAME_JOB.fake_transactions.repeat_scan_logs,
    //           NAME_JOB.fake_actives.schedule_fake_actives_daily,
    //         ],
    //       },
    //     },
    //   ],
    // });
    // console.log(jobs);
    // await jobs[0].run().then(e => {
    //   console.log(e);
    // });
    //
    //
    // await agenda.cancel({
    //   $and: [
    //     { nextRunAt: { $exists: true } },
    //     { $expr: { $gte: ['$nextRunAt', new Date()] } },
    //     {
    //       name: {
    //         $in: [NAME_JOB.fake_actives.execute_fake_actives],
    //       },
    //     },
    //   ],
    // });
    // let exectues = await ExecuteTemplateModel.find({ date: '2023-08-18' });
    // console.log(exectues.at(0)._id?.toString());
    // for (let i = 0; i < exectues.length; i++) {
    //   const id_execute_template = exectues[i]._id?.toString();
    //   const execute = await ExecuteTemplateModel.findById(id_execute_template);
    //   let jobIds = execute.jobs.map(job => job.job_id);
    //   await agenda.cancel({ _id: { $in: jobIds } });
    //   await ExecuteTemplateModel.findByIdAndUpdate(id_execute_template, { status: STATUS_JOB.canceled });
    //   let exectue = await ExecuteTemplateModel.findById(id_execute_template);
    //   if (exectue?.is_repeat == true) {
    //     let schedule = await ScheduleExecuteAutoModel.findById(exectue.schedule_id);
    //     await ScheduleExecuteAutoModel.findByIdAndUpdate(exectue.schedule_id, { kpi_uaw: schedule.kpi_uaw - 1 });
    //   } else if (exectue?.is_repeat == false) {
    //     let schedule = await ScheduleExecuteManualModel.findById(exectue.schedule_id);
    //     await ScheduleExecuteManualModel.findByIdAndUpdate(exectue.schedule_id, { kpi_uaw: schedule.kpi_uaw - 1 });
    //   }
    //   assetsRecoveryToSource({
    //     chainId: execute.chain_id,
    //     indexWallets: execute.index_wallets,
    //     idExecuteTemplate: id_execute_template,
    //   });
    //   await saveWalletsByIndexes({ chainId: execute.chain_id, indexWallets: execute.index_wallets, is_using: false });
    //   await ExecuteTemplateModel.findByIdAndDelete(id_execute_template);
    // }
    // console.log('done');
    // let job = (await agenda.jobs({ _id: { $eq: new mongoose.Types.ObjectId('64e0dde3de64a9bafbddb2cb') } }))[0];
    // scheduleNextJob({ job });
    // console.log('done');
    // let job = (await agenda.jobs({ _id: { $eq: new mongoose.Types.ObjectId('64e078a6a9a51bb10925c984') } }))[0];
    // await rescheduleFailedJob({ job, error: null });
    // console.log('done');
    // let job = (await agenda.jobs({ _id: { $eq: new mongoose.Types.ObjectId('64d468cb712334792cdaf58a') } }))[0];
    // await rescheduleFailedJob({ job, error: null });
    //
    //
    // Jobs QUEUED not RUNNING
    // let jobs = await agenda.jobs({
    //   $and: [
    //     { nextRunAt: { $exists: true } },
    //     { nextRunAt: { $lt: new Date() } },
    //     { $expr: { $gte: ['$nextRunAt', '$lastFinishedAt'] } },
    //     { $expr: { $gte: ['$lastFinishedAt', '$lastRunAt'] } },
    //   ],
    // });
    // if (jobs.length > 0) await Promise.all(jobs.map(async job => !job.isRunning() && (await job.run())));
    // console.log(jobs);
    //
    // // Jobs RUNNING too long
    // let jobs = await agenda.jobs({
    //   $and: [
    //     { lastRunAt: { $exists: true } },
    //     { $expr: { $gt: ['$lastRunAt', '$lastFinishedAt'] } },
    //     { $expr: { $lt: ['$lastRunAt', moment.utc().subtract(15, 'minutes').toDate()] } },
    //     { $expr: { $lt: ['$lockedAt', moment.utc().subtract(15, 'minutes').toDate()] } },
    //   ],
    // });
    // console.log(jobs);
    // setInterval(async () => {
    //   // Jobs RUNNING too long
    //   let jobsRunningTooLong = await agenda.jobs({
    //     $and: [
    //       { lastRunAt: { $exists: true } },
    //       { $expr: { $gt: ['$lastRunAt', '$lastFinishedAt'] } },
    //       { $expr: { $lt: ['$lastRunAt', new Date(new Date() - 15 * 60 * 1000)] } },
    //       { $expr: { $lt: ['$lockedAt', new Date(new Date() - 15 * 60 * 1000)] } },
    //     ],
    //   });
    //   if (jobsRunningTooLong.length > 0) await Promise.all(jobsRunningTooLong.map(async job => await job.run()));
    // }, 1000); // repeat every 1 second
    //
    //
    // let jobs = await agenda.jobs({
    //   $and: [
    //     { lastFinishedAt: { $exists: true } },
    //     { failedAt: { $exists: true } },
    //     { $expr: { $eq: ['$lastFinishedAt', '$failedAt'] } },
    //   ],
    // });
    // let jobs = await agenda.jobs({
    //   $and: [
    //     // Scheduled
    //     { nextRunAt: { $exists: true } },
    //     { $expr: { $gte: ['$nextRunAt', new Date()] } },
    //     {
    //       name: {
    //         $in: [
    //           NAME_JOB.offChain.withdraw_token_utt,
    //           NAME_JOB.onChain.swap_token_to_token_our_dex,
    //           NAME_JOB.onChain.deposit_token_utt_to_spending,
    //           NAME_JOB.onChain.transfer_token_from_source,
    //           NAME_JOB.onChain.transfer_on_chain_token,
    //         ],
    //       },
    //     },
    //   ],
    // });
    // await Promise.all(jobs.map(async job => await job.remove()));
    //
    // let jobs = await agenda.jobs({
    //   $and: [
    //     // Failed
    //     { lastFinishedAt: { $exists: true } },
    //     { failedAt: { $exists: true } },
    //     { $expr: { $eq: ['$lastFinishedAt', '$failedAt'] } },
    //     {
    //       name: {
    //         $in: [
    //           NAME_JOB.offChain.withdraw_token_utt,
    //           NAME_JOB.onChain.swap_token_to_token_our_dex,
    //           NAME_JOB.onChain.deposit_token_utt_to_spending,
    //           NAME_JOB.onChain.transfer_token_from_source,
    //           NAME_JOB.onChain.transfer_on_chain_token,
    //         ],
    //       },
    //     },
    //   ],
    // });
    // await Promise.all(jobs.map(async job => await job.remove()));
    //
    // let jobs = await agenda.jobs({
    //   // Running
    //   lastRunAt: { $exists: true },
    //   $expr: {
    //     $gt: ['$lastRunAt', '$lastFinishedAt'],
    //   },
    //   name: {
    //     $in: [
    //       NAME_JOB.offChain.withdraw_token_utt,
    //       NAME_JOB.onChain.swap_token_to_token_our_dex,
    //       NAME_JOB.onChain.deposit_token_utt_to_spending,
    //       NAME_JOB.onChain.transfer_token_from_source,
    //       NAME_JOB.onChain.transfer_on_chain_token,
    //     ],
    //   },
    // });
    // await Promise.all(jobs.map(async job => await job.remove()));
    //
    //
    // let findDuplicates = arr => arr.filter((item, index) => arr.indexOf(item) !== index);
    // let jobs = await agenda.jobs(
    //   {
    //     $and: [
    //       // Scheduled
    //       { nextRunAt: { $exists: true } },
    //       { $expr: { $gte: ['$nextRunAt', new Date()] } },
    //       {
    //         name: {
    //           $in: [NAME_JOB.fake_actives.execute_fake_actives],
    //         },
    //       },
    //       {
    //         'data.date': '2023-09-01',
    //       },
    //     ],
    //   },
    //   { 'data.index': -1 },
    // );
    // console.log(jobs);

    // let listIndex = [];
    // for (let i = 0; i < jobs.length; i++) {
    //   let job = jobs[i];
    //   if (listIndex.includes(job.attrs.data.index)) {
    //     await job.remove();
    //     console.log(`Removed: ${job.attrs.data.index}`);
    //   } else {
    //     listIndex.push(job.attrs.data.index);
    //   }
    // }
    //
    //
    // let jobs = await agenda.jobs({ _id: { $eq: new mongoose.Types.ObjectId('64f0d9ec1a7a1da26d86f95a') } });
    // let job = jobs.at(0);
    // const isDuplicate = await checkDuplicateOrRunAgainJob({ job });
    // console.log(isDuplicate);
    //
    //
    // let jobs = await agenda.jobs({
    //   'name': NAME_JOB.fake_actives.execute_fake_actives,
    //   'data.chain_id': '56',
    //   'data.is_daily': true,
    //   'data.id_execute': new mongoose.Types.ObjectId('64f0920112aa455ed0b1345d'),
    //   'data.date': '2023-09-01',
    //   'data.index': 2445,
    //   'shouldSaveResult': false,
    //   '$or': [{ failCount: { $exists: false } }, { failCount: { $lt: 5 } }],
    // });
    // console.log(jobs.length);
    //
    //
    // let jobs = await getJobsByType(STATUS_JOB.queued);
    // await Promise.all(
    //   jobs.map(async (job, i) => {
    //     await sleep(i * 100);
    //     await job.run();
    //   }),
    // );
    //
    //
    // let jobs = await agenda.jobs({ _id: { $eq: new mongoose.Types.ObjectId('64f5466b8ba96a766bcdff18') } });
    // await jobs[0].run();
    //
    //
    // let jobs = await agenda.jobs({
    //   $and: [
    //     // Scheduled
    //     { nextRunAt: { $exists: true } },
    //     { $expr: { $gte: ['$nextRunAt', new Date()] } },
    //     { 'data.date': '2023-10-18' },
    //     { 'data.schedule_id': new mongoose.Types.ObjectId('652bbee83db6856a92a78db7') },
    //     {
    //       name: {
    //         $in: [
    //           NAME_JOB.offChain.withdraw_token_utt,
    //           NAME_JOB.onChain.swap_token_to_token_our_dex,
    //           NAME_JOB.onChain.deposit_token_utt_to_spending,
    //           NAME_JOB.onChain.transfer_token_from_source,
    //           NAME_JOB.onChain.transfer_on_chain_token,
    //         ],
    //       },
    //     },
    //   ],
    // });
    // console.log(jobs);
    console.log('done');
  });
};
main();
