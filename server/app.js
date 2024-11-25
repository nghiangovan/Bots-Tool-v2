/* eslint-disable no-undef */
import Agendash from 'agendash';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import Debug from 'debug';
import dotEnv from 'dotenv';
import express from 'express';
import basicAuth from 'express-basic-auth';
import logger from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectMongoDB } from '../database/conection.js';
import agendaDex from '../src/dex/agendaDex.js';
import agendaSkim from '../src/fakeActives/jobsSkim/agendaSkim.js';
import agendaHolder from '../src/holder/agendaHolder.js';
import agenda from '../src/jobs/agenda.js';
import agendaFreeCoin from '../src/jobs/agendaFreeCoin.js';
import agendaRouter from './routes/agenda.js';
import assetRouter from './routes/asset.js';
import balanceRateRouter from './routes/balanceRate.js';
import chainIdRouter from './routes/chainId.js';
import configRouter from './routes/config.js';
import dexRouter from './routes/dex.js';
import executeRouter from './routes/execute.js';
import fakeActivesRouter from './routes/fakeActives.js';
import fakeFakeHolderRouter from './routes/fakeHolder.js';
import indexRouter from './routes/index.js';
import logRouter from './routes/logs.js';
import scheduleRouter from './routes/schedule.js';
import templateRouter from './routes/template.js';
import walletRouter from './routes/wallet.js';
import walletSourceRouter from './routes/walletSource.js';

dotEnv.config();
connectMongoDB();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/template', templateRouter);
app.use('/execute', executeRouter);
app.use('/schedule', scheduleRouter);
app.use('/dex', dexRouter);
app.use('/chain_id', chainIdRouter);
app.use('/log', logRouter);
app.use('/wallet', walletRouter);
app.use('/fake_actives', fakeActivesRouter);
app.use('/fake_holder', fakeFakeHolderRouter);
app.use('/wallet_source', walletSourceRouter);
app.use('/balance_rate', balanceRateRouter);
app.use('/config', configRouter);
app.use('/asset', assetRouter);

app.use('/agenda', agendaRouter);
app.use(
  '/dash',
  basicAuth({
    users: {
      admin: 'yXWgF3P)fnSktgkC',
    },
    challenge: true,
  }),
  Agendash(agenda),
);

app.use(
  '/dash_skim',
  basicAuth({
    users: {
      admin: 'yXWgF3P)fnSktgkC',
    },
    challenge: true,
  }),
  Agendash(agendaSkim),
);

app.use(
  '/dash_holder',
  basicAuth({
    users: {
      admin: 'yXWgF3P)fnSktgkC',
    },
    challenge: true,
  }),
  Agendash(agendaHolder),
);

app.use(
  '/dash_free_coin',
  basicAuth({
    users: {
      admin: 'yXWgF3P)fnSktgkC',
    },
    challenge: true,
  }),
  Agendash(agendaFreeCoin),
);

app.use(
  '/dash_dex',
  basicAuth({
    users: {
      admin: 'yXWgF3P)fnSktgkC',
    },
    challenge: true,
  }),
  Agendash(agendaDex),
);

const debug = Debug('server:server');

debug(`HOST: ${process.env.HOST}`);
debug(`WORKING_DIR: ${process.env.WORKING_DIR}`);
debug(`Admin key: ${process.env.ADMIN_KEY ? process.env.ADMIN_KEY.slice(0, 45) : null}...`);

export default app;
