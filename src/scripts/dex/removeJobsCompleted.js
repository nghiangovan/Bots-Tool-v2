/* eslint-disable no-undef */
import { connectMongoDB } from '../../../database/conection.js';
import { NAME_JOB } from '../../../utils/enum.js';
import { sleep } from '../../../utils/utils.js';
import agenda from '../../jobs/agenda.js';

const main = async () => {
  connectMongoDB();
  await sleep(1000);
  await agenda.cancel({
    $and: [
      // Completed
      { lastFinishedAt: { $exists: true } },
      { $expr: { $gte: ['$lastFinishedAt', '$failedAt'] } },
      {
        name: {
          $nin: [
            NAME_JOB.auto.generate_templates_auto,
            NAME_JOB.fake_transactions.repeat_scan_logs,
            NAME_JOB.fake_actives.schedule_fake_actives_daily,
            NAME_JOB.cache.backup_database,
            NAME_JOB.cache.cache_balance_source_all,
            NAME_JOB.cache.cache_kpi_server,
          ],
        },
      },
    ],
  });
  console.log('done');
  return process.exit(0);
};

main();
