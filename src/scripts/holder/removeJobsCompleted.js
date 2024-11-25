/* eslint-disable no-undef */
import { connectMongoDB } from '../../../database/conection.js';
import { NAME_JOB } from '../../../utils/enum.js';
import { sleep } from '../../../utils/utils.js';
import agendaHolder from '../../holder/agendaHolder.js';

const main = async () => {
  connectMongoDB();
  await sleep(1000);
  await agendaHolder.cancel({
    $and: [
      // Completed
      { lastFinishedAt: { $exists: true } },
      { $expr: { $gte: ['$lastFinishedAt', '$failedAt'] } },
      {
        name: {
          $in: [NAME_JOB.holder.withdraw_increase_holders, NAME_JOB.holder.schedule_fake_holders],
        },
      },
    ],
  });
  console.log('done');
  return process.exit(0);
};

main();
