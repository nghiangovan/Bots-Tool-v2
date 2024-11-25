import mongoose, { Schema, model } from 'mongoose';

const WalletSchema = new Schema(
  {
    chain_id: { type: String, required: true },
    index: { type: Number, required: true },
    address: { type: String, required: true },
    holding_amount: { type: mongoose.Types.Decimal128, default: new mongoose.Types.Decimal128('0') }, // amount LCR of holder
  },
  { timestamps: true },
);

WalletSchema.index({ chain_id: 1, address: 1 }, { unique: true });

const WalletSkimModel = model('WalletSkimModel', WalletSchema);

WalletSkimModel.collection.createIndex({ chain_id: 1 });
WalletSkimModel.collection.createIndex({ address: 1 });
WalletSkimModel.collection.createIndex({ index: 1 });

export default WalletSkimModel;
