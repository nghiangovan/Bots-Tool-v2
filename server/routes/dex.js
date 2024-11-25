import express from 'express';
import moment from 'moment';
import mongoose from 'mongoose';
import agendaDex from '../../src/dex/agendaDex.js';
import dexSchedule from '../../src/dex/schedules/dex.js';
import { reportBalanceDex } from '../../src/dex/services/report.js';
import ConfigModel from '../../src/models/Config.js';
import ExecuteDexModel from '../../src/models/ExecuteDex.js';
import ReportBalancesDexModel from '../../src/models/ReportBalancesDex.js';
import ScheduleDexModel from '../../src/models/ScheduleDex.js';
import { saveWalletsExecuteDexByIndexes } from '../../src/models/WalletExecuteDex.js';
import { PAGE_SIZE } from '../../utils/constant.js';
import { KEY_CONFIG, NAME_JOB, STATUS_JOB } from '../../utils/enum.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.get('/schedule', auth, async (req, res) => {
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

    let schedules = await ScheduleDexModel.find({ ...objFilter })
      .limit(limit)
      .skip(skip)
      .sort({ date: -1 });

    schedules = schedules.map(i => ({
      _id: i._id,
      date: i.date,
      chain_id: i.chain_id,
      kpi_uaw: i.kpi_uaw,
      kpi_volume: i.kpi_volume ? parseFloat(i.kpi_volume) : 0,
      number_new_wallets: i.number_new_wallets,
      is_repeat: i.is_repeat,
      is_scheduled: i.is_scheduled,
      average_volume: i.average_volume ? parseFloat(i.average_volume) : 0,
      random_gaps_buy_sell: i.random_gaps_buy_sell,
    }));

    const total_documents = await ScheduleDexModel.countDocuments({ ...objFilter });
    const total_pages = Math.ceil(total_documents / size);

    const previous_pages = page - 1;
    const next_pages = Math.ceil((total_documents - skip) / size);

    res.status(200).send({ data: schedules, page, size, previous_pages, next_pages, total_pages });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.post('/schedule', auth, async (req, res) => {
  try {
    const schedule_id = req.body.schedule_id;
    if (schedule_id) {
      const update = await ScheduleDexModel.findByIdAndUpdate(schedule_id, { $set: req.body });
      return res.status(200).send(update);
    }

    const is_repeat = req.body.is_repeat == true ? true : false;
    const chain_id = req.body.chain_id;
    const date = req.body.date;

    const schedules = is_repeat ? await ScheduleDexModel.find({ is_repeat, chain_id, date }) : [];

    if (schedules.length) {
      const update = await ScheduleDexModel.findOneAndUpdate({ chain_id, date }, { $set: req.body }, { new: true });
      return res.status(200).send(update);
    } else {
      const newSchedule = new ScheduleDexModel({ ...req.body, is_repeat });
      const savedSchedule = await newSchedule.save();
      return res.status(200).send(savedSchedule);
    }
  } catch (err) {
    res.status(500).send(err);
  }
});

router.post('/schedule/:schedule_id', auth, async (req, res) => {
  try {
    const schedule = await ScheduleDexModel.findById(req.params.schedule_id);
    if (!schedule) return res.status(400).send({ result: false, msg: 'Schedule DEX not found!' });
    if (!moment(schedule.date).isSame(moment(), 'day'))
      return res.status(400).send({ result: false, msg: 'Schedule DEX different current date!' });
    if (!schedule.is_scheduled) {
      const name = schedule.is_repeat ? NAME_JOB.dex.schedule_dex_auto_daily : NAME_JOB.dex.schedule_dex_manual;
      await agendaDex.now(name, {
        schedule_id: schedule._id,
        chain_id: schedule.chain_id,
        date: schedule.date,
        kpi_uaw: schedule.kpi_uaw,
        kpi_volume: schedule.kpi_volume,
        number_new_wallets: schedule.number_new_wallets,
        is_scheduled: schedule.is_scheduled,
        is_repeat: schedule.is_repeat,
        average_volume: parseFloat(schedule.average_volume),
      });
      return res.status(200).send({ result: true });
    }
    return res.status(400).send({ result: false, msg: 'Scheduled!' });
  } catch (err) {
    return res.status(500).send(err);
  }
});

router.delete('/schedule', auth, async (req, res) => {
  try {
    const schedule_id = req.body.schedule_id;
    await ScheduleDexModel.findByIdAndDelete(schedule_id);
    res.status(200).send({
      result: true,
      msg: `Schedule DEX ${schedule_id} has been deleted`,
    });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.post('/enable_scheule_dex_auto_daily', auth, async (req, res) => {
  try {
    let result = await dexSchedule.enableScheuleDexAutoDaily();
    await ConfigModel.findOneAndUpdate(
      {
        key: KEY_CONFIG.generate_dex_auto_daily,
      },
      { value: true },
      { new: true },
    );
    res.status(200).send({ result });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.post('/disable_scheule_dex_auto_daily', auth, async (req, res) => {
  try {
    let result = await dexSchedule.disableScheuleDexAutoDaily();
    await ConfigModel.findOneAndUpdate(
      {
        key: KEY_CONFIG.generate_dex_auto_daily,
      },
      { value: false },
      { new: true },
    );
    res.status(200).send({ result });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.get('/status_scheule_dex_auto_daily', auth, async (req, res) => {
  try {
    let jobs = await agendaDex.jobs({ name: NAME_JOB.dex.schedule_dex_auto_daily, type: 'single' });
    if (jobs.length <= 0) return res.status(200).send({ disable: true, status: true, err: null });
    else return res.status(200).send({ disable: false, status: true, err: null });
  } catch (err) {
    return res.status(500).send({ status: false, err });
  }
});

// ===================================================== Execute Dex ====================================================

router.get('/execute', auth, async (req, res) => {
  try {
    let { page, size } = req.query;
    if (!page) page = 1;
    else page = parseInt(page);
    if (!size) size = PAGE_SIZE;
    else size = parseInt(size);
    const limit = parseInt(size);
    const skip = (page - 1) * size;

    let objFilter = {};
    if (req.query?.execute_id) objFilter['_id'] = new mongoose.Types.ObjectId(req.query.execute_id?.toString());
    if (req.query?.chain_id) objFilter['chain_id'] = req.query.chain_id;
    if (req.query?.date) objFilter['date'] = { $regex: req.query.date.toLowerCase() };
    if (req.query?.index_wallets)
      objFilter['index_wallets'] = {
        $in: Array.isArray(req.query.index_wallets)
          ? req.query.index_wallets.map(i => parseInt(i))
          : JSON.parse('[' + parseInt(req.query.index_wallets) + ']'),
      };
    if (req.query?.stop_current) objFilter['stop_current'] = req.query.stop_current;
    if (req.query?.is_done) objFilter['is_done'] = req.query.is_done;
    if (req.query?.status) objFilter['status'] = req.query.status;

    const executes = await ExecuteDexModel.find({ ...objFilter })
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total_documents = await ExecuteDexModel.countDocuments({ ...objFilter });
    const total_pages = Math.ceil(total_documents / size);

    const previous_pages = page - 1;
    const next_pages = Math.ceil((total_documents - skip) / size);

    res.status(200).send({ data: executes, page, size, previous_pages, next_pages, total_pages });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.post('/execute/:execute_id', auth, async (req, res) => {
  try {
    const execute = await ExecuteDexModel.findById(req.params.execute_id);
    if (execute?.jobs && execute?.jobs?.length > 0) {
      const currentIndexJob = execute.stop_current;
      const job = execute.jobs.at(currentIndexJob);
      const jobId = job.job_id;
      let jobs = await agendaDex.jobs({ _id: { $eq: jobId } });
      await jobs[0]?.run();
    } else {
      let jobs = await agendaDex.jobs({ 'name': NAME_JOB.dex.schedule_execute_jobs, 'data.execute_id': execute._id });
      await jobs[0]?.run();
    }

    res.status(200).send({ result: true });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.post('/execute/cancel/:execute_id', auth, async (req, res) => {
  try {
    const execute = await ExecuteDexModel.findById(req.params.execute_id);
    if (execute?.jobs && execute?.jobs?.length > 0) {
      const currentIndexJob = execute.stop_current;
      const jobs = execute.jobs.filter(j => j.index >= currentIndexJob);
      const jobIds = jobs.map(job => job.job_id);
      await agendaDex.cancel({ _id: { $in: jobIds } });
    } else {
      await agendaDex.cancel({
        'name': NAME_JOB.dex.schedule_execute_jobs,
        'data.execute_id': execute._id,
      });
    }
    await saveWalletsExecuteDexByIndexes({
      chainId: execute.chain_id,
      indexWallets: [execute.index_wallets[0]],
      isUsing: false,
    });
    await execute.updateOne({ status: STATUS_JOB.canceled });
    res.status(200).send({ result: true });
  } catch (err) {
    res.status(500).send(err);
  }
});

//DELETE
router.delete('/execute', auth, async (req, res) => {
  try {
    await ExecuteDexModel.findByIdAndDelete({ _id: new mongoose.Types.ObjectId(req.body.execute_id) });
    res.status(200).send({
      result: true,
      msg: `Execute template [_id: ${req.body.execute_id}] has been deleted`,
    });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.get('/report_balances_dex', auth, async (req, res) => {
  try {
    const data = await reportBalanceDex();
    res.status(200).send({ data });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.get('/history_balances_dex', auth, async (req, res) => {
  try {
    let { page, size } = req.query;
    if (!page) page = 1;
    else page = parseInt(page);
    if (!size) size = PAGE_SIZE;
    else size = parseInt(size);
    const limit = parseInt(size);
    const skip = (page - 1) * size;

    let balances = await ReportBalancesDexModel.find().limit(limit).skip(skip).sort({ time_cache: -1 });
    balances = balances.map(i => ({
      chain_id: i.chain_id,
      total_lcr_pair: parseFloat(i.total_lcr_pair),
      total_usdt_pair: parseFloat(i.total_usdt_pair),
      total_bnb_source_dex: parseFloat(i.total_bnb_source_dex),
      total_lcr_source_dex: parseFloat(i.total_lcr_source_dex),
      total_usdt_source_dex: parseFloat(i.total_usdt_source_dex),
      number_source_dex: i.number_source_dex,
      total_bnb_bots: parseFloat(i.total_bnb_bots),
      total_lcr_bots: parseFloat(i.total_lcr_bots),
      total_usdt_bots: parseFloat(i.total_usdt_bots),
      total_holding_amount_bots: parseFloat(i.total_holding_amount_bots),
      number_bots: i.number_bots,
      date: i.date,
      time_cache: i.time_cache,
    }));

    const total_documents = await ReportBalancesDexModel.countDocuments();
    const total_pages = Math.ceil(total_documents / size);

    const previous_pages = page - 1;
    const next_pages = Math.ceil((total_documents - skip) / size);

    res.status(200).send({ data: balances, page, size, previous_pages, next_pages, total_pages });
  } catch (err) {
    res.status(500).send(err);
  }
});

export default router;
