/* eslint-disable no-undef */
import { connectMongoDB } from '../../../database/conection.js';
import WalletModel from '../../models/Wallet.js';

const main = async () => {
  connectMongoDB();
  const chain_id = 56;
  // const lowerLimit = 2500;
  // const upperLimit = 17000;
  // await WalletModel.deleteMany({ $and: [{ index: { $gte: lowerLimit } }, { index: { $lte: upperLimit } }] });
  const lowerLimit = 1500;
  await WalletModel.deleteMany({ chain_id, index: { $gt: lowerLimit } });
  let indexMinCurrent = await WalletModel.findOne({ chain_id }).sort({ index: 1 });
  console.log('Min Index: ', indexMinCurrent.index);
  let indexMaxCurrent = await WalletModel.findOne({ chain_id }).sort({ index: -1 });
  console.log('Max Index: ', indexMaxCurrent.index);
  let numberWallets = await WalletModel.countDocuments({ chain_id });
  console.log('Number Wallets: ', numberWallets);
  console.log('done');
  return process.exit(0);
};
main();
