/* eslint-disable no-undef */
import { connectMongoDB } from '../../../database/conection.js';
import WalletExecuteDexModel from '../../models/WalletExecuteDex.js';

const main = async () => {
  connectMongoDB();
  const chain_id = 56;
  // const lowerLimit = 2500;
  // const upperLimit = 17000;
  // await WalletModel.deleteMany({ $and: [{ index: { $gte: lowerLimit } }, { index: { $lte: upperLimit } }] });
  const lowerLimit = 15001;
  await WalletExecuteDexModel.deleteMany({ chain_id, index_1: { $gt: lowerLimit } });
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
