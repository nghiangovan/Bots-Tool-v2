/* eslint-disable no-undef */
import Agenda from 'agenda';
import Debug from 'debug';
import { DATABASE_MONGO_URL } from '../../utils/constant.js';
import { KEY_CONFIG, NAME_JOB } from '../../utils/enum.js';
import { rescanJobQueueNotRemoveFail } from '../jobs/common.js';
import ConfigModel from '../models/Config.js';
import { allDefinitions } from './definitions/index.js';
import dexSchedule from './schedules/dex.js';
const debug = Debug('server:server');

const agendaDex = new Agenda({
  db: {
    address: DATABASE_MONGO_URL,
    collection: 'agendaJobsDex',
    options: { useUnifiedTopology: true },
  },
  processEvery: '1 second',
  maxConcurrency: 20,
  lockLimit: 20,
  ensureIndex: true,
});

// listen for the ready or error event.
agendaDex
  .on('ready', async () => {
    debug('Agenda Dex started!');
    try {
      let configGenerateDexDaily = await ConfigModel.findOne({
        chain_id: 'ALL',
        key: KEY_CONFIG.generate_dex_auto_daily,
      });
      if (!configGenerateDexDaily) {
        let newConfig = new ConfigModel({
          chain_id: 'ALL',
          key: KEY_CONFIG.generate_dex_auto_daily,
          value: true,
        });
        configGenerateDexDaily = await newConfig.save();
      }
      const valueDex = String(configGenerateDexDaily?.value).toLowerCase();
      if (valueDex == 'true') {
        let scheduleDexAuto = await agendaDex.jobs({
          name: NAME_JOB.dex.schedule_dex_auto_daily,
          type: 'single',
        });
        if (scheduleDexAuto.length <= 0) await dexSchedule.enableScheuleDexAutoDaily({ chainId: 56 });
      } else {
        let schedulesFakeActives = await agendaDex.jobs({
          name: NAME_JOB.dex.schedule_dex_auto_daily,
          type: 'single',
        });
        if (schedulesFakeActives.length > 0) await dexSchedule.disableScheuleDexAutoDaily();
      }

      await dexSchedule.cacheBalancesDex();

      setAgendaDexStatus(true);

      await rescanJobQueueNotRemoveFail({ queue: agendaDex });
    } catch (error) {
      console.log(error);
    }
  })
  .on('error', () => debug('Agenda Dex connection error!'));
allDefinitions(agendaDex);
agendaDex.start();

let agendaDexRunning = false;

export const setAgendaDexStatus = running => {
  agendaDexRunning = running;
};

export const getAgendaDexStatus = () => {
  return agendaDexRunning;
};

export default agendaDex;
