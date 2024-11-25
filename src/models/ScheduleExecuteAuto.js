import mongoose, { Schema, model } from 'mongoose';

const ScheduleExecuteAutoSchema = new Schema(
  {
    chain_id: { type: String, required: true },
    date: { type: String, required: true },
    kpi_uaw: { type: Number, required: true }, // number wallets
    kpi_volume: { type: mongoose.Types.Decimal128, required: true },
    number_new_wallets: { type: Number, required: true },
    is_repeat: { type: Boolean, default: true },
    is_scheduled: { type: Boolean, default: false },
    random_gaps_buy_sell: { type: Number, default: 0 },
    list_index_wallets_used: [{ type: Number, default: [] }],
    list_id_execute_template: [{ type: String, default: [] }],
  },
  { timestamps: true },
);

const ScheduleExecuteAutoModel = model('ScheduleExecuteAutoModel', ScheduleExecuteAutoSchema);

ScheduleExecuteAutoModel.collection.createIndex({ chain_id: 1 });
ScheduleExecuteAutoModel.collection.createIndex({ date: 1 });
ScheduleExecuteAutoModel.collection.createIndex({ is_repeat: 1 });
ScheduleExecuteAutoModel.collection.createIndex({ is_scheduled: 1 });

// ScheduleExecuteAutoModel.collection.dropIndexes();

// ScheduleExecuteAutoModel.collection
//   .getIndexes({ full: true })
//   .then(indexes => {
//     console.log('indexes:', indexes);
//   })
//   .catch(console.error);

export default ScheduleExecuteAutoModel;
