import mongoose, { Schema, model } from 'mongoose';
import { TYPE_WALLET } from '../../utils/enum.js';

const WalletSourceSchema = new Schema(
  {
    type: { type: String, enum: Object.keys(TYPE_WALLET), required: true },
    chain_id: { type: String, required: true },
    index: { type: Number, required: true },
    address: { type: String, required: true },
    asset: { type: String, required: true }, // BNB, USDT, LCR
    balance: { type: mongoose.Types.Decimal128, default: new mongoose.Types.Decimal128('0') },
    tx_hash_recent: { type: String },
  },
  { timestamps: true },
);

WalletSourceSchema.index({ chain_id: 1, address: 1, asset: 1 }, { unique: true });

const WalletSourceModel = model('WalletSourceModel', WalletSourceSchema);

WalletSourceModel.collection.createIndex({ chain_id: 1, address: 1 });
WalletSourceModel.collection.createIndex({ chain_id: 1 });
WalletSourceModel.collection.createIndex({ address: 1 });
WalletSourceModel.collection.createIndex({ index: 1 });
WalletSourceModel.collection.createIndex({ asset: 1 });

// WalletSourceModel.collection.dropIndexes();

// WalletSourceModel.collection
//   .getIndexes({ full: true })
//   .then(indexes => {
//     console.log('indexes:', indexes);
//   })
//   .catch(console.error);

export default WalletSourceModel;
