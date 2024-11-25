import { NAME_JOB } from '../../../utils/enum.js';
import { formatError } from '../../../utils/format.js';
import { manualGenerateExecuteTemplates } from '../services/manual.js';

export const manualDefinitions = agenda => {
  agenda.define(NAME_JOB.manual.generate_templates_manual, async (job, done) => {
    let { status, error } = await manualGenerateExecuteTemplates({ job });
    if (status) {
      await done();
      job.setShouldSaveResult(true);
    } else {
      job.fail(formatError(error));
    }
    await job.save();
  });
};
