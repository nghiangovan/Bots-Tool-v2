import { NAME_JOB } from '../../../utils/enum.js';
import { formatError } from '../../../utils/format.js';
import { scanLogsAndFakeTransactions } from '../../fakeTransactions/scanLogsAndFakeTransactions.js';

export const fakeTransacionsDefinitions = agenda => {
  agenda.define(NAME_JOB.fake_transactions.repeat_scan_logs, async (job, done) => {
    const { chainId } = job.attrs.data;
    let { status, error } = await scanLogsAndFakeTransactions({ chainId });
    if (status) {
      await done();
      job.setShouldSaveResult(true);
    } else {
      job.fail(formatError(error));
    }
    await job.save();
  });
};
