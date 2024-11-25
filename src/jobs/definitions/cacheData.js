import { NAME_JOB } from '../../../utils/enum.js';
import { formatError } from '../../../utils/format.js';
import { cacheBalanceAll } from '../../handlers/assetsRecovery.js';
import { backupAndManageDatabase } from '../../handlers/backupDB.js';
import { cacheKpiServerAll } from '../../handlers/functions.js';

export const cacheDataDefinitions = agenda => {
  agenda.define(NAME_JOB.cache.cache_balance_source_all, async (job, done) => {
    let { status, error } = await cacheBalanceAll();
    if (status) {
      await done();
      job.setShouldSaveResult(true);
    } else {
      job.fail(formatError(error));
    }
    await job.save();
  });

  agenda.define(NAME_JOB.cache.cache_kpi_server, async (job, done) => {
    let { status, error } = await cacheKpiServerAll();
    if (status) {
      await done();
      job.setShouldSaveResult(true);
    } else {
      job.fail(formatError(error));
    }
    await job.save();
  });

  agenda.define(NAME_JOB.cache.backup_database, async (job, done) => {
    let { status, error } = await backupAndManageDatabase();
    if (status) {
      await done();
      await job.setShouldSaveResult(true);
    } else {
      job.fail(formatError(error));
    }
    await job.save();
  });
};
