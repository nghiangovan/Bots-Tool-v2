/* eslint-disable no-undef */
import Agenda from 'agenda';
import Debug from 'debug';
import { DATABASE_MONGO_URL } from '../../../utils/constant.js';
import { rescanJobQueueSkim } from '../../jobs/common.js';
import { allDefinitionsSkim } from './definitions/index.js';
import { loadConfigAutoScheduleSkim } from './services/scheduleFakeActives.js';
import fakeActivesSchedule from './schedules/fakeActives.js';
const debug = Debug('server:server');

const agendaSkim = new Agenda({
  db: {
    address: DATABASE_MONGO_URL,
    collection: 'agendaJobsSkim',
    options: { useUnifiedTopology: true },
  },
  processEvery: '1 second',
  maxConcurrency: 20,
  lockLimit: 20,
  ensureIndex: true,
});

// listen for the ready or error event.
agendaSkim
  .on('ready', async () => {
    debug('Agenda Skim started!');
    try {
      await fakeActivesSchedule.autoCheckScheduleSkim();
      await loadConfigAutoScheduleSkim();
      setAgendaSkimStatus(true);

      await rescanJobQueueSkim({ queue: agendaSkim });
    } catch (error) {
      console.log(error);
    }
  })
  .on('error', () => debug('Agenda Skim connection error!'));
allDefinitionsSkim(agendaSkim);
agendaSkim.start();

let agendaSkimRunning = false;

export const setAgendaSkimStatus = running => {
  agendaSkimRunning = running;
};

export const getAgendaSkimStatus = () => {
  return agendaSkimRunning;
};

export default agendaSkim;
