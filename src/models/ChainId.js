import { Schema, model } from 'mongoose';
import { TYPE_CHAIN_SUPPORT } from '../../utils/enum.js';

const ChainIdSchema = new Schema(
  {
    type: {
      type: String,
      enum: Object.keys(TYPE_CHAIN_SUPPORT),
      required: true,
      default: TYPE_CHAIN_SUPPORT.paid_coin,
    },
    chain_id: { type: String, required: true },
    is_active: { type: Boolean, required: true, default: true },
  },
  { timestamps: true },
);

const ChainIdModel = model('ChainIdModel', ChainIdSchema);

ChainIdModel.collection.createIndex({ type: 1 });
ChainIdModel.collection.createIndex({ chain_id: 1 });
ChainIdModel.collection.createIndex({ is_active: 1 });

// ChainIdModel.collection.dropIndexes();

// ChainIdModel.collection
//   .getIndexes({ full: true })
//   .then(indexes => {
//     console.log('indexes:', indexes);
//   })
//   .catch(console.error);

export default ChainIdModel;
