import { NAME_JOB } from '../../../utils/enum.js';
import { formatError } from '../../../utils/format.js';
import { commonProcessJob, scheduleExecuteJobs } from '../services/execute.js';
import { cacheReportBalanceDex } from '../services/report.js';
import { generateExecuteDexDaily, generateExecuteDexManual } from '../services/schedule.js';

export const dexDefinitions = agenda => {
  agenda.define(NAME_JOB.dex.schedule_dex_auto_daily, async (job, done) => {
    let { status, error } = await generateExecuteDexDaily({ job });
    if (status) {
      await done();
      await job.setShouldSaveResult(true);
    } else {
      job.fail(formatError(error));
    }
    await job.save();
  });

  agenda.define(NAME_JOB.dex.schedule_dex_manual, async (job, done) => {
    let { status, error } = await generateExecuteDexManual({ job });
    if (status) {
      await done();
      await job.setShouldSaveResult(true);
    } else {
      job.fail(formatError(error));
    }
    await job.save();
  });

  agenda.define(NAME_JOB.dex.schedule_execute_jobs, async (job, done) => {
    let { status, error } = await scheduleExecuteJobs({ job });
    if (status) {
      await done();
      await job.setShouldSaveResult(true);
    } else {
      job.fail(formatError(error));
    }
    await job.save();
  });

  agenda.define(NAME_JOB.dex.transfer_token_from_source, async (job, done) => {
    await commonProcessJob({ job, done });
  });

  agenda.define(NAME_JOB.dex.swap_token_to_token_our_dex, async (job, done) => {
    await commonProcessJob({ job, done });
  });

  agenda.define(NAME_JOB.cache.cache_balances_dex, async (job, done) => {
    let { status, error } = await cacheReportBalanceDex();
    if (status) {
      await done();
      await job.setShouldSaveResult(true);
    } else {
      job.fail(formatError(error));
    }
    await job.save();
  });
};
