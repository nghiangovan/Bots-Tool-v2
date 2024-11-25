import express from 'express';
import moment from 'moment';
import agendaSkim from '../../src/fakeActives/jobsSkim/agendaSkim.js';

import fakeActivesSchedule from '../../src/fakeActives/jobsSkim/schedules/fakeActives.js';
import { getDateSkim } from '../../src/fakeActives/jobsSkim/services/scheduleFakeActives.js';
import ConfigModel from '../../src/models/Config.js';
import ExecuteFakeActivesModel from '../../src/models/ExecuteFakeActives.js';
import { PAGE_SIZE } from '../../utils/constant.js';
import { KEY_CONFIG, NAME_JOB } from '../../utils/enum.js';
import { formatError } from '../../utils/format.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.get('/uaw', auth, async (req, res) => {
  try {
    let { page, size } = req.query;
    if (!page) page = 1;
    else page = parseInt(page);
    if (!size) size = PAGE_SIZE;
    else size = parseInt(size);
    const limit = parseInt(size);
    const skip = (page - 1) * size;

    let objFilter = {};
    if (req.query?.chain_id) objFilter['chain_id'] = req.query.chain_id;

    const executes = await ExecuteFakeActivesModel.find({ ...objFilter })
      .limit(limit)
      .skip(skip)
      .sort({ date: -1 });

    const total_documents = await ExecuteFakeActivesModel.countDocuments({ ...objFilter });
    const total_pages = Math.ceil(total_documents / size);

    const previous_pages = page - 1;
    const next_pages = Math.ceil((total_documents - skip) / size);

    res.status(200).send({ data: executes, page, size, previous_pages, next_pages, total_pages });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.get('/uaw/kpi', auth, async (req, res) => {
  try {
    let { page, size } = req.query;
    if (!page) page = 1;
    else page = parseInt(page);
    if (!size) size = PAGE_SIZE;
    else size = parseInt(size);
    const limit = parseInt(size);
    const skip = (page - 1) * size;

    let objFilter = {};
    if (req.query?.chain_id) objFilter['chain_id'] = req.query.chain_id;

    const executes = await ExecuteFakeActivesModel.find({ ...objFilter })
      .limit(limit)
      .skip(skip)
      .sort({ date: -1 });
    const reportsKPI = await Promise.all(
      executes.map(async e => {
        const jobsDone = await agendaSkim.jobs({
          'name': NAME_JOB.fake_actives.execute_fake_actives,
          'data.date': e.date,
          'data.chain_id': e.chain_id,
          'shouldSaveResult': true,
        });
        const jobsFail = await agendaSkim.jobs({
          'name': NAME_JOB.fake_actives.execute_fake_actives,
          'data.date': e.date,
          'data.chain_id': e.chain_id,
          'shouldSaveResult': false,
          'failCount': { $gte: 5 },
        });
        return {
          date: e.date,
          kpi: e.number_wallets,
          uaw: jobsDone.length,
          total_error: jobsFail.length,
          error: e.error,
        };
      }),
    );

    const total_documents = await ExecuteFakeActivesModel.countDocuments({ ...objFilter });
    const total_pages = Math.ceil(total_documents / size);

    const previous_pages = page - 1;
    const next_pages = Math.ceil((total_documents - skip) / size);

    res.status(200).send({ data: reportsKPI, page, size, previous_pages, next_pages, total_pages });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.post('/uaw/daily', auth, async (req, res) => {
  try {
    const executes = await ExecuteFakeActivesModel.find({
      chain_id: req.body.chain_id,
      date: req.body.date,
      is_daily: true,
    });
    if (executes.length) {
      const updatedExecute = await ExecuteFakeActivesModel.findOneAndUpdate(
        { chain_id: req.body.chain_id, date: req.body.date, is_daily: true },
        {
          $set: { ...req.body },
        },
        { new: true },
      );
      res.status(200).send(updatedExecute);
    } else {
      const newExecute = new ExecuteFakeActivesModel({ ...req.body, is_daily: true });
      const savedExecute = await newExecute.save();
      res.status(200).send(savedExecute);
    }
  } catch (err) {
    res.status(500).send(err);
  }
});

router.post('/uaw/manual', auth, async (req, res) => {
  try {
    const id_execute = req.body.id_execute;
    const executes = await ExecuteFakeActivesModel.findById(id_execute);
    if (executes) {
      delete req.body.id_execute;
      const updatedExecute = await ExecuteFakeActivesModel.findByIdAndUpdate(
        id_execute,
        { $set: { ...req.body } },
        { new: true },
      );
      res.status(200).send(updatedExecute);
    } else {
      const newExecute = new ExecuteFakeActivesModel({ ...req.body, is_daily: false });
      const savedExecute = await newExecute.save();
      res.status(200).send(savedExecute);
    }
  } catch (err) {
    res.status(500).send(err);
  }
});

// Start fake active UAW (daily) of current day
router.post('/uaw/start/daily/:chain_id', auth, async (req, res) => {
  try {
    const chain_id = req?.params?.chain_id;
    const date = getDateSkim();
    const infoExecute = await ExecuteFakeActivesModel.findOne({ chain_id, is_daily: true, date });
    if (!infoExecute) throw { error: `Info Execute today not found!` };
    if (infoExecute.date != date) throw { error: 'Currently no progress fake actives' };
    await agendaSkim.schedule(moment().add(10, 'seconds'), NAME_JOB.fake_actives.schedule_fake_actives_daily, {
      chainId: chain_id,
    });
    await ExecuteFakeActivesModel.updateOne({ chain_id, date }, { stop_execute: false });
    res.status(200).send({ result: true });
  } catch (err) {
    res.status(500).send(err);
  }
});

// Stop fake active UAW of current day
router.post('/uaw/stop/daily/:chain_id', auth, async (req, res) => {
  try {
    const chain_id = req?.params?.chain_id;
    const date = getDateSkim();
    const infoExecute = await ExecuteFakeActivesModel.findOne({ chain_id, is_daily: true, date });
    if (!infoExecute) throw { error: `Info Execute today not found!` };
    if (infoExecute.date != date) throw { error: 'Currently no progress fake actives' };
    await agendaSkim.cancel({
      'name': NAME_JOB.fake_actives.execute_fake_actives,
      'data.is_daily': true,
      'data.date': date,
      'data.chain_id': chain_id,
    });
    await ExecuteFakeActivesModel.updateOne({ chain_id, date }, { stop_execute: true });
    res.status(200).send({ result: true });
  } catch (err) {
    res.status(500).send(err);
  }
});

// Start fake active UAW (manual)
router.post('/uaw/start/manual/:id_execute', auth, async (req, res) => {
  try {
    const id_execute = req?.params?.id_execute;
    const infoExecute = await ExecuteFakeActivesModel.findById(id_execute);
    if (!infoExecute) throw { error: `id_execute not found!` };
    await agendaSkim.schedule(moment().add(10, 'seconds'), NAME_JOB.fake_actives.schedule_fake_actives_manual, {
      id_execute,
    });
    await ExecuteFakeActivesModel.findByIdAndUpdate(id_execute, { stop_execute: false });
    res.status(200).send({ result: true });
  } catch (err) {
    res.status(500).send(err);
  }
});

// Stop fake active UAW (manual)
router.post('/uaw/stop/manual/:id_execute', auth, async (req, res) => {
  try {
    const id_execute = req?.params?.id_execute;
    const infoExecute = await ExecuteFakeActivesModel.findById(id_execute);
    if (!infoExecute) throw { error: `id_execute not found!` };
    await agendaSkim.cancel({ 'data.id_execute': id_execute });
    await ExecuteFakeActivesModel.findByIdAndUpdate(id_execute, { stop_execute: true });
    res.status(200).send({ result: true });
  } catch (err) {
    res.status(500).send(err);
  }
});

// Start auto schedule fake actives UAW daily
router.post('/uaw/enable_auto_schedule_daily', auth, async (req, res) => {
  try {
    let result = await fakeActivesSchedule.enableScheuleFakeActivesDaily({ chainId: 56 });
    await ConfigModel.findOneAndUpdate(
      {
        key: KEY_CONFIG.generate_fake_actives_daily,
      },
      { value: true },
    );
    res.status(200).send({ result });
  } catch (err) {
    res.status(500).send(err);
  }
});

// Stop auto schedule fake actives UAW daily
router.post('/uaw/disable_auto_schedule_daily', auth, async (req, res) => {
  try {
    let result = await fakeActivesSchedule.disableScheuleFakeActivesDaily();
    await ConfigModel.findOneAndUpdate(
      {
        key: KEY_CONFIG.generate_fake_actives_daily,
      },
      { value: false },
    );
    res.status(200).send({ result });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.get('/status_auto_schedule_daily', auth, async (req, res) => {
  try {
    let configFakeActives = await ConfigModel.findOne({ key: KEY_CONFIG.generate_fake_actives_daily });
    if (!configFakeActives) {
      let newConfig = new ConfigModel({
        chain_id: 'ALL',
        key: KEY_CONFIG.generate_fake_actives_daily,
        value: true,
      });
      configFakeActives = await newConfig.save();
    }
    res.status(200).send({ data: JSON.parse(configFakeActives.value) });
  } catch (error) {
    res.status(500).send({ data: null, error: formatError(error) });
  }
});

//DELETE
router.delete('/uaw/:id_execute', auth, async (req, res) => {
  try {
    const id_execute = req.params.id_execute;
    await ExecuteFakeActivesModel.findByIdAndDelete(id_execute);
    res.status(200).send({
      result: true,
      msg: `Schedule fake actives [${id_execute}] has been deleted`,
    });
  } catch (err) {
    res.status(500).send(err);
  }
});

// ===================================================== Fee Coin ====================================================

router.post('/uaw/free_coin/enable_auto_schedule_daily', auth, async (req, res) => {
  try {
    let result = await fakeActivesSchedule.enableScheuleFakeActivesDailyFreeCoin({ chainId: 42220 });
    await ConfigModel.findOneAndUpdate(
      {
        key: KEY_CONFIG.generate_fake_actives_daily_free_coin,
      },
      { value: true },
    );
    res.status(200).send({ result });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.post('/uaw/free_coin/disable_auto_schedule_daily', auth, async (req, res) => {
  try {
    let result = await fakeActivesSchedule.disableScheuleFakeActivesDailyFreeCoin();
    await ConfigModel.findOneAndUpdate(
      {
        key: KEY_CONFIG.generate_fake_actives_daily_free_coin,
      },
      { value: false },
    );
    res.status(200).send({ result });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.get('/free_coin/status_auto_schedule_daily', auth, async (req, res) => {
  try {
    let configFakeActives = await ConfigModel.findOne({ key: KEY_CONFIG.generate_fake_actives_daily_free_coin });
    if (!configFakeActives) {
      let newConfig = new ConfigModel({
        chain_id: '42220',
        key: KEY_CONFIG.generate_fake_actives_daily_free_coin,
        value: true,
      });
      configFakeActives = await newConfig.save();
    }
    res.status(200).send({ data: JSON.parse(configFakeActives.value) });
  } catch (error) {
    res.status(500).send({ data: null, error: formatError(error) });
  }
});

export default router;
