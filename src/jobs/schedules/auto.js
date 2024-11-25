import { NAME_JOB } from '../../../utils/enum.js';
import agenda from '../agenda.js';

const autoSchedule = {
  enableAutoGenerateExecuteTemplates: async () => {
    return await agenda.every('8 0 * * *', NAME_JOB.auto.generate_templates_auto);
    // return await agenda.every('27 * * * *', NAME_JOB.auto.generate_templates_auto);
  },
  disableAutoGenerateExecuteTemplates: async () => {
    return await agenda.cancel({ name: NAME_JOB.auto.generate_templates_auto });
  },
};

export default autoSchedule;
