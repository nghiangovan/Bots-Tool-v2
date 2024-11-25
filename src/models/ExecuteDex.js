import { Schema, model } from 'mongoose';

const ExecuteDexSchema = new Schema(
  {
    chain_id: { type: String, required: true },
    schedule_id: { type: String, required: true },
    date: { type: String, required: true },
    jobs: [
      {
        name_job: { type: String, required: true },
        index: { type: Number, required: true },
        job_id: { type: Schema.Types.ObjectId },
        run_at: { type: Date },
        index_wallet_in: { type: Number },
        index_wallet_out: { type: Number },
        address_wallet_in: { type: String },
        address_wallet_out: { type: String },
        symbol_token_in: { type: String },
        symbol_token_out: { type: String },
        rangeRandomTimeRun: [{ type: Number }],
        unitRandomTimeRun: { type: String, default: null },
        amount: { type: String, default: null },
        amountOut: { type: String, default: null },
      },
    ],
    index_wallets: [{ type: Number, required: true }],
    adress_wallets: [{ type: String }],
    stop_current: { type: Number, default: 0, required: true },
    is_repeat: { type: Boolean, default: false },
    is_done: { type: Boolean, default: false },
    is_gap: { type: Boolean, default: false },
    status: { type: String, default: null },
    error: { type: String, default: null },
  },
  { timestamps: true },
);

const ExecuteDexModel = model('ExecuteDexModel', ExecuteDexSchema);

ExecuteDexModel.collection.createIndex({ date: 1 });
ExecuteDexModel.collection.createIndex({ chain_id: 1 });
ExecuteDexModel.collection.createIndex({ is_done: 1 });
ExecuteDexModel.collection.createIndex({ status: 1 });

// ExecuteDexModel.collection.dropIndexes();

// ExecuteDexModel.collection
//   .getIndexes({ full: true })
//   .then(indexes => {
//     console.log('indexes:', indexes);
//   })
//   .catch(console.error);

export default ExecuteDexModel;
