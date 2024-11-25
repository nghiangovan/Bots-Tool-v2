import { NAME_JOB } from '../../../../utils/enum.js';
import agendaSkim from '../agendaSkim.js';

const fakeActivesSchedule = {
  enableScheuleFakeActivesDaily: async data => {
    return await agendaSkim.every('23 22 * * *', NAME_JOB.fake_actives.schedule_fake_actives_daily, { ...data });
  },
  enableScheuleFakeActivesDailyFreeCoin: async data => {
    return await agendaSkim.every('23 22 * * *', NAME_JOB.fake_actives.schedule_fake_actives_daily_free_coin, {
      ...data,
    });
  },
  disableScheuleFakeActivesDaily: async () => {
    return await agendaSkim.cancel({ name: NAME_JOB.fake_actives.schedule_fake_actives_daily });
  },
  disableScheuleFakeActivesDailyFreeCoin: async () => {
    return await agendaSkim.cancel({ name: NAME_JOB.fake_actives.schedule_fake_actives_daily_free_coin });
  },
  autoCheckScheduleSkim: async () => {
    return await agendaSkim.every('1 hours', NAME_JOB.fake_actives.auto_check_shedule_fake_actives);
  },
};

export default fakeActivesSchedule;
