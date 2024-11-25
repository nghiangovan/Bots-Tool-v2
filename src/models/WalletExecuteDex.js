import { Schema, model } from 'mongoose';
import { getWalletByIndexOffChain } from '../handlers/common.js';
import { TYPE_ACTIVE_RECENT } from '../../utils/enum.js';
import { adjacentDumbersDivByFour } from '../../utils/number.js';

const WalletExecuteDexSchema = new Schema(
  {
    chain_id: { type: String, required: true },
    from_index: { type: Number, required: true },
    to_index: { type: Number, required: true },
    index_1: { type: Number, required: true },
    index_2: { type: Number, required: true },
    index_3: { type: Number, required: true },
    index_4: { type: Number, required: true },
    address_1: { type: String },
    address_2: { type: String },
    address_3: { type: String },
    address_4: { type: String },
    active_recent: { type: String, enum: Object.keys(TYPE_ACTIVE_RECENT).concat(null), default: null },
    is_using: { type: Boolean, require: true },
  },
  { timestamps: true },
);

WalletExecuteDexSchema.index({ chain_id: 1, address_1: 1, address_2: 1, address_3: 1, address_4: 1 }, { unique: true });
WalletExecuteDexSchema.index({ chain_id: 1, index_1: 1, index_2: 1, index_3: 1, index_4: 1 }, { unique: true });

const WalletExecuteDexModel = model('WalletExecuteDexModel', WalletExecuteDexSchema);

WalletExecuteDexModel.collection.createIndex({ chain_id: 1 });

// WalletExecuteDexModel.collection.dropIndexes();

// WalletExecuteDexModel.collection
//   .getIndexes({ full: true })
//   .then(indexes => {
//     console.log('indexes:', indexes);
//   })
//   .catch(console.error);

export const saveWalletsExecuteDexByIndexes = async ({ chainId, indexWallets, activeRecent, isUsing, session }) => {
  const chain_id = chainId?.toString();

  let options = { ordered: false, upsert: true, new: true, setDefaultsOnInsert: true };
  if (session) options.session = session;

  const listAdjacentNumbers = indexWallets.map(index => {
    return adjacentDumbersDivByFour(index);
  });
  const listIndex1 = listAdjacentNumbers.map(a => a[0]);

  const walletsExist = await WalletExecuteDexModel.find({
    index_1: { $in: [...listIndex1] },
    chain_id: chainId?.toString(),
  });

  const IndexWalletsExist = walletsExist.map(a => a.index_1);
  const IndexWalletsNew = indexWallets.filter(i => !IndexWalletsExist.includes(i));

  const bulkDataInsert = (
    await Promise.all(
      IndexWalletsNew.map(async index => {
        const [index_1, index_2, index_3, index_4] = [index, index + 1, index + 2, index + 3];
        const adjacentNumbers = [index_1, index_2, index_3, index_4];
        const [address_1, address_2, address_3, address_4] = await Promise.all(
          adjacentNumbers.map(i => getWalletByIndexOffChain({ indexWallet: i })?.address?.toLowerCase()),
        );
        return {
          insertOne: {
            document: {
              chain_id,
              from_index: index_1,
              to_index: index_4,
              index_1,
              index_2,
              index_3,
              index_4,
              address_1,
              address_2,
              address_3,
              address_4,
              is_using: isUsing,
            },
          },
        };
      }),
    )
  ).flat(1);

  const bulkDataUpdate = walletsExist.map(walletInfo => {
    let data = { is_using: isUsing };
    if (activeRecent) data.active_recent = activeRecent;

    return {
      updateOne: {
        filter: { index_1: walletInfo.index_1, chain_id },
        update: { $set: { ...data } },
        upsert: true,
      },
    };
  });
  if (bulkDataInsert.length > 0) await WalletExecuteDexModel.bulkWrite(bulkDataInsert, options);
  if (bulkDataUpdate.length > 0) await WalletExecuteDexModel.bulkWrite(bulkDataUpdate, options);
};

export default WalletExecuteDexModel;
