/* eslint-disable no-undef */
import { connectMongoDB } from '../../../database/conection.js';
import { NAME_JOB } from '../../../utils/enum.js';
import { sleep } from '../../../utils/utils.js';
import agendaDex from '../../dex/agendaDex.js';

const main = async () => {
  connectMongoDB();
  await sleep(1000);
  await agendaDex.cancel({
    $and: [
      // Completed
      { lastFinishedAt: { $exists: true } },
      { $expr: { $gte: ['$lastFinishedAt', '$failedAt'] } },
      {
        name: {
          $nin: [NAME_JOB.cache.cache_balances_dex, NAME_JOB.dex.schedule_dex_auto_daily],
        },
      },
    ],
  });
  console.log('done');
  return process.exit(0);
};

main();
