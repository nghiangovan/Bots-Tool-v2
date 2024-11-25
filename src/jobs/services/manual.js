import mongoose from 'mongoose';
import { NAME_JOB, TYPE_SCHEDULE } from '../../../utils/enum.js';
import { formatError } from '../../../utils/format.js';
import { sendNoti } from '../../../utils/utils.js';
import { logs } from '../../models/Log.js';
import ScheduleExecuteManualModel from '../../models/ScheduleTemplateManual.js';
import { generateTemplateExecute } from '../../templates/generateTemplateExecute.js';
import agenda from '../agenda.js';
import ExecuteTemplateModel from '../../models/ExecuteTemplate.js';

export const manualGenerateExecuteTemplates = async ({ job }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  let agendaJobs = [];
  let listIdExecuteTemplate = [];
  const { schedule_id, chain_id, date, kpi_uaw, kpi_volume, number_new_wallets } = job.attrs.data;

  try {
    let result = await generateTemplateExecute({
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
    listIdExecuteTemplate = result.listIdExecuteTemplate;

    let options = { upsert: true, new: true, setDefaultsOnInsert: true, session };

    if (result.status) await ScheduleExecuteManualModel.findByIdAndUpdate(schedule_id, { is_scheduled: true }, options);

    if (!result.status) throw result.error;

    await session.commitTransaction();

    await logs({
      job_id: job.attrs._id,
      chain_id,
      type: NAME_JOB.manual.generate_templates_manual,
      schedule_id,
      type_schedule: TYPE_SCHEDULE.manual,
      status: true,
      date,
      descriptions: `${NAME_JOB.manual.generate_templates_manual} [date: ${date}] - [chainId: ${chain_id}] - schedule id [${schedule_id}] successfully `,
    });

    return {
      status: true,
      error: null,
    };
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();
    await agenda.cancel({ _id: { $in: agendaJobs } });
    await ExecuteTemplateModel.deleteMany({ _id: { $in: listIdExecuteTemplate } });
    await sendNoti(
      `[BOT_TOOL]: N0301 - Trading Volume failed for date ${date} - [chainId: ${chain_id}] - schedule id [${schedule_id}]`,
    );
    await logs({
      job_id: job.attrs._id,
      chain_id,
      type: NAME_JOB.manual.generate_templates_manual,
      schedule_id,
      type_schedule: TYPE_SCHEDULE.manual,
      status: false,
      error: formatError(error),
      date,
      descriptions: `${NAME_JOB.manual.generate_templates_manual} date ${date} fail - schedule id [${schedule_id}]`,
    });

    return {
      status: false,
      error,
    };
  }
};
