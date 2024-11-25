import { NAME_JOB } from '../../utils/enum.js';

export const rescanJobQueue = async ({ queue }) => {
  await rescanJobQueueNotRunning({ queue });
  await rescanJobRunningLong({ queue });
  await rescanJobQueueFailed({ queue });
};

export const rescanJobQueueSkim = async ({ queue }) => {
  await rescanJobQueueNotRunning({ queue });
  await rescanJobRunningLong({ queue });
  await rescanJobQueueFailCount10({ queue });
};

export const rescanJobQueueNotRemoveFail = async ({ queue }) => {
  await rescanJobQueueNotRunning({ queue });
  await rescanJobRunningLong({ queue });
};

export const rescanJobQueueNotRunning = async ({ queue }) => {
  setInterval(async () => {
    // Jobs QUEUED not RUNNING
    let jobsQueued = await queue.jobs({
      $and: [
        { nextRunAt: { $exists: true } },
        { nextRunAt: { $lt: new Date() } },
        { $expr: { $gte: ['$nextRunAt', '$lastFinishedAt'] } },
        { $expr: { $gte: ['$lastFinishedAt', '$lastRunAt'] } },
      ],
    });
    if (jobsQueued.length > 0)
      await Promise.all(
        jobsQueued.map(async item => {
          let job = (await queue.jobs({ _id: item.attrs._id }))?.at(0);
          !job.isRunning() && (await job.run());
        }),
      );
  }, 60000); // repeat every 1 minute
};

export const rescanJobRunningLong = async ({ queue }) => {
  setInterval(async () => {
    // Jobs RUNNING too long
    let jobsRunningTooLong = await queue.jobs({
      $and: [
        {
          'attrs.name': {
            $nin: [
              NAME_JOB.fake_actives.schedule_fake_actives_daily,
              NAME_JOB.fake_actives.schedule_fake_actives_daily_free_coin,
            ],
          },
        },
        { lastRunAt: { $exists: true } },
        { $expr: { $gt: ['$lastRunAt', '$lastFinishedAt'] } },
        { $expr: { $lt: ['$lastRunAt', new Date(new Date() - 15 * 60 * 1000)] } },
        { $expr: { $lt: ['$lockedAt', new Date(new Date() - 15 * 60 * 1000)] } },
      ],
    });
    if (jobsRunningTooLong.length > 0) await Promise.all(jobsRunningTooLong.map(async job => await job.run()));
  }, 120000); // repeat every 2 minutes
};

export const rescanJobQueueFailed = async ({ queue }) => {
  setInterval(async () => {
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
  }, 60000); // repeat every 1 minute
};

export const rescanJobQueueFailCount10 = async ({ queue }) => {
  setInterval(async () => {
    // Remove jobs FAILED have Fail Count greater than 10
    let jobsFailed = await queue.jobs({
      $and: [
        { lastFinishedAt: { $exists: true } },
        { failedAt: { $exists: true } },
        { $expr: { $eq: ['$lastFinishedAt', '$failedAt'] } },
      ],
    });
    if (jobsFailed.length > 0)
      await Promise.all(jobsFailed.map(async item => item.attrs.failCount > 10 && (await item.remove())));
  }, 60000); // repeat every 1 minute
};
