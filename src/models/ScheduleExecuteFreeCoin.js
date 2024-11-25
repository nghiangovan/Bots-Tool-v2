import { Schema, model } from 'mongoose';

const ScheduleExecuteFreeCoinSchema = new Schema(
  {
    chain_id: { type: String, required: true },
    date: { type: String, required: true },
    kpi_uaw: { type: Number, required: true }, // number wallets
    number_new_wallets: { type: Number, required: true },
    amount_max: { type: String, default: '0' }, // USD
    amount_min: { type: String, default: '0' }, // USD
    is_repeat: { type: Boolean, default: true },
    is_scheduled: { type: Boolean, default: false },
    list_index_wallets_used: [{ type: Number, default: [] }],
    list_id_execute_template: [{ type: String, default: [] }],
  },
  { timestamps: true },
);

const ScheduleExecuteFreeCoinModel = model('ScheduleExecuteFreeCoinModel', ScheduleExecuteFreeCoinSchema);

ScheduleExecuteFreeCoinModel.collection.createIndex({ chain_id: 1 });
ScheduleExecuteFreeCoinModel.collection.createIndex({ date: 1 });
ScheduleExecuteFreeCoinModel.collection.createIndex({ is_repeat: 1 });
ScheduleExecuteFreeCoinModel.collection.createIndex({ is_scheduled: 1 });

// ScheduleExecuteFreeCoinModel.collection.dropIndexes();

// ScheduleExecuteFreeCoinModel.collection
//   .getIndexes({ full: true })
//   .then(indexes => {
//     console.log('indexes:', indexes);
//   })
//   .catch(console.error);

export default ScheduleExecuteFreeCoinModel;
