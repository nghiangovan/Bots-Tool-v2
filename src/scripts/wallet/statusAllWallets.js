/* eslint-disable no-undef */
import { connectMongoDB } from '../../../database/conection.js';
import WalletModel from '../../models/Wallet.js';

const main = async ({ chain_id, is_using }) => {
  connectMongoDB();
  await WalletModel.updateMany({ chain_id }, { is_using });
  console.log('done');
  return process.exit(0);
};
main({ chain_id: 56, is_using: false });
