import { NAME_JOB } from '../../../utils/enum.js';
import { formatError } from '../../../utils/format.js';
import { autoGenerateExecuteTemplates } from '../services/auto.js';

export const autoDefinitions = agenda => {
  agenda.define(NAME_JOB.auto.generate_templates_auto, async (job, done) => {
    let { status, error } = await autoGenerateExecuteTemplates({ job });
    if (status) {
      await done();
      await job.setShouldSaveResult(true);
    } else {
      job.fail(formatError(error));
    }
    await job.save();
  });
};
