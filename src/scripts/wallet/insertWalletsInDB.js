/* eslint-disable no-undef */
import { connectMongoDB } from '../../../database/conection.js';
import WalletModel, { saveWalletsByIndexes } from '../../models/Wallet.js';

const main = async () => {
  connectMongoDB();
  const chainId = 56;
  const lowerLimit = 0;
  const upperLimit = 4000;
  const indexWallets = Array.from({ length: upperLimit - lowerLimit }, (_, i) => i + lowerLimit);
  await saveWalletsByIndexes({ chainId, indexWallets, is_using: false });
  let indexMinCurrent = await WalletModel.findOne({ chain_id: chainId }).sort({ index: 1 });
  console.log('Min Index: ', indexMinCurrent.index);
  let indexMaxCurrent = await WalletModel.findOne({ chain_id: chainId }).sort({ index: -1 });
  console.log('Max Index: ', indexMaxCurrent.index);
  let numberWallets = await WalletModel.countDocuments({ chain_id: chainId });
  console.log('Number Wallets: ', numberWallets);
  console.log('done');
  return process.exit(0);
};
main();
