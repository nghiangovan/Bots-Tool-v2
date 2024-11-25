import moment from 'moment';
import mongoose from 'mongoose';
import { NAME_JOB, TYPE_CHAIN_SUPPORT, TYPE_SCHEDULE } from '../../../utils/enum.js';
import { formatError } from '../../../utils/format.js';
import { FORMAT_DATE } from '../../../utils/time.js';
import { sendNoti } from '../../../utils/utils.js';
import ChainIdModel from '../../models/ChainId.js';
import { logs } from '../../models/Log.js';
import ScheduleDexModel from '../../models/ScheduleDex.js';
import { generateExecuteDex } from '../../templates/generateDex.js';
import agendaDex from '../agendaDex.js';
import ExecuteDexModel from '../../models/ExecuteDex.js';

export const generateExecuteDexDaily = async ({ job }) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  let listIdExecute = [];
  let agendaJobs = [];
  let listChainId = [];
  let schedules = [];
  const date = moment().format(FORMAT_DATE);

  try {
    let chainIdSupport = await ChainIdModel.find({ type: TYPE_CHAIN_SUPPORT.paid_coin, is_active: true });
    chainIdSupport = chainIdSupport.map(info => info.chain_id);
    schedules = await ScheduleDexModel.find({ date, chain_id: { $in: chainIdSupport } });

    for (let index = 0; index < schedules.length; index++) {
      let schedule = schedules[index];
      const scheduleId = schedule._id;
      delete schedule._id;
      if (schedule.date == date && schedule.is_scheduled) break;
      listChainId.push(schedule.chain_id);
      let result = await generateExecuteDex({
        chainId: schedule.chain_id,
        scheduleId,
        isRepeat: true,
        kpiUAW: schedule.kpi_uaw,
        kpiVolume: parseFloat(schedule.kpi_volume),
        numberNewWallets: schedule.number_new_wallets,
        date,
        session,
      });

      agendaJobs = agendaJobs.concat(result.agendaJobs);
      listIdExecute = listIdExecute.concat(result.listIdExecute);

      if (result.status) await schedule.updateOne({ is_scheduled: true }, { session });

      if (!result.status) throw result.error;
    }

    await session.commitTransaction();

    if (listChainId.length > 0)
      await logs({
        job_id: job.attrs._id,
        chain_id: listChainId?.toString(),
        type: NAME_JOB.dex.schedule_dex_auto_daily,
        schedule_id: schedules.map(schedule => schedule._id)?.toString(),
        type_schedule: TYPE_SCHEDULE.auto,
        status: true,
        date,
        descriptions: `${NAME_JOB.dex.schedule_dex_auto_daily} [date: ${date}] - [chainIds: ${listChainId}] successfully `,
      });

    return {
      status: true,
      error: null,
    };
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();
    await agendaDex.cancel({ _id: { $in: agendaJobs } });
    await ExecuteDexModel.deleteMany({ _id: { $in: listIdExecute } });
    await sendNoti(`[BOT_TOOL]: N0304 - Generate Executes Dex Failed For Date ${date}`);
    await logs({
      job_id: job.attrs._id,
      chain_id: listChainId?.toString(),
      type: NAME_JOB.dex.schedule_dex_auto_daily,
      schedule_id: schedules.map(schedule => schedule._id)?.toString(),
      type_schedule: TYPE_SCHEDULE.auto,
      status: false,
      error: formatError(error),
      date,
      descriptions: `${NAME_JOB.dex.schedule_dex_auto_daily} date ${date} fail `,
    });

    return {
      status: false,
      error,
    };
  }
};

export const generateExecuteDexManual = async ({ job }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  let agendaJobs = [];
  const { schedule_id, chain_id, date, kpi_uaw, kpi_volume, number_new_wallets } = job.attrs.data;

  try {
    let result = await generateExecuteDex({
      chainId: chain_id,
      scheduleId: schedule_id,
      isRepeat: false,
      kpiUAW: kpi_uaw,
      kpiVolume: parseFloat(kpi_volume),
      numberNewWallets: parseInt(number_new_wallets),
      date,
      session,
    });

    agendaJobs = result.agendaJobs;

    if (result.status) await ScheduleDexModel.findByIdAndUpdate(schedule_id, { is_scheduled: true }, { session });

    if (!result.status) throw result.error;

    await session.commitTransaction();

    await logs({
      job_id: job.attrs._id,
      chain_id,
      type: NAME_JOB.dex.schedule_dex_manual,
      schedule_id,
      type_schedule: TYPE_SCHEDULE.manual,
      status: true,
      date,
      descriptions: `${NAME_JOB.dex.schedule_dex_manual} [date: ${date}] - [chainId: ${chain_id}] - schedule id [${schedule_id}] successfully `,
    });

    return {
      status: true,
      error: null,
    };
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();
    await agendaDex.cancel({ _id: { $in: agendaJobs } });
    await sendNoti(
      `[BOT_TOOL]: N0304 - Generate Executes Dex Failed For Date ${date} - [chainId: ${chain_id}] - schedule id [${schedule_id}]`,
    );
    await logs({
      job_id: job.attrs._id,
      chain_id,
      type: NAME_JOB.dex.schedule_dex_manual,
      schedule_id,
      type_schedule: TYPE_SCHEDULE.manual,
      status: false,
      error: formatError(error),
      date,
      descriptions: `${NAME_JOB.dex.schedule_dex_manual} date ${date} fail - schedule id [${schedule_id}]`,
    });

    return {
      status: false,
      error,
    };
  }
};
