import { NAME_JOB } from '../../../utils/enum.js';
import agenda from '../agenda.js';

const fakeTransacions = {
  scanLogsAndFakceTransacions: async data => {
    return await agenda.every('5 minutes', NAME_JOB.fake_transactions.repeat_scan_logs, { ...data });
  },
};

export default fakeTransacions;
