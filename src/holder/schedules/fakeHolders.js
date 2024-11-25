import { NAME_JOB } from '../../../utils/enum.js';
import agendaHolder from '../agendaHolder.js';

const fakeHoldersSchedule = {
  enableScheuleFakeHoldersDaily: async data => {
    return await agendaHolder.every('5 0 * * *', NAME_JOB.holder.schedule_fake_holders_daily, { ...data });
  },
  enableScheuleFakeHoldersDailyFreeCoin: async data => {
    return await agendaHolder.every('5 0 * * *', NAME_JOB.holder.schedule_fake_holders_daily_free_coin, {
      ...data,
    });
  },
  disableScheuleFakeHoldersDaily: async () => {
    return await agendaHolder.cancel({ name: NAME_JOB.holder.schedule_fake_holders_daily });
  },
  disableScheuleFakeHoldersDailyFreeCoin: async () => {
    return await agendaHolder.cancel({ name: NAME_JOB.holder.schedule_fake_holders_daily_free_coin });
  },
};

export default fakeHoldersSchedule;
