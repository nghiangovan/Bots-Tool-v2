import { Schema, model } from 'mongoose';

const ExecuteTemplateSchema = new Schema(
  {
    chain_id: { type: String, required: true },
    schedule_id: { type: String, required: true },
    is_repeat: { type: Boolean, required: true },
    is_reschedule: { type: Boolean, default: false },
    template: { type: String, required: true },
    template_id: { type: String, required: true },
    date: { type: String, required: true },
    jobs: [
      {
        name_job: { type: String, required: true },
        index: { type: Number, required: true },
        job_id: { type: Schema.Types.ObjectId },
        i_index_wallets_in: { type: Number }, // in index_wallets
        i_index_wallets_out: { type: Number }, // index_wallets
        index_wallet_in: { type: Number }, // in root mnemmonic
        index_wallet_out: { type: Number }, // in root mnemmonic
        symbol_token_in: { type: String },
        symbol_token_out: { type: String },
        run_at: { type: Date },
        amount: { type: String, default: null },
        amountOut: { type: String, default: null },
        async_job_id_game: { type: String, default: null },
        is_split: { type: Boolean, default: false },
        index_wallet_split: { type: Number },
        is_leave_an_amount: { type: Boolean, default: false },
        is_gap: { type: Boolean, default: false }, // this job is gap to many sub-jobs to increase buyers or sellers
        index_wallet_gap: { type: Number },
      },
    ],
    index_wallets: [{ type: Number, required: true }],
    stop_current: { type: Number, default: 0, required: true },
    is_done: { type: Boolean, default: false },
    status: { type: String, default: null },
    error: { type: String, default: null },
  },
  { timestamps: true },
);

const ExecuteTemplateModel = model('ExecuteTemplateModel', ExecuteTemplateSchema);

ExecuteTemplateModel.collection.createIndex({ chain_id: 1 });
ExecuteTemplateModel.collection.createIndex({ is_repeat: 1 });
ExecuteTemplateModel.collection.createIndex({ date: 1 });
ExecuteTemplateModel.collection.createIndex({ is_done: 1 });
ExecuteTemplateModel.collection.createIndex({ status: 1 });

// ExecuteTemplateModel.collection.dropIndexes();

// ExecuteTemplateModel.collection
//   .getIndexes({ full: true })
//   .then(indexes => {
//     console.log('indexes:', indexes);
//   })
//   .catch(console.error);

export default ExecuteTemplateModel;
