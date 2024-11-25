/* eslint-disable no-undef */
import Agenda from 'agenda';
import Debug from 'debug';
import { DATABASE_MONGO_URL } from '../../utils/constant.js';
import { KEY_CONFIG, NAME_JOB } from '../../utils/enum.js';
import { rescanJobQueueNotRemoveFail } from '../jobs/common.js';
import { allDefinitions } from './definitions/index.js';
import fakeHoldersSchedule from './schedules/fakeHolders.js';
import ConfigModel from '../models/Config.js';
const debug = Debug('server:server');

const agendaHolder = new Agenda({
  db: {
    address: DATABASE_MONGO_URL,
    collection: 'agendaJobsHolder',
    options: { useUnifiedTopology: true },
  },
  processEvery: '1 second',
  maxConcurrency: 20,
  lockLimit: 20,
  ensureIndex: true,
});

// listen for the ready or error event.
agendaHolder
  .on('ready', async () => {
    debug('Agenda Holder started!');
    try {
      let configGenerateFakeHoldersDaily = await ConfigModel.findOne({
        chain_id: 'ALL',
        key: KEY_CONFIG.generate_fake_holders_daily,
      });
      if (!configGenerateFakeHoldersDaily) {
        let newConfig = new ConfigModel({
          chain_id: 'ALL',
          key: KEY_CONFIG.generate_fake_holders_daily,
          value: true,
        });
        configGenerateFakeHoldersDaily = await newConfig.save();
      }
      const valueFakeHolders = String(configGenerateFakeHoldersDaily?.value).toLowerCase();
      if (valueFakeHolders == 'true') {
        let schedulesFakeHolders = await agendaHolder.jobs({
          name: NAME_JOB.holder.schedule_fake_holders_daily,
          type: 'single',
        });
        if (schedulesFakeHolders.length <= 0) await fakeHoldersSchedule.enableScheuleFakeHoldersDaily({ chainId: 56 });
      } else {
        let schedulesFakeActives = await agendaHolder.jobs({
          name: NAME_JOB.holder.schedule_fake_holders_daily,
          type: 'single',
        });
        if (schedulesFakeActives.length > 0) await fakeHoldersSchedule.disableScheuleFakeHoldersDaily();
      }

      setAgendaHolderStatus(true);

      await rescanJobQueueNotRemoveFail({ queue: agendaHolder });
    } catch (error) {
      console.log(error);
    }
  })
  .on('error', () => debug('Agenda Holder connection error!'));
allDefinitions(agendaHolder);
agendaHolder.start();

let agendaHolderRunning = false;

export const setAgendaHolderStatus = running => {
  agendaHolderRunning = running;
};

export const getAgendaHolderStatus = () => {
  return agendaHolderRunning;
};

export default agendaHolder;
