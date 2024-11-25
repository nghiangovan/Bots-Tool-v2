import mongoose, { Schema, model } from 'mongoose';

const ScheduleTemplateSchema = new Schema(
  {
    chain_id: { type: String, required: true },
    date: { type: String, required: true },
    kpi_uaw: { type: Number, required: true }, // number wallets
    kpi_volume: { type: mongoose.Types.Decimal128, required: true },
    number_new_wallets: { type: Number, required: true },
    is_scheduled: { type: Boolean, default: false },
    is_repeat: { type: Boolean, default: false },
    random_gaps_buy_sell: { type: Number, default: 0 },
    list_index_wallets_used: [{ type: Number, default: [] }],
    list_id_execute_template: [{ type: String, default: [] }],
  },
  { timestamps: true },
);

const ScheduleExecuteManualModel = model('ScheduleExecuteManualModel', ScheduleTemplateSchema);

ScheduleExecuteManualModel.collection.createIndex({ chain_id: 1 });
ScheduleExecuteManualModel.collection.createIndex({ date: 1 });
ScheduleExecuteManualModel.collection.createIndex({ is_repeat: 1 });
ScheduleExecuteManualModel.collection.createIndex({ is_scheduled: 1 });

// ScheduleExecuteManualModel.collection.dropIndexes();

// ScheduleExecuteManualModel.collection
//   .getIndexes({ full: true })
//   .then(indexes => {
//     console.log('indexes:', indexes);
//   })
//   .catch(console.error);

export default ScheduleExecuteManualModel;
