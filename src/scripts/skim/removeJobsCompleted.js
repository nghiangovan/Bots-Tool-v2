/* eslint-disable no-undef */
import { connectMongoDB } from '../../../database/conection.js';
import { NAME_JOB } from '../../../utils/enum.js';
import { sleep } from '../../../utils/utils.js';
import agendaSkim from '../../fakeActives/jobsSkim/agendaSkim.js';

const main = async () => {
  connectMongoDB();
  await sleep(1000);
  await agendaSkim.cancel({
    $and: [
      // Completed
      { lastFinishedAt: { $exists: true } },
      { $expr: { $gte: ['$lastFinishedAt', '$failedAt'] } },
      {
        name: {
          $in: [NAME_JOB.fake_actives.execute_fake_actives, NAME_JOB.fake_actives.execute_fake_actives_free_coin],
        },
      },
    ],
  });
  console.log('done');
  return process.exit(0);
};

main();
