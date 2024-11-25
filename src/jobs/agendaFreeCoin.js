/* eslint-disable no-undef */
import Agenda from 'agenda';
import Debug from 'debug';
import { DATABASE_MONGO_URL } from '../../utils/constant.js';
import { rescanJobQueue } from './common.js';
import { freeCoinDefinitions } from './definitions/freeCoin.js';
const debug = Debug('server:server');

const definitionsFreeCoin = [freeCoinDefinitions];

export const allFreeCoinDefinitions = agenda => {
  definitionsFreeCoin.forEach(definition => definition(agenda));
};

const agendaFreeCoin = new Agenda({
  db: {
    address: DATABASE_MONGO_URL,
    collection: 'agendaJobsFreeCoin',
    options: { useUnifiedTopology: true },
  },
  processEvery: '1 second',
  maxConcurrency: 20,
  lockLimit: 20,
  ensureIndex: true,
});

agendaFreeCoin
  .on('ready', async () => {
    debug('Agenda Free Coin started!');
    try {
      setAgendaFreeCoinStatus(true);
      await rescanJobQueue({ queue: agendaFreeCoin });
    } catch (error) {
      console.log(error);
    }
  })
  .on('error', () => debug('Agenda Free Coin connection error!'));

// allFreeCoinDefinitions(agendaFreeCoin);
// agendaFreeCoin.start();

let agendaFreeCoinRunning = false;

export const setAgendaFreeCoinStatus = running => {
  agendaFreeCoinRunning = running;
};

export const getAgendaFreeCoinStatus = () => {
  return agendaFreeCoinRunning;
};

export default agendaFreeCoin;
