import mongoose, { Schema, model } from 'mongoose';

const BalanceWalletSchema = new Schema(
  {
    type: { type: String },
    chain_id: { type: String, required: true },
    address: { type: String, required: true },
    asset: { type: String, required: true }, // Native, USDT, LCR
    address_asset: { type: String, required: true },
    balance: { type: mongoose.Types.Decimal128, default: new mongoose.Types.Decimal128('0') },
    balance_str: { type: String, default: '0' },
    balance_wei: { type: String, default: '0' },
  },
  { timestamps: true },
);

BalanceWalletSchema.index({ chain_id: 1, address: 1, address_asset: 1 }, { unique: true });

const BalanceWalletModel = model('BalanceWalletModel', BalanceWalletSchema);

BalanceWalletModel.collection.createIndex({ type: 1 });
BalanceWalletModel.collection.createIndex({ chain_id: 1 });
BalanceWalletModel.collection.createIndex({ index: 1 });
BalanceWalletModel.collection.createIndex({ address: 1 });
BalanceWalletModel.collection.createIndex({ asset: 1 });

// BalanceWalletModel.collection.dropIndexes();

// BalanceWalletModel.collection
//   .getIndexes({ full: true })
//   .then(indexes => {
//     console.log('indexes:', indexes);
//   })
//   .catch(console.error);

export default BalanceWalletModel;
