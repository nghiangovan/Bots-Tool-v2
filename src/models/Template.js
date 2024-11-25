import { Schema, model } from 'mongoose';
import { TYPE_TEMPLATE } from '../../utils/enum.js';

const TemplateSchema = new Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: Object.keys(TYPE_TEMPLATE), required: true },
    number_jobs: { type: Number, required: true },
    number_wallets: { type: Number, required: true },
    number_uaw: { type: Number, required: true },
    jobs: [
      {
        name_job: { type: String, required: true },
        index: { type: Number, required: true },
        i_index_wallets_in: { type: Number }, // in index_wallets
        i_index_wallets_out: { type: Number }, // in index_wallets
        symbol_token_in: { type: String },
        symbol_token_out: { type: String },
        is_split: { type: Boolean, default: false },
        i_index_wallet_split: { type: Number }, // in index_wallets
        is_leave_an_amount: { type: Boolean, default: false },
      },
    ],
    descriptions: [{ type: String }],
    is_active: { type: Boolean, required: true, default: true },
  },
  { timestamps: true },
);

const TemplateModel = model('TemplateModel', TemplateSchema);

TemplateModel.collection.createIndex({ name: 1 });
TemplateModel.collection.createIndex({ type: 1 });

// TemplateModel.collection.dropIndexes();

// TemplateModel.collection
//   .getIndexes({ full: true })
//   .then(indexes => {
//     console.log('indexes:', indexes);
//   })
//   .catch(console.error);

export default TemplateModel;
