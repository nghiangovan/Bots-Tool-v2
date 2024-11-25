import { Schema, model } from 'mongoose';
import { TYPE_FAKE_HOLDER } from '../../utils/enum.js';

const ExecuteFakeHoldersSchema = new Schema(
  {
    type: { type: String, enum: Object.keys(TYPE_FAKE_HOLDER) },
    is_daily: { type: Boolean, default: false },
    chain_id: { type: String, required: true },
    date: { type: String, required: true },
    target_holders: { type: Number, required: true },
    number_holders: { type: Number },
    number_buff_gas_batch: { type: Number },
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

const ExecuteFakeHoldersModel = model('ExecuteFakeHoldersModel', ExecuteFakeHoldersSchema);

ExecuteFakeHoldersModel.collection.createIndex({ type: 1 });
ExecuteFakeHoldersModel.collection.createIndex({ chain_id: 1 });
ExecuteFakeHoldersModel.collection.createIndex({ date: 1 });
ExecuteFakeHoldersModel.collection.createIndex({ is_scheduled_done: 1 });

// ExecuteFakeHoldersModel.collection.dropIndexes();

// ExecuteFakeHoldersModel.collection
//   .getIndexes({ full: true })
//   .then(indexes => {
//     console.log('indexes:', indexes);
//   })
//   .catch(console.error);

export default ExecuteFakeHoldersModel;
