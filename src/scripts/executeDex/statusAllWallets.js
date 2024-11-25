/* eslint-disable no-undef */
import { connectMongoDB } from '../../../database/conection.js';
import WalletExecuteDexModel from '../../models/WalletExecuteDex.js';

const main = async ({ chain_id, is_using }) => {
  connectMongoDB();
  await WalletExecuteDexModel.updateMany({ chain_id }, { is_using });
  console.log('done');
  return process.exit(0);
};
main({ chain_id: 56, is_using: false });
