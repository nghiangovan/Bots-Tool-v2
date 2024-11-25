import { Schema, model } from 'mongoose';
import { getWalletByIndexOffChain } from '../handlers/common.js';

const WalletSchema = new Schema(
  {
    chain_id: { type: String, required: true },
    index: { type: Number, required: true },
    address: { type: String, required: true },
    is_using: { type: Boolean, require: true },
  },
  { timestamps: true },
);

WalletSchema.index({ chain_id: 1, address: 1 }, { unique: true });

const WalletModel = model('WalletModel', WalletSchema);

WalletModel.collection.createIndex({ chain_id: 1, index: 1 });
WalletModel.collection.createIndex({ chain_id: 1 });
WalletModel.collection.createIndex({ address: 1 });
WalletModel.collection.createIndex({ index: 1 });

// WalletModel.collection.dropIndexes();

// WalletModel.collection
//   .getIndexes({ full: true })
//   .then(indexes => {
//     console.log('indexes:', indexes);
//   })
//   .catch(console.error);

export const saveWalletsByIndexes = async ({ chainId, indexWallets, is_using, session }) => {
  let options = { ordered: false, upsert: true, new: true, setDefaultsOnInsert: true };
  if (session) options.session = session;

  const walletsExist = await WalletModel.find({ index: { $in: [...indexWallets] }, chain_id: chainId?.toString() });
  const IndexWalletsExist = walletsExist.map(a => a.index);
  const IndexWalletsNew = indexWallets.filter(i => !IndexWalletsExist.includes(i));

  const indexWalletsInfoNew = (
    await Promise.all(
      IndexWalletsNew.map(async index => {
        let wallet = getWalletByIndexOffChain({ indexWallet: index });
        return { ...wallet, index };
      }),
    )
  ).filter(a => a && a);

  const bulkDataInsert = indexWalletsInfoNew.map(walletInfo => ({
    insertOne: { document: { chain_id: chainId, index: walletInfo.index, address: walletInfo.address, is_using } },
  }));

  const bulkDataUpdate = walletsExist.map(walletInfo => ({
    updateOne: {
      filter: { index: walletInfo.index, chain_id: chainId },
      update: { $set: { is_using } },
      upsert: true,
    },
  }));
  if (bulkDataInsert.length > 0) await WalletModel.bulkWrite(bulkDataInsert, options);
  if (bulkDataUpdate.length > 0) await WalletModel.bulkWrite(bulkDataUpdate, options);
};

export default WalletModel;
