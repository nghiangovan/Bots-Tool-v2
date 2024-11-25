/* eslint-disable no-undef */
import { connectMongoDB } from '../../../database/conection.js';
import WalletExecuteDexModel from '../../models/WalletExecuteDex.js';

const main = async () => {
  connectMongoDB();
  const chainId = 56;
  const chain_id = chainId.toString();
  let indexMinCurrent = await WalletExecuteDexModel.findOne({ chain_id }).sort({ index_1: 1 });
  console.log('Min Index: ', indexMinCurrent.index_1);
  let indexMaxCurrent = await WalletExecuteDexModel.findOne({ chain_id }).sort({ index_4: -1 });
  console.log('Max Index: ', indexMaxCurrent.index_4);
  let numberWalletsExecuteDex = await WalletExecuteDexModel.countDocuments({ chain_id });
  console.log('Number Wallets Execute DEX: ', numberWalletsExecuteDex);
  console.log('done');
  return process.exit(0);
};
main();
