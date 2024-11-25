import express from 'express';
import mongoose from 'mongoose';
import { assetsRecoveryToSource } from '../../src/handlers/assetsRecovery.js';
import agenda from '../../src/jobs/agenda.js';
import agendaFreeCoin from '../../src/jobs/agendaFreeCoin.js';
import ExecuteTemplateModel from '../../src/models/ExecuteTemplate.js';
import ExecuteTemplateFreeCoinModel from '../../src/models/ExecuteTemplateFreeCoin.js';
import { saveWalletsByIndexes } from '../../src/models/Wallet.js';
import { generateTemplateExecuteSpecific } from '../../src/templates/generateTemplateExecute.js';
import { PAGE_SIZE } from '../../utils/constant.js';
import { STATUS_JOB } from '../../utils/enum.js';
import { auth } from '../middleware/auth.js';
import { cancelExecuteAndReschedule } from '../../src/handlers/functions.js';

const router = express.Router();

//GET ALL ExecuteTemplate
router.get('/templates', auth, async (req, res) => {
  try {
    let { page, size } = req.query;
    if (!page) page = 1;
    else page = parseInt(page);
    if (!size) size = PAGE_SIZE;
    else size = parseInt(size);
    const limit = parseInt(size);
    const skip = (page - 1) * size;

    let objFilter = {};
    if (req.query?.id_execute) objFilter['_id'] = new mongoose.Types.ObjectId(req.query.id_execute?.toString());
    if (req.query?.chain_id) objFilter['chain_id'] = req.query.chain_id;
    if (req.query?.template) objFilter['template'] = { $regex: req.query.template.toLowerCase() };
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

    const executes = await ExecuteTemplateModel.find({ ...objFilter })
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total_documents = await ExecuteTemplateModel.countDocuments({ ...objFilter });
    const total_pages = Math.ceil(total_documents / size);

    const previous_pages = page - 1;
    const next_pages = Math.ceil((total_documents - skip) / size);

    res.status(200).send({ data: executes, page, size, previous_pages, next_pages, total_pages });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.post('/templates/:id_execute_template', auth, async (req, res) => {
  try {
    const execute = await ExecuteTemplateModel.findById(req.params.id_execute_template);
    const currentIndexJob = execute.stop_current;
    const job = execute.jobs.at(currentIndexJob);
    const jobId = job.job_id;
    let jobs = await agenda.jobs({ _id: { $eq: jobId } });
    jobs[0]?.run();
    res.status(200).send({ result: true });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.post('/cancel_and_recovery_assets/:id_execute_template', auth, async (req, res) => {
  try {
    const execute = await ExecuteTemplateModel.findById(req.params.id_execute_template);
    let jobIds = execute.jobs.map(job => job.job_id);
    await agenda.cancel({ _id: { $in: jobIds } });
    await ExecuteTemplateModel.findByIdAndUpdate(req.params.id_execute_template, { status: STATUS_JOB.canceled });
    assetsRecoveryToSource({
      chainId: execute.chain_id,
      indexWallets: execute.index_wallets,
      idExecuteTemplate: req.params.id_execute_template,
    });
    await saveWalletsByIndexes({ chainId: execute.chain_id, indexWallets: execute.index_wallets, is_using: false });
    res.status(200).send({ result: true });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.post('/cancel_recovery_assets_and_reschedule/:id_execute_template', auth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  let agendaJobs = [];
  try {
    const execute = await ExecuteTemplateModel.findById(req.params.id_execute_template);
    let jobIds = execute.jobs.map(job => job.job_id);
    await agenda.cancel({ _id: { $in: jobIds } });
    await ExecuteTemplateModel.findByIdAndUpdate(req.params.id_execute_template, { status: STATUS_JOB.canceled });
    assetsRecoveryToSource({
      chainId: execute.chain_id,
      indexWallets: execute.index_wallets,
      idExecuteTemplate: req.params.id_execute_template,
    });
    await saveWalletsByIndexes({ chainId: execute.chain_id, indexWallets: execute.index_wallets, is_using: false });

    let executes = await ExecuteTemplateModel.find({
      _id: { $ne: execute._id },
      chain_id: execute.chain_id,
      schedule_id: execute.schedule_id,
      index_wallets: { $in: execute.index_wallets },
      status: {
        $in: [STATUS_JOB.queued, STATUS_JOB.running, STATUS_JOB.scheduled, STATUS_JOB.rescheduled],
      },
    });

    if (executes.length <= 0) {
      const job_0 = execute.jobs.find(j => j.index == 0);
      const amount = job_0.amount;
      await generateTemplateExecuteSpecific({
        scheduleId: execute.schedule_id,
        isRepeat: execute.is_repeat,
        chainId: execute.chain_id,
        date: execute.date,
        templateId: execute.template_id,
        indexWallets: execute.index_wallets,
        amount,
        queue: agendaFreeCoin,
      });
    }

    await session.commitTransaction();
    await session.endSession();

    res.status(200).send({ result: true });
  } catch (err) {
    await session.abortTransaction();
    await session.endSession();
    await agenda.cancel({ _id: { $in: agendaJobs } });
    res.status(500).send(err);
  }
});

//DELETE
router.delete('/templates', auth, async (req, res) => {
  try {
    await ExecuteTemplateModel.findByIdAndDelete({ _id: new mongoose.Types.ObjectId(req.body.id_execute_template) });
    res.status(200).send({
      result: true,
      msg: `Execute template [_id: ${req.body.id_execute_template}] has been deleted`,
    });
  } catch (err) {
    res.status(500).send(err);
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
    if (req.query?.id_execute) objFilter['_id'] = new mongoose.Types.ObjectId(req.query.id_execute?.toString());
    if (req.query?.chain_id) objFilter['chain_id'] = req.query.chain_id;
    if (req.query?.template) objFilter['template'] = { $regex: req.query.template.toLowerCase() };
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

    const executes = await ExecuteTemplateFreeCoinModel.find({ ...objFilter })
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total_documents = await ExecuteTemplateFreeCoinModel.countDocuments({ ...objFilter });
    const total_pages = Math.ceil(total_documents / size);

    const previous_pages = page - 1;
    const next_pages = Math.ceil((total_documents - skip) / size);

    res.status(200).send({ data: executes, page, size, previous_pages, next_pages, total_pages });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.post('/templates/free_coin/:id_execute_template', auth, async (req, res) => {
  try {
    const execute = await ExecuteTemplateFreeCoinModel.findById(req.params.id_execute_template);
    const currentIndexJob = execute.stop_current;
    const job = execute.jobs.at(currentIndexJob);
    const jobId = job.job_id;
    let jobs = await agendaFreeCoin.jobs({ _id: { $eq: jobId } });
    jobs[0]?.run();
    res.status(200).send({ result: true });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.post('/cancel_and_recovery_assets/free_coin/:id_execute_template', auth, async (req, res) => {
  try {
    const execute = await ExecuteTemplateFreeCoinModel.findById(req.params.id_execute_template);
    let jobIds = execute.jobs.map(job => job.job_id);
    await agendaFreeCoin.cancel({ _id: { $in: jobIds } });
    await ExecuteTemplateFreeCoinModel.findByIdAndUpdate(req.params.id_execute_template, {
      status: STATUS_JOB.canceled,
    });
    assetsRecoveryToSource({
      chainId: execute.chain_id,
      indexWallets: execute.index_wallets,
      idExecuteTemplate: req.params.id_execute_template,
    });
    await saveWalletsByIndexes({ chainId: execute.chain_id, indexWallets: execute.index_wallets, is_using: false });
    res.status(200).send({ result: true });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.post('/cancel_recovery_assets_and_reschedule/:id_execute_template', auth, async (req, res) => {
  try {
    const { status, error } = await cancelExecuteAndReschedule({ id_execute_template: req.params.id_execute_template });
    if (!status) throw { error };
    res.status(200).send({ result: true });
  } catch (err) {
    res.status(500).send(err);
  }
});

//DELETE
router.delete('/templates/free_coin', auth, async (req, res) => {
  try {
    await ExecuteTemplateFreeCoinModel.findByIdAndDelete({
      _id: new mongoose.Types.ObjectId(req.body.id_execute_template),
    });
    res.status(200).send({
      result: true,
      msg: `Execute template free coin [_id: ${req.body.id_execute_template}] has been deleted`,
    });
  } catch (err) {
    res.status(500).send(err);
  }
});

export default router;
