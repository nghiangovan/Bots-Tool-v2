import mongoose, { Schema, model } from 'mongoose';

const WalletBalanceRateSchema = new Schema(
  {
    chain_id: { type: String, required: true },
    index: { type: Number, required: true },
    address: { type: String, required: true },
    asset: { type: String, required: true }, // BNB, USDT, LCR
    balance: { type: mongoose.Types.Decimal128, default: new mongoose.Types.Decimal128('0') },
  },
  { timestamps: true },
);

WalletBalanceRateSchema.index({ chain_id: 1, index: 1, asset: 1 }, { unique: true });

const WalletBalanceRateModel = model('WalletBalanceRateModel', WalletBalanceRateSchema);

WalletBalanceRateModel.collection.createIndex({ chain_id: 1 });
WalletBalanceRateModel.collection.createIndex({ address: 1 });
WalletBalanceRateModel.collection.createIndex({ index: 1 });
WalletBalanceRateModel.collection.createIndex({ asset: 1 });

// WalletBalanceRateModel.collection.dropIndexes();

// WalletBalanceRateModel.collection
//   .getIndexes({ full: true })
//   .then(indexes => {
//     console.log('indexes:', indexes);
//   })
//   .catch(console.error);

export default WalletBalanceRateModel;
