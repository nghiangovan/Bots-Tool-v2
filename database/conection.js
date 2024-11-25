import Debug from 'debug';
import mongoose from 'mongoose';
import { DATABASE_MONGO_URL } from '../utils/constant.js';
const debug = Debug('server:server');

export const connectMongoDB = () => {
  mongoose
    .connect(DATABASE_MONGO_URL, {})
    .then(async () => {
      debug(`MongoDB connection established`);
    })
    .catch(error => debug('MongoDB connection failed:', error.message));
};
