import { NAME_JOB } from '../../../utils/enum.js';
import agenda from '../agenda.js';

const cacheData = {
  cacheBalancesAll: async () => {
    return await agenda.every('0 0 * * *', NAME_JOB.cache.cache_balance_source_all);
  },
  cacheKpiServerToReport: async () => {
    return await agenda.every('1 hours', NAME_JOB.cache.cache_kpi_server);
  },
  backupDatabase: async () => {
    return await agenda.every('0 0 * * *', NAME_JOB.cache.backup_database);
  },
};

export default cacheData;
