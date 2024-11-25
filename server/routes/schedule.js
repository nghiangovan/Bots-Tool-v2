import express from 'express';
import agenda from '../../src/jobs/agenda.js';
import autoSchedule from '../../src/jobs/schedules/auto.js';
import ScheduleExecuteAutoModel from '../../src/models/ScheduleExecuteAuto.js';
import ScheduleExecuteManualModel from '../../src/models/ScheduleTemplateManual.js';
import { PAGE_SIZE } from '../../utils/constant.js';
import { KEY_CONFIG, NAME_JOB } from '../../utils/enum.js';
import { auth } from '../middleware/auth.js';
import moment from 'moment';
import ConfigModel from '../../src/models/Config.js';
import ScheduleExecuteFreeCoinModel from '../../src/models/ScheduleExecuteFreeCoin.js';
import freeCoinSchedule from '../../src/jobs/schedules/freeCoin.js';
import agendaFreeCoin from '../../src/jobs/agendaFreeCoin.js';

const router = express.Router();

//GET ALL ScheduleTemplate auto
router.get('/templates/auto', auth, async (req, res) => {
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

    let schedules = await ScheduleExecuteAutoModel.find({ ...objFilter })
      .limit(limit)
      .skip(skip)
      .sort({ date: -1 });

    schedules = await Promise.all(
      schedules.map(i => {
        return {
          _id: i._id,
          chain_id: i.chain_id,
          date: i.date,
          kpi_uaw: i.kpi_uaw,
          kpi_volume: i.kpi_volume ? parseFloat(i.kpi_volume) : 0,
          number_new_wallets: i.number_new_wallets,
          is_repeat: i.is_repeat,
          is_scheduled: i.is_scheduled,
          random_gaps_buy_sell: i?.random_gaps_buy_sell || 0,
        };
      }),
    );

    const total_documents = await ScheduleExecuteAutoModel.countDocuments({ ...objFilter });
    const total_pages = Math.ceil(total_documents / size);

    const previous_pages = page - 1;
    const next_pages = Math.ceil((total_documents - skip) / size);

    res.status(200).send({ data: schedules, page, size, previous_pages, next_pages, total_pages });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.get('/templates/manual', auth, async (req, res) => {
  try {
    let { start_date, end_date } = req.query;

    let objFilter = {
      date: {
        $gte: start_date,
        $lte: end_date,
      },
    };
    if (req.query?.chain_id) objFilter['chain_id'] = req.query.chain_id;

    let schedules = await ScheduleExecuteManualModel.find({ ...objFilter }).sort({ date: -1, createdAt: -1 });

    schedules = await Promise.all(
      schedules.map(i => {
        return {
          _id: i._id,
          chain_id: i.chain_id,
          date: i.date,
          kpi_uaw: i.kpi_uaw,
          kpi_volume: i.kpi_volume ? parseFloat(i.kpi_volume) : 0,
          number_new_wallets: i.number_new_wallets,
          is_repeat: i.is_repeat,
          is_scheduled: i.is_scheduled,
          random_gaps_buy_sell: i?.random_gaps_buy_sell || 0,
        };
      }),
    );

    res.status(200).send({ data: schedules });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.post('/templates/auto', auth, async (req, res) => {
  try {
    const schedules = await ScheduleExecuteAutoModel.find({
      chain_id: req.body.chain_id,
      date: req.body.date,
    });
    if (schedules.length) {
      const updatedSchedule = await ScheduleExecuteAutoModel.findOneAndUpdate(
        { chain_id: req.body.chain_id, date: req.body.date },
        {
          $set: req.body,
        },
        { new: true },
      );
      res.status(200).send(updatedSchedule);
    } else {
      const newSchedule = new ScheduleExecuteAutoModel(req.body);
      const savedSchedule = await newSchedule.save();
      res.status(200).send(savedSchedule);
    }
  } catch (err) {
    res.status(500).send(err);
  }
});

router.post('/templates/manual', auth, async (req, res) => {
  try {
    const newSchedule = new ScheduleExecuteManualModel(req.body);
    const savedSchedule = await newSchedule.save();
    res.status(200).send({ data: savedSchedule, status: true, err: null });
  } catch (err) {
    res.status(500).send({ data: null, status: false, err });
  }
});

router.put('/templates/manual', auth, async (req, res) => {
  try {
    const schedules = await ScheduleExecuteManualModel.findById(req.body.schedule_id);
    if (!schedules) return res.status(400).send({ data: null, status: false, err: 'Schedule not found!' });
    const updatedSchedule = await ScheduleExecuteManualModel.findByIdAndUpdate(
      req.body.schedule_id,
      {
        $set: req.body,
      },
      { new: true },
    );
    return res.status(200).send({ data: updatedSchedule, status: true, err: null });
  } catch (err) {
    return res.status(500).send({ data: null, status: false, err });
  }
});

//DELETE
router.delete('/templates', auth, async (req, res) => {
  try {
    await ScheduleExecuteAutoModel.findOneAndDelete({ chain_id: req.body.chain_id, date: req.body.date });
    res.status(200).send({
      result: true,
      msg: `ScheduleTemplate Auto [chain_id: ${req.body.chain_id}] - [date: ${req.body.date}] has been deleted`,
    });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.delete('/templates/manual/:schedule_id', auth, async (req, res) => {
  try {
    await ScheduleExecuteManualModel.findByIdAndDelete(req.params.schedule_id);
    res.status(200).send({
      result: true,
      msg: `ScheduleTemplate manual [chain_id: ${req.body.chain_id}] - [date: ${req.body.date}] has been deleted`,
    });
  } catch (err) {
    res.status(500).send(err);
  }
});

// Run schedule generate execute templates ( is_schedule must false then schedule can generarte executes )
router.post('/templates/reschedule', auth, async (req, res) => {
  try {
    await agenda.now(NAME_JOB.auto.generate_templates_auto); // create execute template of current date
    res.status(200).send({ result: true });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.post('/templates/manual/:schedule_id', auth, async (req, res) => {
  try {
    const schedule = await ScheduleExecuteManualModel.findById(req.params.schedule_id);
    if (!schedule) return res.status(400).send({ result: false, msg: 'Schedule not found!' });
    if (!moment(schedule.date).isSame(moment(), 'day'))
      return res.status(400).send({ result: false, msg: 'Schedule different current date!' });
    if (!schedule.is_scheduled) {
      await agenda.now(NAME_JOB.manual.generate_templates_manual, {
        schedule_id: schedule._id,
        chain_id: schedule.chain_id,
        date: schedule.date,
        kpi_uaw: schedule.kpi_uaw,
        kpi_volume: parseFloat(schedule.kpi_volume),
        number_new_wallets: schedule.number_new_wallets,
        is_scheduled: schedule.is_scheduled,
        is_repeat: schedule.is_repeat,
      });
      return res.status(200).send({ result: true });
    }
    return res.status(400).send({ result: false, msg: 'Scheduled!' });
  } catch (err) {
    return res.status(500).send(err);
  }
});

router.post('/enable_auto_gen_execute_templates', auth, async (req, res) => {
  try {
    let result = await autoSchedule.enableAutoGenerateExecuteTemplates();
    await ConfigModel.findOneAndUpdate(
      {
        key: KEY_CONFIG.generate_templates_auto_daily,
      },
      { value: true },
    );
    res.status(200).send({ result });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.post('/disable_auto_gen_execute_templates', auth, async (req, res) => {
  try {
    let result = await autoSchedule.disableAutoGenerateExecuteTemplates();
    await ConfigModel.findOneAndUpdate(
      {
        key: KEY_CONFIG.generate_templates_auto_daily,
      },
      { value: false },
    );
    res.status(200).send({ result });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.get('/status_auto_gen_execute_templates', auth, async (req, res) => {
  try {
    let jobs = await agenda.jobs({ name: NAME_JOB.auto.generate_templates_auto, type: 'single' });
    if (jobs.length <= 0) return res.status(200).send({ disable: true, status: true, err: null });
    else return res.status(200).send({ disable: false, status: true, err: null });
  } catch (err) {
    return res.status(500).send({ status: false, err });
  }
});

// ===================================================== Fee Coin ====================================================

router.get('/templates/free_coin', auth, async (req, res) => {
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

    const schedules = await ScheduleExecuteFreeCoinModel.find({ ...objFilter })
      .limit(limit)
      .skip(skip)
      .sort({ date: -1 });

    const total_documents = await ScheduleExecuteFreeCoinModel.countDocuments({ ...objFilter });
    const total_pages = Math.ceil(total_documents / size);

    const previous_pages = page - 1;
    const next_pages = Math.ceil((total_documents - skip) / size);

    res.status(200).send({ data: schedules, page, size, previous_pages, next_pages, total_pages });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.post('/templates/free_coin', auth, async (req, res) => {
  try {
    const schedule_id = req.body.schedule_id;
    if (schedule_id) {
      const update = await ScheduleExecuteFreeCoinModel.findByIdAndUpdate(schedule_id, { $set: req.body });
      return res.status(200).send(update);
    }

    const is_repeat = req.body.is_repeat == true ? true : false;
    const chain_id = req.body.chain_id;
    const date = req.body.date;

    const schedules = is_repeat ? await ScheduleExecuteFreeCoinModel.find({ is_repeat, chain_id, date }) : [];

    if (schedules.length) {
      const update = await ScheduleExecuteFreeCoinModel.findOneAndUpdate(
        { chain_id, date },
        { $set: req.body },
        { new: true },
      );
      return res.status(200).send(update);
    } else {
      const newSchedule = new ScheduleExecuteFreeCoinModel({ ...req.body, is_repeat });
      const savedSchedule = await newSchedule.save();
      return res.status(200).send(savedSchedule);
    }
  } catch (err) {
    res.status(500).send(err);
  }
});

router.post('/templates/free_coin/:schedule_id', auth, async (req, res) => {
  try {
    const schedule = await ScheduleExecuteFreeCoinModel.findById(req.params.schedule_id);
    if (!schedule) return res.status(400).send({ result: false, msg: 'Schedule not found!' });
    if (!moment(schedule.date).isSame(moment(), 'day'))
      return res.status(400).send({ result: false, msg: 'Schedule different current date!' });
    if (!schedule.is_scheduled) {
      const name = schedule.is_repeat
        ? NAME_JOB.auto.generate_templates_free_coin_auto
        : NAME_JOB.manual.generate_templates_free_coin_manual;
      await agendaFreeCoin.now(name, {
        schedule_id: schedule._id,
        chain_id: schedule.chain_id,
        date: schedule.date,
        kpi_uaw: schedule.kpi_uaw,
        number_new_wallets: schedule.number_new_wallets,
        amount_max: schedule.amount_max,
        amount_min: schedule.amount_min,
        is_scheduled: schedule.is_scheduled,
        is_repeat: schedule.is_repeat,
      });
      return res.status(200).send({ result: true });
    }
    return res.status(400).send({ result: false, msg: 'Scheduled!' });
  } catch (err) {
    return res.status(500).send(err);
  }
});

router.delete('/templates/free_coin', auth, async (req, res) => {
  try {
    const schedule_id = req.body.schedule_id;
    await ScheduleExecuteFreeCoinModel.findByIdAndDelete(schedule_id);
    res.status(200).send({
      result: true,
      msg: `ScheduleTemplate Free Coin [chain_id: ${req.body.chain_id}] - [date: ${req.body.date}] has been deleted`,
    });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.post('/free_coin/enable_auto_gen_execute_templates', auth, async (req, res) => {
  try {
    let result = await freeCoinSchedule.enableAutoGenerateExecuteTemplatesFreeCoin();
    await ConfigModel.findOneAndUpdate(
      {
        key: KEY_CONFIG.generate_templates_free_coin_auto_daily,
      },
      { value: true },
      { new: true },
    );
    res.status(200).send({ result });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.post('/free_coin/disable_auto_gen_execute_templates', auth, async (req, res) => {
  try {
    let result = await freeCoinSchedule.disableAutoGenerateExecuteTemplatesFreeCoin();
    await ConfigModel.findOneAndUpdate(
      {
        key: KEY_CONFIG.generate_templates_free_coin_auto_daily,
      },
      { value: false },
      { new: true },
    );
    res.status(200).send({ result });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.get('/free_coin/status_auto_gen_execute_templates', auth, async (req, res) => {
  try {
    let jobs = await agendaFreeCoin.jobs({ name: NAME_JOB.auto.generate_templates_free_coin_auto, type: 'single' });
    if (jobs.length <= 0) return res.status(200).send({ disable: true, status: true, err: null });
    else return res.status(200).send({ disable: false, status: true, err: null });
  } catch (err) {
    return res.status(500).send({ status: false, err });
  }
});

export default router;
