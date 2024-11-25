import { Schema, model } from 'mongoose';

const ReportExecuteSchema = new Schema(
  {
    chain_id: { type: String, required: true },
    date: { type: String, required: true },
    uaw_skim: { type: Number },
    uaw_dex: { type: Number },
    total: { type: Number },
  },
  { timestamps: true },
);

const ReportExecuteModel = model('ReportExecuteModel', ReportExecuteSchema);

ReportExecuteModel.collection.createIndex({ date: 1 });
ReportExecuteModel.collection.createIndex({ chain_id: 1 });
ReportExecuteModel.collection.createIndex({ chain_id: 1, date: 1 });

// ReportExecuteModel.collection.dropIndexes();

// ReportExecuteModel.collection
//   .getIndexes({ full: true })
//   .then(indexes => {
//     console.log('indexes:', indexes);
//   })
//   .catch(console.error);

export default ReportExecuteModel;
