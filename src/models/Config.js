import { Schema, model } from 'mongoose';

const ConfigSchema = new Schema(
  {
    chain_id: { type: String, required: true },
    key: { type: String, required: true },
    value: { type: String, required: true },
    is_locked: { type: Boolean, default: false },
    locked_at: { type: Date },
  },
  { timestamps: true },
);

ConfigSchema.index({ chain_id: 1, key: 1 }, { unique: true });

const ConfigModel = model('ConfigModel', ConfigSchema);

ConfigModel.collection.createIndex({ chain_id: 1 });
ConfigModel.collection.createIndex({ key: 1 });
ConfigModel.collection.createIndex({ value: 1 });

// ConfigModel.collection.dropIndexes();

// ConfigModel.collection
//   .getIndexes({ full: true })
//   .then(indexes => {
//     console.log('indexes:', indexes);
//   })
//   .catch(console.error);

export default ConfigModel;
