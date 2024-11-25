import moment from 'moment';
import { NAME_JOB } from '../../../../utils/enum.js';
import { formatError } from '../../../../utils/format.js';
import { randomDatetimesFromRange } from '../../../../utils/random.js';
import { getWalletSkimByIndexOffChain } from '../../../handlers/common.js';
import ExecuteFakeActivesModel from '../../../models/ExecuteFakeActives.js';
import { executeFakeActives } from '../services/executeFakeActives.js';
import {
  autoCheckScheduleSkim,
  scheduleFakeActives,
  scheduleFakeActivesDaily,
  scheduleFakeActivesManual,
} from '../services/scheduleFakeActives.js';
import agendaSkim from '../agendaSkim.js';

export const fakeActivesDefinitions = agenda => {
  agenda.define(NAME_JOB.fake_actives.schedule_fake_actives_daily, async (job, done) => {
    return await scheduleFakeActivesDailyCommon(job, done);
  });

  agenda.define(NAME_JOB.fake_actives.schedule_fake_actives_daily_free_coin, async (job, done) => {
    return await scheduleFakeActivesDailyCommon(job, done);
  });

  agenda.define(NAME_JOB.fake_actives.schedule_fake_actives_manual, async (job, done) => {
    const { id_execute } = job.attrs.data;
    let { status, error } = await scheduleFakeActivesManual({ id_execute });
    if (status) {
      await done();
      await job.setShouldSaveResult(true);
    } else {
      job.fail(formatError(error));
    }
    await job.save();
  });

  agenda.define(NAME_JOB.fake_actives.execute_fake_actives, async (job, done) => {
    return await executeFakeActivesCommon(job, done);
  });

  agenda.define(NAME_JOB.fake_actives.execute_fake_actives_free_coin, async (job, done) => {
    return await executeFakeActivesCommon(job, done);
  });

  agenda.define(NAME_JOB.fake_actives.schedule_fake_actives, async (job, done) => {
    let jobs = await agendaSkim.jobs({ ...job.attrs.data });
    if (jobs.length > 0) return await job.remove();

    let { status, error } = await scheduleFakeActives({ ...job.attrs.data });
    if (status) {
      await done();
      await job.setShouldSaveResult(true);
    } else {
      if (!job?.attrs?.failCount || job?.attrs?.failCount < 5)
        job.attrs.nextRunAt = moment(
          randomDatetimesFromRange(moment().add(5, 'seconds'), moment().add(20, 'seconds'), 1)[0],
        );
      job.fail(formatError(error));
      await job.save();
    }
    await job.save();
  });

  agenda.define(NAME_JOB.fake_actives.auto_check_shedule_fake_actives, async (job, done) => {
    let { status, error } = await autoCheckScheduleSkim();
    if (status) {
      await done();
      job.setShouldSaveResult(true);
    } else {
      job.fail(formatError(error));
    }
    await job.save();
  });
};

export const scheduleFakeActivesDailyCommon = async (job, done) => {
  const { chainId } = job.attrs.data;
  let { status, error } = await scheduleFakeActivesDaily({ chainId });
  if (status) {
    await done();
    await job.setShouldSaveResult(true);
  } else {
    job.fail(formatError(error));
  }
  await job.save();
};

export const executeFakeActivesCommon = async (job, done) => {
  const { index, id_execute } = job.attrs.data;
  const wallet = getWalletSkimByIndexOffChain({ indexWallet: index });
  let { status, error } = await executeFakeActives({ job });
  if (status) {
    const infoExecute = await ExecuteFakeActivesModel.findById(id_execute);
    await ExecuteFakeActivesModel.findByIdAndUpdate(id_execute, {
      index_completed_recent: index,
      address_completed_recent: wallet.address,
      count_completed: infoExecute.count_completed + 1,
    });
    await job.setShouldSaveResult(true);
    await job.save();
    await done();
  } else {
    if (!job?.attrs?.failCount || job?.attrs?.failCount < 10)
      job.attrs.nextRunAt = moment(
        randomDatetimesFromRange(moment().add(5, 'minutes'), moment().add(10, 'minutes'), 1)[0],
      );
    else await job.disable();
    job.fail(formatError(error));
    await job.save();
  }
  return { status, error };
};
