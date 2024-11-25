/* eslint-disable no-undef */
import express from 'express';
import mongoose from 'mongoose';
import agenda, { getAgendaStatus, setAgendaStatus } from '../../src/jobs/agenda.js';
import { NAME_JOB, STATUS_JOB, TYPE_QUEUE } from '../../utils/enum.js';
import { formatError } from '../../utils/format.js';
import { auth } from '../middleware/auth.js';
import { sleep } from '../../utils/utils.js';
import agendaSkim, { getAgendaSkimStatus, setAgendaSkimStatus } from '../../src/fakeActives/jobsSkim/agendaSkim.js';
import agendaHolder, { getAgendaHolderStatus, setAgendaHolderStatus } from '../../src/holder/agendaHolder.js';
import agendaFreeCoin, { getAgendaFreeCoinStatus, setAgendaFreeCoinStatus } from '../../src/jobs/agendaFreeCoin.js';
import agendaDex from '../../src/dex/agendaDex.js';
// import moment from 'moment';

const router = express.Router();

router.post('/run/:type_queue/:job_id', auth, async (req, res) => {
  try {
    const queue = await getInstanceQueue(req.params.type_queue);
    let job = await queue.jobs({ _id: { $eq: new mongoose.Types.ObjectId(req.params.job_id) } });
    job[0].run();
    res.status(200).send({ result: true, error: null });
  } catch (error) {
    res.status(400).send({ result: false, error: formatError(error) });
  }
});

router.post('/stop/:type_queue', auth, async (req, res) => {
  try {
    const queue = await getInstanceQueue(req.params.type_queue);
    await queue.stop();
    switch (req.params.type_queue) {
      case TYPE_QUEUE.agenda:
        setAgendaStatus(false);
        break;
      case TYPE_QUEUE.agenda_skim:
        setAgendaSkimStatus(false);
        break;
      case TYPE_QUEUE.agenda_holder:
        setAgendaHolderStatus(false);
        break;
      case TYPE_QUEUE.agenda_free_coin:
        setAgendaFreeCoinStatus(false);
        break;
    }

    res.status(200).send({ result: true, error: null });
  } catch (error) {
    res.status(400).send({ result: false, error: formatError(error) });
  }
});

router.post('/start/:type_queue', auth, async (req, res) => {
  try {
    const queue = await getInstanceQueue(req.params.type_queue);
    await queue.start();
    switch (req.params.type_queue) {
      case TYPE_QUEUE.agenda:
        setAgendaStatus(true);
        break;
      case TYPE_QUEUE.agenda_skim:
        setAgendaSkimStatus(true);
        break;
      case TYPE_QUEUE.agenda_holder:
        setAgendaHolderStatus(true);
        break;
      case TYPE_QUEUE.agenda_free_coin:
        setAgendaFreeCoinStatus(true);
        break;
    }
    res.status(200).send({ result: true, error: null });
  } catch (error) {
    res.status(400).send({ result: false, error: formatError(error) });
  }
});

router.get('/status/:type_queue', auth, async (req, res) => {
  try {
    switch (req.params.type_queue) {
      case TYPE_QUEUE.agenda:
        return res.status(200).send({ status: getAgendaStatus() });
      case TYPE_QUEUE.agenda_skim:
        return res.status(200).send({ status: getAgendaSkimStatus() });
      case TYPE_QUEUE.agenda_holder:
        return res.status(200).send({ status: getAgendaHolderStatus() });
      case TYPE_QUEUE.agenda_free_coin:
        return res.status(200).send({ status: getAgendaFreeCoinStatus() });
    }
    res.status(400).send({ status: false, error: 'Type queue not found' });
  } catch (error) {
    res.status(400).send({ status: false, error: formatError(error) });
  }
});

router.post('/run_jobs_all/:type_queue/running', auth, async (req, res) => {
  try {
    const { jobs, status, error } = await getJobsByType({
      type_queue: req.params.type_queue,
      type_job: STATUS_JOB.running,
    });
    if (!status) return res.status(400).send({ status: false, error: formatError(error) });
    Promise.all(
      jobs.map(async (job, i) => {
        await sleep(i * 100);
        await job.run();
      }),
    );
    res.status(200).send({ status: true });
  } catch (error) {
    res.status(400).send({ status: false, error: formatError(error) });
  }
});

router.post('/run_jobs_all/:type_queue/running/:name_job', auth, async (req, res) => {
  try {
    const { jobs, status, error } = await getJobsByType({
      type_queue: req.params.type_queue,
      type_job: STATUS_JOB.running,
    });
    if (!status) return res.status(400).send({ status: false, error: formatError(error) });
    const name_job = req.params.name_job;
    Promise.all(
      jobs.map(async (job, i) => {
        await sleep(i * 100);
        return job.attrs.name == name_job && (await job.run());
      }),
    );
    res.status(200).send({ status: true });
  } catch (error) {
    res.status(400).send({ status: false, error: formatError(error) });
  }
});

router.post('/run_jobs_all/:type_queue/queued', auth, async (req, res) => {
  try {
    const { jobs, status, error } = await getJobsByType({
      type_queue: req.params.type_queue,
      type_job: STATUS_JOB.queued,
    });
    if (!status) return res.status(400).send({ status: false, error: formatError(error) });
    Promise.all(
      jobs.map(async (job, i) => {
        await sleep(i * 100);
        await job.run();
      }),
    );
    res.status(200).send({ status: true });
  } catch (error) {
    res.status(400).send({ status: false, error: formatError(error) });
  }
});

router.post('/run_jobs_all/:type_queue/queued/:name_job', auth, async (req, res) => {
  try {
    const { jobs, status, error } = await getJobsByType({
      type_queue: req.params.type_queue,
      type_job: STATUS_JOB.queued,
    });
    if (!status) return res.status(400).send({ status: false, error: formatError(error) });
    const name_job = req.params.name_job;
    Promise.all(
      jobs.map(async (job, i) => {
        await sleep(i * 100);
        return job.attrs.name == name_job && (await job.run());
      }),
    );
    res.status(200).send({ status: true });
  } catch (error) {
    res.status(400).send({ status: false, error: formatError(error) });
  }
});

router.post('/run_jobs_all/:type_queue/failed', auth, async (req, res) => {
  try {
    const { jobs, status, error } = await getJobsByType({
      type_queue: req.params.type_queue,
      type_job: STATUS_JOB.failed,
    });
    if (!status) return res.status(400).send({ status: false, error: formatError(error) });
    Promise.all(
      jobs.map(async (job, i) => {
        await sleep(i * 100);
        await job.run();
      }),
    );

    res.status(200).send({ status: true });
  } catch (error) {
    res.status(400).send({ status: false, error: formatError(error) });
  }
});

router.post('/run_jobs_all/:type_queue/failed/:name_job', auth, async (req, res) => {
  try {
    const { jobs, status, error } = await getJobsByType({
      type_queue: req.params.type_queue,
      type_job: STATUS_JOB.failed,
    });
    if (!status) return res.status(400).send({ status: false, error: formatError(error) });
    const name_job = req.params.name_job;
    Promise.all(
      jobs.map(async (job, i) => {
        await sleep(i * 100);
        return job.attrs.name == name_job && (await job.run());
      }),
    );

    res.status(200).send({ status: true });
  } catch (error) {
    res.status(400).send({ status: false, error: formatError(error) });
  }
});

router.post('/run_jobs_all/:type_queue/scheduled', auth, async (req, res) => {
  try {
    const { jobs, status, error } = await getJobsByType({
      type_queue: req.params.type_queue,
      type_job: STATUS_JOB.scheduled,
    });
    if (!status) return res.status(400).send({ status: false, error: formatError(error) });
    Promise.all(
      jobs.map(async (job, i) => {
        await sleep(i * 100);
        await job.run();
      }),
    );
    res.status(200).send({ status: true });
  } catch (error) {
    res.status(400).send({ status: false, error: formatError(error) });
  }
});

router.post('/run_jobs_all/:type_queue/scheduled/:name_job', auth, async (req, res) => {
  try {
    const { jobs, status, error } = await getJobsByType({
      type_queue: req.params.type_queue,
      type_job: STATUS_JOB.scheduled,
    });
    if (!status) return res.status(400).send({ status: false, error: formatError(error) });
    const name_job = req.params.name_job;
    Promise.all(
      jobs.map(async (job, i) => {
        await sleep(i * 100);
        return job.attrs.name == name_job && (await job.run());
      }),
    );
    res.status(200).send({ status: true });
  } catch (error) {
    res.status(400).send({ status: false, error: formatError(error) });
  }
});

router.post('/run_jobs', auth, async (req, res) => {
  try {
    const queue = await getInstanceQueue(req.body.type_queue);
    if (queue) return { status: false, error: `Type queue not found!` };
    let job_ids = req.body.job_ids;
    job_ids = Array.isArray(job_ids) ? job_ids : [];
    job_ids = await Promise.all(job_ids.map(job_id => new mongoose.Types.ObjectId(job_id)));
    let jobs = await queue.jobs({ _id: { $in: job_ids } });
    Promise.all(
      jobs.map(async (job, i) => {
        await sleep(i * 100);
        await job.run();
      }),
    );
    res.status(200).send({ status: true });
  } catch (error) {
    res.status(400).send({ status: false, error: formatError(error) });
  }
});

router.post('/remove_failed/:type_queue', auth, async (req, res) => {
  try {
    const queue = await getInstanceQueue(req.params.type_queue);
    // Remove jobs FAILED have Fail Count greater than 5
    let jobsFailed = await queue.jobs({
      $and: [
        { lastFinishedAt: { $exists: true } },
        { failedAt: { $exists: true } },
        { $expr: { $eq: ['$lastFinishedAt', '$failedAt'] } },
      ],
    });
    if (jobsFailed.length > 0)
      await Promise.all(jobsFailed.map(async item => item.attrs.failCount > 5 && (await item.remove())));
    res.status(200).send({ status: true });
  } catch (error) {
    res.status(400).send({ status: false, error: formatError(error) });
  }
});

router.post('/remove_failed/:type_queue/:name_job', auth, async (req, res) => {
  try {
    const queue = await getInstanceQueue(req.params.type_queue);
    const name_job = req.params.name_job;
    // Remove jobs FAILED have Fail Count greater than 5
    let jobsFailed = await queue.jobs({
      $and: [
        { lastFinishedAt: { $exists: true } },
        { failedAt: { $exists: true } },
        { $expr: { $eq: ['$lastFinishedAt', '$failedAt'] } },
      ],
    });
    if (jobsFailed.length > 0)
      await Promise.all(
        jobsFailed.map(async item => item.attrs.failCount > 5 && item.attrs.name == name_job && (await item.remove())),
      );
    res.status(200).send({ status: true });
  } catch (error) {
    res.status(400).send({ status: false, error: formatError(error) });
  }
});

router.get('/jobs', auth, async (req, res) => {
  try {
    let { type_queue, type_job, page, size } = req.query;
    if (!page) page = 1;
    else page = parseInt(page);
    if (!size) size = PAGE_SIZE;
    else size = parseInt(size);
    const from = (page - 1) * size;
    const to = page * parseInt(size);

    let jobs = await getJobsByType({ type_queue, type_job });
    let jobsLimit = jobs.slice(from, to);

    const total_documents = jobs.length;
    const total_pages = Math.ceil(total_documents / size);

    const previous_pages = page - 1;
    const next_pages = Math.ceil((total_documents > to ? total_documents - to : 0) / size);

    res.status(200).send({ data: jobsLimit, page, size, previous_pages, next_pages, total_pages });
  } catch (error) {
    res.status(400).send({ data: null, error: formatError(error) });
  }
});

export const getInstanceQueue = async typeQueue => {
  switch (typeQueue) {
    case TYPE_QUEUE.agenda:
      return agenda;
    case TYPE_QUEUE.agenda_skim:
      return agendaSkim;
    case TYPE_QUEUE.agenda_holder:
      return agendaHolder;
    case TYPE_QUEUE.agenda_free_coin:
      return agendaFreeCoin;
    case TYPE_QUEUE.agenda_dex:
      return agendaDex;
  }
  return null;
};

export const getJobsByType = async ({ type_queue, type_job }) => {
  const queue = await getInstanceQueue(type_queue);
  if (!queue) return { jobs: [], status: false, error: `Type queue not found!` };
  switch (type_job) {
    case STATUS_JOB.running:
      return {
        jobs: await queue.jobs({
          lastRunAt: { $exists: true },
          $expr: {
            $gt: ['$lastRunAt', '$lastFinishedAt'],
          },
        }),
        status: true,
        error: null,
      };
    case STATUS_JOB.queued:
      return {
        jobs: await queue.jobs({
          $and: [
            { nextRunAt: { $exists: true } },
            { nextRunAt: { $lt: new Date() } },
            { $expr: { $gte: ['$nextRunAt', '$lastFinishedAt'] } },
          ],
        }),
        status: true,
        error: null,
      };
    case STATUS_JOB.failed:
      return {
        jobs: await queue.jobs({
          $and: [
            { lastFinishedAt: { $exists: true } },
            { failedAt: { $exists: true } },
            { $expr: { $eq: ['$lastFinishedAt', '$failedAt'] } },
          ],
        }),
        status: true,
        error: null,
      };
    case STATUS_JOB.scheduled:
      return {
        jobs: await queue.jobs({
          $and: [
            { nextRunAt: { $exists: true } },
            { $expr: { $gte: ['$nextRunAt', new Date()] } },
            {
              name: {
                $nin: [
                  NAME_JOB.auto.generate_templates_auto,
                  NAME_JOB.fake_transactions.repeat_scan_logs,
                  NAME_JOB.fake_actives.schedule_fake_actives_daily,
                  NAME_JOB.cache.backup_database,
                  NAME_JOB.cache.cache_balance_source_all,
                  NAME_JOB.cache.cache_kpi_server,
                ],
              },
            },
          ],
        }),
        status: true,
        error: null,
      };
  }
  return { jobs: [], status: false, error: `Type job not found!` };
};

export default router;
