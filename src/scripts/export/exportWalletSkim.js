/* eslint-disable no-undef */
import fastcsv from 'fast-csv';
import fs from 'fs';
import { connectMongoDB } from '../../../database/conection.js';
import WalletSkimModel from '../../models/WalletSkim.js';

async function main() {
  connectMongoDB();

  // // filter: holding_amount > 1
  // let result = await WalletSkimModel.find({ chain_id: '56', holding_amount: { $gt: 1 } }).sort({ index: 1 });
  //
  // // filter: index from 10k to 15k
  let result = await WalletSkimModel.find({ chain_id: '56', index: { $gte: 10000, $lte: 15000 } }).sort({ index: 1 });
  result = result.map(item => ({
    chain_id: item.chain_id,
    index: item.index,
    address: item.address,
    holding_amount: parseFloat(item.holding_amount),
  }));

  const ws = fs.createWriteStream('exports/wallets_skim.csv');

  fastcsv
    .write(result, { headers: true })
    .on('finish', function () {
      console.log('Write to wallets_skim.csv successfully!');
    })
    .pipe(ws);
}

main();
