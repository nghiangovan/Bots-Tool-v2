import express from 'express';

import agendaHolder from '../../src/holder/agendaHolder.js';
import fakeHoldersSchedule from '../../src/holder/schedules/fakeHolders.js';
import ConfigModel from '../../src/models/Config.js';
import ExecuteFakeHoldersModel from '../../src/models/ExecuteFakeHolders.js';
import { PAGE_SIZE } from '../../utils/constant.js';
import { KEY_CONFIG, NAME_JOB } from '../../utils/enum.js';
import { formatError } from '../../utils/format.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, async (req, res) => {
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

    const executes = await ExecuteFakeHoldersModel.find({ ...objFilter })
      .limit(limit)
      .skip(skip)
      .sort({ date: -1 });

    const total_documents = await ExecuteFakeHoldersModel.countDocuments({ ...objFilter });
    const total_pages = Math.ceil(total_documents / size);

    const previous_pages = page - 1;
    const next_pages = Math.ceil((total_documents - skip) / size);

    res.status(200).send({ data: executes, page, size, previous_pages, next_pages, total_pages });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const id_execute = req.body.id_execute;
    const executes = await ExecuteFakeHoldersModel.findById(id_execute);
    if (executes) {
      delete req.body.id_execute;
      const updatedExecute = await ExecuteFakeHoldersModel.findByIdAndUpdate(
        id_execute,
        { $set: { ...req.body } },
        { new: true },
      );
      return res.status(200).send(updatedExecute);
    }

    const { chain_id, date, is_daily } = req.body;

    if (is_daily) {
      let infoExecute = await ExecuteFakeHoldersModel.findOne({ chain_id, date, is_daily: true });
      if (infoExecute) {
        const updatedExecute = await ExecuteFakeHoldersModel.findByIdAndUpdate(
          infoExecute._id.toString(),
          { $set: { ...req.body } },
          { new: true },
        );
        return res.status(200).send(updatedExecute);
      }
    }

    const newExecute = new ExecuteFakeHoldersModel({ ...req.body });
    const savedExecute = await newExecute.save();
    return res.status(200).send(savedExecute);
  } catch (err) {
    res.status(500).send(err);
  }
});

router.post('/start/:id_execute', auth, async (req, res) => {
  try {
    const id_execute = req?.params?.id_execute;
    const infoExecute = await ExecuteFakeHoldersModel.findById(id_execute);
    if (!infoExecute) throw { error: `id_execute not found!` };
    await agendaHolder.now(NAME_JOB.holder.schedule_fake_holders, { id_execute });
    await ExecuteFakeHoldersModel.findByIdAndUpdate(id_execute, { stop_execute: false });
    res.status(200).send({ result: true });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.post('/stop/:id_execute', auth, async (req, res) => {
  try {
    const id_execute = req?.params?.id_execute;
    const infoExecute = await ExecuteFakeHoldersModel.findById(id_execute);
    if (!infoExecute) throw { error: `id_execute not found!` };
    await agendaHolder.cancel({ 'data.id_execute': id_execute });
    await ExecuteFakeHoldersModel.findByIdAndUpdate(id_execute, { stop_execute: true });
    res.status(200).send({ result: true });
  } catch (err) {
    res.status(500).send(err);
  }
});

//DELETE
router.delete('/delete/:id_execute', auth, async (req, res) => {
  try {
    const id_execute = req.params.id_execute;
    await ExecuteFakeHoldersModel.findByIdAndDelete(id_execute);
    res.status(200).send({
      result: true,
      msg: `Schedule fake actives [${id_execute}] has been deleted`,
    });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.post('/enable_auto_schedule_daily', auth, async (req, res) => {
  try {
    let result = await fakeHoldersSchedule.enableScheuleFakeHoldersDaily({ chainId: 56 });
    await ConfigModel.findOneAndUpdate(
      {
        key: KEY_CONFIG.generate_fake_holders_daily,
      },
      { value: true },
    );
    res.status(200).send({ result });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.post('/disable_auto_schedule_daily', auth, async (req, res) => {
  try {
    let result = await fakeHoldersSchedule.disableScheuleFakeHoldersDaily();
    await ConfigModel.findOneAndUpdate(
      {
        key: KEY_CONFIG.generate_fake_holders_daily,
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
    let configFakeHolders = await ConfigModel.findOne({ key: KEY_CONFIG.generate_fake_holders_daily });
    if (!configFakeHolders) {
      let newConfig = new ConfigModel({
        chain_id: 'ALL',
        key: KEY_CONFIG.generate_fake_holders_daily,
        value: true,
      });
      configFakeHolders = await newConfig.save();
    }
    res.status(200).send({ data: JSON.parse(configFakeHolders.value) });
  } catch (error) {
    res.status(500).send({ data: null, error: formatError(error) });
  }
});

export default router;
