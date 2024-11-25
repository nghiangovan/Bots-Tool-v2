import { Schema, model } from 'mongoose';

const HistoryBalancesSchema = new Schema(
  {
    balances: { type: String, required: true },
    date: { type: String, required: true },
    time_cache: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

HistoryBalancesSchema.index({ date: 1, time_cache: 1 });

const HistoryBalancesModel = model('HistoryBalancesModel', HistoryBalancesSchema);

HistoryBalancesModel.collection.createIndex({ date: 1 });
HistoryBalancesModel.collection.createIndex({ time_cache: 1 });

// HistoryBalancesModel.collection.dropIndexes();

// HistoryBalancesModel.collection
//   .getIndexes({ full: true })
//   .then(indexes => {
//     console.log('indexes:', indexes);
//   })
//   .catch(console.error);

export default HistoryBalancesModel;
