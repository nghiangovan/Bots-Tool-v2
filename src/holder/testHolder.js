import mongoose from 'mongoose';
import { connectMongoDB } from '../../database/conection.js';
import WalletSkimModel from '../models/WalletSkim.js';
import agendaHolder from './agendaHolder.js';
import { sleep } from '../../utils/utils.js';
import axios from 'axios';
import { API_KEY_SCAN, BASE_URL_API_SCAN } from '../../utils/constant.js';
import { getMapToken } from '../../configs/addresses.js';
import { NAME_JOB, SYMBOL_TOKEN } from '../../utils/enum.js';
import { randomDatetimesFromRange, randomFloatBetween } from '../../utils/random.js';
import moment from 'moment';
import ExecuteFakeHoldersModel from '../models/ExecuteFakeHolders.js';

const main = async () => {
  connectMongoDB();
  // const chain_id = 56;
  // let indexMaxHolder = await WalletSkimModel.findOne({ chain_id, holding_amount: { $gte: 0 } })
  //   .sort({ index: -1 })
  //   .limit(1);
  // console.log(indexMaxHolder);
  //
  //
  // await sleep(1000);
  // let jobs = await agendaHolder.jobs({ _id: { $eq: new mongoose.Types.ObjectId('652533399689154cae4cb838') } });
  // await jobs[0].run();
  //
  //
  // let indexMaxHolder = await WalletSkimModel.findOne({ chain_id: 56, holding_amount: { $gt: 0 } }).sort({ index: -1 });
  // console.log(indexMaxHolder.index, indexMaxHolder.holding_amount.toString());
  //
  //
  // await sleep(1000);
  // const chain_id = 56;
  // const token = getMapToken(chain_id, SYMBOL_TOKEN.LCR);
  // if (!token) throw { error: `Token ${SYMBOL_TOKEN.LCR} not supported` };
  // const addressToken = token.address;

  // let index = 0;
  // let numnerHolder = 0;
  // do {
  //   index++;
  //   const url = `${BASE_URL_API_SCAN[chain_id]}?module=token&action=tokenholderlist&contractaddress=${addressToken}&page=${index}&offset=100000&apikey=${API_KEY_SCAN[chain_id]}`;
  //   let res = await axios.get(url);
  //   numnerHolder += parseInt(res.data.result.length);
  // } while (numnerHolder == index * 10000);
  //
  //
  // await sleep(1000);
  // let jobs = await agendaHolder.jobs({
  //   $and: [
  //     // Scheduled
  //     { nextRunAt: { $exists: true } },
  //     { $expr: { $gte: ['$nextRunAt', new Date()] } },
  //     {
  //       name: {
  //         $in: [NAME_JOB.holder.withdraw_increase_holders],
  //       },
  //     },
  //   ],
  // });
  // await Promise.all(jobs.map(async job => await job.remove()));
  //
  //
  // const scheduleTime = randomDatetimesFromRange(
  //   moment().add(5, 'minutes'),
  //   moment('2023-10-16').add(24, 'hours'),
  //   15269,
  // );
  // console.log(scheduleTime);
  //
  //
  // await sleep(1000);
  // const date = '2023-10-16';
  // let jobs = await agendaHolder.jobs(
  //   {
  //     $and: [
  //       // Scheduled
  //       { nextRunAt: { $exists: true } },
  //       { $expr: { $gte: ['$nextRunAt', new Date()] } },
  //       {
  //         name: {
  //           $in: [NAME_JOB.holder.withdraw_increase_holders],
  //         },
  //       },
  //       {
  //         'data.date': date,
  //       },
  //     ],
  //   },
  //   { 'data.index': -1 },
  // );
  // let listIndex = [];
  // for (let i = 0; i < jobs.length; i++) {
  //   let job = jobs[i];
  //   if (listIndex.includes(job.attrs.data.index)) {
  //     await job.remove();
  //     console.log(`Dupllicate Job Queue -> Removed: ${job.attrs.data.index}`);
  //   } else {
  //     listIndex.push(job.attrs.data.index);
  //   }
  // }
  //
  //
  // const random = parseFloat(randomFloatBetween(2000, 8000)).toFixed(0);
  // console.log(random);
  //
  //
  // await sleep(1000);
  // let infoExecute = await ExecuteFakeHoldersModel.findOne({
  //   chain_id: '56',
  //   is_daily: true,
  //   date: '2023-10-16',
  //   is_scheduled_done: false,
  // });
  // console.log(infoExecute._id.toString());
  //
  //
  // const chain_id = 56;
  // const token = getMapToken(chain_id, SYMBOL_TOKEN.LCR);
  // if (!token) throw { error: `Token ${SYMBOL_TOKEN.LCR} not supported` };
  // const addressToken = token.address;
  // let index = 1;
  // let currentHolder = 0;
  // let temp = null;
  // do {
  //   const url = `${BASE_URL_API_SCAN[chain_id]}?module=token&action=tokenholderlist&contractaddress=${addressToken}&page=${index}&offset=100000&apikey=${API_KEY_SCAN[chain_id]}`;
  //   let res = await axios.get(url);
  //   temp = parseInt(res.data.result.length);
  //   currentHolder += temp;
  //   index++;
  // } while (temp > 0);
  // console.log(currentHolder);
  //
  //
  // let numbderHolders = await WalletSkimModel.find({ chain_id: 56, holding_amount: { $gt: 0 } });
  // console.log(numbderHolders.length);
  // console.log('done');
};
main();
