import { Schema, model } from 'mongoose';

const LogSchema = new Schema(
  {
    chain_id: { type: String },
    type: { type: String, required: true },
    status: { type: Boolean, required: true },
    error: { type: String, default: null },
    date: { type: String, default: null },
    wallet_address_1: { type: String },
    wallet_address_2: { type: String },
    index_wallet_1: { type: String },
    index_wallet_2: { type: String },
    amount: { type: Number },
    token_in: { type: String },
    token_out: { type: String },
    amount_fee: { type: String },
    gas_fee: { type: Number },
    tx_hash: { type: String },
    job_id: { type: String },
    job_index: { type: String }, // job index in jobs list of template
    schedule_id: { type: String },
    id_execute: { type: String },
    type_schedule: { type: String },
    id_execute_template: { type: String },
    descriptions: { type: String },
  },
  { timestamps: true },
);

const LogModel = model('LogModel', LogSchema);

LogModel.collection.createIndex({ chain_id: 1 });
LogModel.collection.createIndex({ type: 1 });
LogModel.collection.createIndex({ status: 1 });
LogModel.collection.createIndex({ date: 1 });
LogModel.collection.createIndex({ chain_id: 1, type: 1, status: 1 });

// LogModel.collection.dropIndexes();

// LogModel.collection
//   .getIndexes({ full: true })
//   .then(indexes => {
//     console.log('indexes:', indexes);
//   })
//   .catch(console.error);

export const logs = async ({
  chain_id,
  type,
  status,
  error,
  date,
  wallet_address_1,
  wallet_address_2,
  index_wallet_1,
  index_wallet_2,
  amount,
  token_in,
  token_out,
  amount_fee,
  gas_fee,
  tx_hash,
  job_id,
  job_index,
  schedule_id,
  id_execute,
  type_schedule,
  id_execute_template,
  descriptions,
}) => {
  let data = {};
  if (chain_id !== undefined) data.chain_id = chain_id;
  if (type !== undefined) data.type = type;
  if (status !== undefined) data.status = status;
  if (error !== undefined) data.error = error;
  if (date !== undefined) data.date = date;
  if (wallet_address_1 !== undefined) data.wallet_address_1 = wallet_address_1;
  if (wallet_address_2 !== undefined) data.wallet_address_2 = wallet_address_2;
  if (index_wallet_1 !== undefined) data.index_wallet_1 = index_wallet_1;
  if (index_wallet_2 !== undefined) data.index_wallet_2 = index_wallet_2;
  if (amount !== undefined) data.amount = amount;
  if (token_in !== undefined) data.token_in = token_in;
  if (token_out !== undefined) data.token_out = token_out;
  if (amount_fee !== undefined) data.amount_fee = amount_fee;
  if (gas_fee !== undefined) data.gas_fee = gas_fee;
  if (tx_hash !== undefined) data.tx_hash = tx_hash;
  if (job_id !== undefined) data.job_id = job_id;
  if (job_index !== undefined) data.job_index = job_index;
  if (schedule_id !== undefined) data.schedule_id = schedule_id;
  if (id_execute !== undefined) data.id_execute = id_execute;
  if (type_schedule !== undefined) data.type_schedule = type_schedule;
  if (id_execute_template !== undefined) data.id_execute_template = id_execute_template;
  if (descriptions !== undefined) data.descriptions = descriptions;
  let newLog = new LogModel(data);
  await newLog.save();
};

export default LogModel;
