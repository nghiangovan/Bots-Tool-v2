/* eslint-disable no-undef */
import Agenda from 'agenda';
import Debug from 'debug';
import { DATABASE_MONGO_URL } from '../../utils/constant.js';
import { KEY_CONFIG, NAME_JOB } from '../../utils/enum.js';
import ConfigModel from '../models/Config.js';
import { rescanJobQueue } from './common.js';
import { allDefinitions } from './definitions/index.js';
import autoSchedule from './schedules/auto.js';
import cacheData from './schedules/cacheData.js';
import fakeTransacions from './schedules/fakeTransactions.js';
const debug = Debug('server:server');

const agenda = new Agenda({
  db: {
    address: DATABASE_MONGO_URL,
    collection: 'agendaJobs',
    options: { useUnifiedTopology: true },
  },
  processEvery: '1 second',
  maxConcurrency: 20,
  lockLimit: 20,
  ensureIndex: true,
});

// listen for the ready or error event.
agenda
  .on('ready', async () => {
    debug('Agenda started!');
    try {
      let configGenerateTemplatesAutoDaily = await ConfigModel.findOne({
        chain_id: 'ALL',
        key: KEY_CONFIG.generate_templates_auto_daily,
      });
      if (!configGenerateTemplatesAutoDaily) {
        let newConfig = new ConfigModel({
          chain_id: 'ALL',
          key: KEY_CONFIG.generate_templates_auto_daily,
          value: true,
        });
        configGenerateTemplatesAutoDaily = await newConfig.save();
      }
      const value = String(configGenerateTemplatesAutoDaily?.value).toLowerCase();
      if (value == 'true') {
        let schedulesTemplate = await agenda.jobs({ name: NAME_JOB.auto.generate_templates_auto, type: 'single' });
        if (schedulesTemplate.length <= 0) await autoSchedule.enableAutoGenerateExecuteTemplates();
      } else {
        let schedulesTemplate = await agenda.jobs({ name: NAME_JOB.auto.generate_templates_auto, type: 'single' });
        if (schedulesTemplate.length > 0) await autoSchedule.disableAutoGenerateExecuteTemplates();
      }

      await fakeTransacions.scanLogsAndFakceTransacions({ chainId: 56 });
      await cacheData.cacheBalancesAll();
      await cacheData.cacheKpiServerToReport();
      await cacheData.backupDatabase();

      setAgendaStatus(true);

      await rescanJobQueue({ queue: agenda });
    } catch (error) {
      console.log(error);
    }
  })
  .on('error', () => debug('Agenda connection error!'));
allDefinitions(agenda);
agenda.start();

let agendaRunning = false;

export const setAgendaStatus = running => {
  agendaRunning = running;
};

export const getAgendaStatus = () => {
  return agendaRunning;
};

export default agenda;
