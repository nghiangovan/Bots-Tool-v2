import { Schema, model } from 'mongoose';

const ExecuteTemplateFreeCoinSchema = new Schema(
  {
    chain_id: { type: String, required: true },
    schedule_id: { type: String, required: true },
    is_repeat: { type: Boolean, required: true },
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

const ExecuteTemplateFreeCoinModel = model('ExecuteTemplateFreeCoinModel', ExecuteTemplateFreeCoinSchema);

ExecuteTemplateFreeCoinModel.collection.createIndex({ chain_id: 1 });
ExecuteTemplateFreeCoinModel.collection.createIndex({ is_repeat: 1 });
ExecuteTemplateFreeCoinModel.collection.createIndex({ date: 1 });
ExecuteTemplateFreeCoinModel.collection.createIndex({ is_done: 1 });
ExecuteTemplateFreeCoinModel.collection.createIndex({ status: 1 });

// ExecuteTemplateFreeCoinModel.collection.dropIndexes();

// ExecuteTemplateFreeCoinModel.collection
//   .getIndexes({ full: true })
//   .then(indexes => {
//     console.log('indexes:', indexes);
//   })
//   .catch(console.error);

export default ExecuteTemplateFreeCoinModel;
