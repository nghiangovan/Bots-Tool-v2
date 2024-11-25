import mongoose, { Schema, model } from 'mongoose';

const ReportBalancesDexSchema = new Schema(
  {
    chain_id: { type: String, required: true },
    date: { type: String, required: true },
    time_cache: { type: Date, default: Date.now },
    total_lcr_pair: { type: mongoose.Types.Decimal128, default: new mongoose.Types.Decimal128('0') },
    total_usdt_pair: { type: mongoose.Types.Decimal128, default: new mongoose.Types.Decimal128('0') },
    total_bnb_source_dex: { type: mongoose.Types.Decimal128, default: new mongoose.Types.Decimal128('0') },
    total_lcr_source_dex: { type: mongoose.Types.Decimal128, default: new mongoose.Types.Decimal128('0') },
    total_usdt_source_dex: { type: mongoose.Types.Decimal128, default: new mongoose.Types.Decimal128('0') },
    number_source_dex: { type: Number, default: 0 },
    total_bnb_bots: { type: mongoose.Types.Decimal128, default: new mongoose.Types.Decimal128('0') },
    total_lcr_bots: { type: mongoose.Types.Decimal128, default: new mongoose.Types.Decimal128('0') },
    total_usdt_bots: { type: mongoose.Types.Decimal128, default: new mongoose.Types.Decimal128('0') },
    total_holding_amount_bots: { type: mongoose.Types.Decimal128, default: new mongoose.Types.Decimal128('0') },
    number_bots: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const ReportBalancesDexModel = model('ReportBalancesDexModel', ReportBalancesDexSchema);

ReportBalancesDexModel.collection.createIndex({ date: 1 });
ReportBalancesDexModel.collection.createIndex({ chain_id: 1 });
ReportBalancesDexModel.collection.createIndex({ chain_id: 1, date: 1 });

export default ReportBalancesDexModel;
