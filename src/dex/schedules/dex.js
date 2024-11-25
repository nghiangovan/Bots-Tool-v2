import { NAME_JOB } from '../../../utils/enum.js';
import agendaDex from '../agendaDex.js';

const dexSchedule = {
  enableScheuleDexAutoDaily: async data => {
    return await agendaDex.every('15 0 * * *', NAME_JOB.dex.schedule_dex_auto_daily, { ...data });
  },
  disableScheuleDexAutoDaily: async () => {
    return await agendaDex.cancel({ name: NAME_JOB.dex.schedule_dex_auto_daily });
  },
  cacheBalancesDex: async () => {
    return await agendaDex.every('0 0 * * *', NAME_JOB.cache.cache_balances_dex);
  },
};

export default dexSchedule;
