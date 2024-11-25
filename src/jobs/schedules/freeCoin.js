import { NAME_JOB } from '../../../utils/enum.js';
import agendaFreeCoin from '../agendaFreeCoin.js';

const freeCoinSchedule = {
  enableAutoGenerateExecuteTemplatesFreeCoin: async () => {
    return await agendaFreeCoin.every('8 0 * * *', NAME_JOB.auto.generate_templates_free_coin_auto);
  },
  disableAutoGenerateExecuteTemplatesFreeCoin: async () => {
    return await agendaFreeCoin.cancel({ name: NAME_JOB.auto.generate_templates_free_coin_auto });
  },
};

export default freeCoinSchedule;
