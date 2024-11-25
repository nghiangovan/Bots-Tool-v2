/* eslint-disable no-undef */
import { connectMongoDB } from '../../../database/conection.js';
import WalletExecuteDexModel, { saveWalletsExecuteDexByIndexes } from '../../models/WalletExecuteDex.js';

const main = async () => {
  connectMongoDB();

  const chainId = 56;
  const lowerLimit = 10000;
  const upperLimit = 15740;
  const step = 4;
  const indexWallets = Array.from(
    { length: Math.floor((upperLimit - 1 - lowerLimit) / step) + 1 },
    (_, i) => lowerLimit + i * step,
  );
  await saveWalletsExecuteDexByIndexes({ chainId, indexWallets, activeRecent: null, isUsing: false });
  let indexMinCurrent = await WalletExecuteDexModel.findOne({ chain_id: chainId }).sort({ index_1: 1 });
  console.log('Min Index: ', indexMinCurrent.index_1);
  let indexMaxCurrent = await WalletExecuteDexModel.findOne({ chain_id: chainId }).sort({ index_4: -1 });
  console.log('Max Index: ', indexMaxCurrent.index_4);
  let numberWalletsExecuteDex = await WalletExecuteDexModel.countDocuments({ chain_id: chainId });
  console.log('Number Wallets Execute DEX: ', numberWalletsExecuteDex);
  console.log('done');
  return process.exit(0);
};
main();
