import { Schema, model } from 'mongoose';
import { getWalletByIndexOffChain } from '../handlers/common.js';

const ExecuteActivesSchema = new Schema(
  {
    chain_id: { type: String, required: true },
    is_daily: { type: Boolean, required: true },
    date: { type: String, required: true },
    number_buff_gas_batch: { type: Number, required: true },
    from_index_wallet: { type: Number, default: 0 },
    number_wallets: { type: Number },
    stop_execute: { type: Boolean, default: false },
    index_buff_gas_recent: { type: Number },
    address_buff_gas_recent: { type: String },
    index_completed_recent: { type: Number, default: null },
    address_completed_recent: { type: String, default: null },
    count_completed: { type: Number, default: 0 },
    is_scheduled_done: { type: Boolean, default: false },
    error: { type: String, default: null },
  },
  { timestamps: true },
);

ExecuteActivesSchema.pre('save', function (next) {
  const from_index_wallet = this.get('from_index_wallet');
  this.index_buff_gas_recent = from_index_wallet;
  this.address_buff_gas_recent = getWalletByIndexOffChain({ indexWallet: from_index_wallet }).address;
  next();
});

const ExecuteFakeActivesModel = model('ExecuteFakeActivesModel', ExecuteActivesSchema);

ExecuteFakeActivesModel.collection.createIndex({ chain_id: 1 });
ExecuteFakeActivesModel.collection.createIndex({ is_daily: 1 });
ExecuteFakeActivesModel.collection.createIndex({ date: 1 });
ExecuteFakeActivesModel.collection.createIndex({ is_scheduled_done: 1 });

// ExecuteFakeActivesModel.collection.dropIndexes();

// ExecuteFakeActivesModel.collection
//   .getIndexes({ full: true })
//   .then(indexes => {
//     console.log('indexes:', indexes);
//   })
//   .catch(console.error);

export default ExecuteFakeActivesModel;
