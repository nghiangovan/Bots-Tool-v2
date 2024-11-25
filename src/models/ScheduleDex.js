import mongoose, { Schema, model } from 'mongoose';

const ScheduleDexSchema = new Schema(
  {
    date: { type: String, required: true },
    chain_id: { type: String, required: true },
    kpi_uaw: { type: Number, required: true }, // number wallets
    kpi_volume: { type: mongoose.Types.Decimal128, required: true },
    number_new_wallets: { type: Number, required: true },
    is_repeat: { type: Boolean, default: true },
    is_scheduled: { type: Boolean, default: false },
    average_volume: { type: mongoose.Types.Decimal128, default: 0 },
    random_gaps_buy_sell: { type: Number, default: 0 },
    list_id_execute: [{ type: String, default: [] }],
    list_index_wallets_used: [{ type: Number, default: [] }],
  },
  { timestamps: true },
);

const ScheduleDexModel = model('ScheduleDexModel', ScheduleDexSchema);

ScheduleDexModel.collection.createIndex({ chain_id: 1 });
ScheduleDexModel.collection.createIndex({ date: 1 });
ScheduleDexModel.collection.createIndex({ is_repeat: 1 });
ScheduleDexModel.collection.createIndex({ is_scheduled: 1 });

// ScheduleDexModel.collection.dropIndexes();

// ScheduleDexModel.collection
//   .getIndexes({ full: true })
//   .then(indexes => {
//     console.log('indexes:', indexes);
//   })
//   .catch(console.error);

export default ScheduleDexModel;
