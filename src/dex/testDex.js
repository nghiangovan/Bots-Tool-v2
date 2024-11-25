import mongoose from 'mongoose';
import { connectMongoDB } from '../../database/conection.js';
import { getProvider } from '../../utils/blockchain.js';
import { etherToWei, formatFloorNearest } from '../../utils/format.js';
import ExecuteDexModel from '../models/ExecuteDex.js';
import LogModel from '../models/Log.js';
import agendaDex from './agendaDex.js';
import { NAME_JOB, SYMBOL_TOKEN } from '../../utils/enum.js';
import moment from 'moment';
import { FORMAT_DATE } from '../../utils/time.js';
import { arrayRange } from '../../utils/index.js';
import { randomFloatBetween } from '../../utils/random.js';
import { sleep } from '../../utils/utils.js';
import { exportArrayToCsv } from '../../utils/export.js';
import { calcSmallerAmount } from './services/execute.js';
import { hasDecimal as hasDecimal } from '../../utils/number.js';
import WalletSkimModel from '../models/WalletSkim.js';
import WalletExecuteDexModel from '../models/WalletExecuteDex.js';

const main = async () => {
  connectMongoDB();
  // const chainId = 56;
  // const provider = await getProvider(chainId);
  // const receipt = await provider.getTransaction('0xe35b7edfe3dc198a44a4461ef62709a593f1e67c5bd5ee262d7b68325c2fd637');
  // const nonce = await provider.getTransactionCount('0xD4fA1938ADe8495A70318b46ACB1C67A6829f1EC');
  // console.log(nonce, receipt);
  //
  //
  // const balance = etherToWei('10161317131940528972');
  // console.log(balance.toString());
  //
  //
  // // Report Fee Gas For Run Execute Dex
  // const logs = await LogModel.find({
  //   schedule_id: new mongoose.Types.ObjectId('6568631cdaf3904b4609d09d'),
  //   tx_hash: { $exists: true },
  // });
  // const logs_transfer_token_from_source = logs.filter(log => log.type === NAME_JOB.dex.transfer_token_from_source);
  // const logs_swap_token_in_our_dex = logs.filter(log => log.type === NAME_JOB.dex.swap_token_to_token_our_dex);
  // const fee_tranfer_token_from_source = logs_transfer_token_from_source.reduce((total, log) => total + log.gas_fee, 0);
  // const fee_swap_token_in_our_dex = logs_swap_token_in_our_dex.reduce((total, log) => total + log.gas_fee, 0);
  // const total_fee_transfer_and_swap = fee_tranfer_token_from_source + fee_swap_token_in_our_dex;
  // const total_fee_gas = logs.filter(log => log?.tx_hash).reduce((total, log) => total + log.gas_fee, 0);
  // const total_lcr_transfer_from_source = logs_transfer_token_from_source
  //   .filter(log => log.token_in === SYMBOL_TOKEN.LCR)
  //   .reduce((total, log) => total + log.amount, 0);
  // const total_usdt_transfer_from_source = logs_transfer_token_from_source
  //   .filter(log => log.token_in === SYMBOL_TOKEN.USDT)
  //   .reduce((total, log) => total + log.amount, 0);
  // const wallets_dest = logs_transfer_token_from_source
  //   .map(log => log.wallet_address_2)
  //   .filter((value, index, self) => self.indexOf(value) === index);
  // const str_date = moment('2023-12-01').format(FORMAT_DATE).toString();
  // const time_created_at = new Date(str_date);
  // const logs_buff_fee_gas = await LogModel.find({
  //   type: NAME_JOB.onChain.buff_gas_fee,
  //   wallet_address_2: { $in: wallets_dest },
  //   createdAt: { $gte: time_created_at },
  // });
  // const total_buff_fee_gas = logs_buff_fee_gas.reduce((total, log) => total + log.amount, 0);
  // const fee_txs_buff_fee_gas = logs_buff_fee_gas.reduce((total, log) => total + log.gas_fee, 0);

  // console.log('---------------------------- USDT + LCR --------------------------------');
  // console.log('- Total LCR transfer from source:              ', total_lcr_transfer_from_source);
  // console.log('- Total USDT transfer from source:             ', total_usdt_transfer_from_source);
  // console.log('\n');
  // console.log('------------------------- Fee Gas Execute ------------------------------');
  // console.log('- Fee tranfer token from source:               ', fee_tranfer_token_from_source);
  // console.log('- Fee swap token in our dex:                   ', fee_swap_token_in_our_dex);
  // console.log('- Total fee transfer + swap:                   ', total_fee_transfer_and_swap);
  // console.log('- Total fee gas (Filter all logs have tx hash):', total_fee_gas);
  // console.log('\n');
  // console.log('----------------------------- Buff Gas ---------------------------------');
  // console.log('- Total buff fee gas:                          ', total_buff_fee_gas);
  // console.log('- Fee tx buff gas:                             ', fee_txs_buff_fee_gas);
  // exportArrayToCsv({
  //   data: logs_transfer_token_from_source.sort((a, b) => a.index_wallet_2 - b.index_wallet_2),
  //   columns: ['index_wallet_2', 'wallet_address_2', 'amount', 'gas_fee', 'token_in', 'token_out'],
  //   fileName: 'logs_transfer_token_from_source.csv',
  // });
  //
  //
  // const array = arrayRange({ start: 0, stop: 99, step: 1 });
  // console.log(array);
  //
  //
  // for (let index = 0; index < 100; index++) {
  //   const amount = formatFloorNearest(randomFloatBetween(0.01, 0.1));
  //   console.log(amount);
  // }
  //
  //
  // await sleep(1000);
  // const jobs = await agendaDex.jobs({ 'data.is_gap': true });
  // await jobs[0].run();
  //
  //
  // for (let index = 0; index < 100; index++) {
  //   const result = calcSmallerAmount(48.7 / (52.9 + 48.7), 48.7, 27.4);
  //   console.log(result);
  // }
  //
  //
  // await sleep(1000);
  // const regex = /is insufficient to swap sender/;
  // let jobsFailed = await agendaDex.jobs({
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
  // for (let idx = 0; idx < jobsFailed.length; idx++) {
  //   let job = jobsFailed[idx];
  //   const amount = parseFloat(job.attrs.data.amount);
  //   const index = job.attrs.data.index;
  //   const execute_id = job.attrs.data.execute_id;
  //   if ((!amount || Number.isNaN(amount)) && (index == 8 || index == 0)) {
  //     await job.remove();
  //     const schedule_jobs = await agendaDex.jobs({
  //       'name': NAME_JOB.dex.schedule_execute_jobs,
  //       'data.execute_id': execute_id,
  //     });
  //     if (schedule_jobs.length > 0) await schedule_jobs[0].run();
  //     continue;
  //   }
  //   if (hasDecimal(amount) > 5) {
  //     const execute = await ExecuteDexModel.findById(execute_id);
  //     for (let i = 0; i < execute.jobs.length; i++) {
  //       const j = execute.jobs[i];
  //       if (hasDecimal(j.amount) > 5) {
  //         if (j.job_id) {
  //           let jobQueue = await agendaDex.jobs({ _id: j.job_id });
  //           if (jobQueue.length > 0) {
  //             const numFormated = formatFloorNearest(j.amount);
  //             jobQueue[0].attrs.data.amount = numFormated;
  //             await jobQueue[0].save();
  //             await execute.updateOne({ $set: { [`jobs.${i}.amount`]: formatFloorNearest(j.amount) } });
  //           }
  //         } else {
  //           await execute.updateOne({ $set: { [`jobs.${i}.amount`]: formatFloorNearest(j.amount) } });
  //         }
  //       }
  //     }
  //     continue;
  //   }

  //   if (regex.test(job?.attrs?.failReason?.toString())) {
  //     await job.remove();
  //     const schedule_jobs = await agendaDex.jobs({
  //       'name': NAME_JOB.dex.schedule_execute_jobs,
  //       'data.execute_id': execute_id,
  //     });
  //     if (schedule_jobs.length > 0) await schedule_jobs[0].run();
  //     continue;
  //   }
  // }
  //
  //

  // let jobQueue = await agendaDex.jobs({ _id: new mongoose.Types.ObjectId('656af0c079f609a6207317ab') });
  // jobQueue[0].attrs.data.amount = formatFloorNearest(jobQueue[0].attrs.data.amount);
  // await jobQueue[0].save();
  //
  //

  // await sleep(1000);
  // let wallet = await WalletSkimModel.findOne({ chain_id: '56', index: 10000 });
  // await wallet.updateOne({ holding_amount: 1307.40148157 });

  //
  //
  // await sleep(1000);
  // let jobQueue = await agendaDex.jobs({ _id: new mongoose.Types.ObjectId('656bee02e8e62ff85c34d9d3') });
  // await jobQueue[0].remove();
  // const execute_id = jobQueue[0].attrs.data.execute_id;
  // const schedule_jobs = await agendaDex.jobs({
  //   'name': NAME_JOB.dex.schedule_execute_jobs,
  //   'data.execute_id': execute_id,
  // });
  // if (schedule_jobs.length > 0) await schedule_jobs[0].run();

  //
  //
  // let jobQueue = await agendaDex.jobs({ _id: new mongoose.Types.ObjectId('656bd82b12a13e1d166f106c') });
  // const amount = 10;
  // const numFormated = formatFloorNearest(amount);
  // jobQueue[0].attrs.data.amount = numFormated;
  // await jobQueue[0].save();
  // const execute_id = jobQueue.attrs.data.execute_id;
  // const i = jobQueue.attrs.data.index;
  // await ExecuteDexModel.findById(execute_id).updateOne({ $set: { [`jobs.${i}.amount`]: formatFloorNearest(amount) } });
  //
  //
  // const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
  // console.log(currentTime);
  //
  //
  // const logs = await LogModel.find({
  //   schedule_id: new mongoose.Types.ObjectId('6569f5c1b60a372404f2ce06'),
  //   tx_hash: { $exists: true },
  //   // status: true,
  //   type: NAME_JOB.dex.swap_token_to_token_our_dex,
  // });
  // const volumes = logs.reduce((total, log) => total + log.amount, 0);
  // console.log(volumes);
  //
  //
  // await sleep(1000);
  // let jobs = await agendaDex.jobs({
  //   $and: [
  //     // Scheduled
  //     { nextRunAt: { $exists: true } },
  //     { $expr: { $gte: ['$nextRunAt', new Date()] } },
  //     {
  //       name: {
  //         $in: [
  //           NAME_JOB.dex.schedule_execute_jobs,
  //           NAME_JOB.dex.swap_token_to_token_our_dex,
  //           NAME_JOB.dex.transfer_token_from_source,
  //         ],
  //       },
  //     },
  //   ],
  // });
  // await Promise.all(jobs.map(async job => await job.remove()));
  //
  //
  // const wallets = await WalletExecuteDexModel.find({ chain_id: '56', is_using: true });
  // console.log(wallets.length);
  //
  //
  // await sleep(1000);
  // const execute_id = new mongoose.Types.ObjectId('657199016b9232c930bf2965');
  // let jobs = await agendaDex.jobs({ _id: execute_id });
  // const job = jobs?.at(0);
  // await job.remove();
  // const schedule_jobs = await agendaDex.jobs({
  //   'name': NAME_JOB.dex.schedule_execute_jobs,
  //   'data.execute_id': execute_id,
  // });
  // if (schedule_jobs.length > 0) await schedule_jobs[0].run();
  //
  //
  // await sleep(1000);
  // const wallet = await WalletSkimModel.findOne({
  //   chain_id: '56',
  //   address: { $regex: new RegExp('^' + '0xAa5A49F3248992Ff97dEA116841141e3F4DbD3a1'.toLowerCase(), 'i') },
  // });
  // console.log(wallet);
  //
  //
  // await sleep(1000);
  // const wallet = await WalletSkimModel.findOne({ chain_id: '56', index: 10611 });
  // console.log(wallet);
  console.log('done');
};

main();
