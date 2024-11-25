/* eslint-disable no-undef */
import { connectMongoDB } from '../../../database/conection.js';
import { NAME_JOB } from '../../../utils/enum.js';
import { sleep } from '../../../utils/utils.js';
import agendaSkim from '../../fakeActives/jobsSkim/agendaSkim.js';

const main = async () => {
  connectMongoDB();
  const chainId = 42220;
  let id_execute = '65087a813304f8ac611e3fea';
  let date = '2023-09-18';

  await sleep(1000);

  let jobs = await agendaSkim.jobs({
    $and: [
      { 'data.date': date.toString() },
      { 'data.chain_id': chainId.toString() },
      { 'data.id_execute': id_execute },
      {
        name: NAME_JOB.fake_actives.execute_fake_actives,
      },
    ],
  });
  console.log(`Total Jobs Queue: `, jobs.length);
  await Promise.all(jobs.map(async job => await job.remove()));
  console.log('done');
  return process.exit(0);
};
main();
