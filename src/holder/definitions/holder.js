import moment from 'moment';
import { NAME_JOB } from '../../../utils/enum.js';
import { formatError } from '../../../utils/format.js';
import { getWalletByIndexOffChain } from '../../handlers/common.js';
import ExecuteFakeHoldersModel from '../../models/ExecuteFakeHolders.js';
import { depositReduceHolders, withdrawIncreaseHolders } from '../services/executeFakeHolders.js';
import { scheduleFakeHolders, scheduleFakeHoldersDaily } from '../services/scheduleFakeHolders.js';
import { randomDatetimesFromRange } from '../../../utils/random.js';

export const holderDefinitions = agenda => {
  agenda.define(NAME_JOB.holder.schedule_fake_holders_daily, async (job, done) => {
    return await scheduleFakeHoldersDailyCommon(job, done);
  });

  agenda.define(NAME_JOB.holder.schedule_fake_holders_daily_free_coin, async (job, done) => {
    return await scheduleFakeHoldersDailyCommon(job, done);
  });

  agenda.define(NAME_JOB.holder.schedule_fake_holders, async (job, done) => {
    const { id_execute } = job.attrs.data;
    let { status, error } = await scheduleFakeHolders({ id_execute });
    if (status) {
      await done();
      await job.setShouldSaveResult(true);
    } else {
      job.fail(formatError(error));
    }
    await job.save();
  });

  agenda.define(NAME_JOB.holder.withdraw_increase_holders, async (job, done) => {
    let { status, error } = await withdrawIncreaseHolders({ job });
    return await postprocessJob({ job, status, error, done });
  });

  agenda.define(NAME_JOB.holder.deposit_reduce_holders, async (job, done) => {
    let { status, error } = await depositReduceHolders({ job });
    return await postprocessJob({ job, status, error, done });
  });
};

export const postprocessJob = async ({ job, status, error, done }) => {
  const { index, id_execute } = job.attrs.data;
  const wallet = getWalletByIndexOffChain({ indexWallet: index });
  if (status) {
    const infoExecute = await ExecuteFakeHoldersModel.findById(id_execute);
    await ExecuteFakeHoldersModel.findByIdAndUpdate(id_execute, {
      index_completed_recent: index,
      address_completed_recent: wallet.address,
      count_completed: infoExecute.count_completed + 1,
    });
    await job.setShouldSaveResult(true);
    await job.save();
    await done();
  } else {
    if (!job?.attrs?.failCount || job?.attrs?.failCount < 5)
      job.attrs.nextRunAt = moment(
        randomDatetimesFromRange(moment().add(5, 'minutes'), moment().add(10, 'minutes'), 1)[0],
      );
    job.fail(formatError(error));
    await job.save();
  }
  return { status, error };
};

export const scheduleFakeHoldersDailyCommon = async (job, done) => {
  const { chainId } = job.attrs.data;
  let { status, error } = await scheduleFakeHoldersDaily({ chainId });
  if (status) {
    await done();
    await job.setShouldSaveResult(true);
  } else {
    job.fail(formatError(error));
  }
  await job.save();
};
