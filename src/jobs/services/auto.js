import moment from 'moment';
import mongoose from 'mongoose';
import { NAME_JOB, TYPE_CHAIN_SUPPORT, TYPE_SCHEDULE } from '../../../utils/enum.js';
import { formatError } from '../../../utils/format.js';
import { FORMAT_DATE } from '../../../utils/time.js';
import { sendNoti } from '../../../utils/utils.js';
import ChainIdModel from '../../models/ChainId.js';
import { logs } from '../../models/Log.js';
import ScheduleExecuteAuto from '../../models/ScheduleExecuteAuto.js';
import { generateTemplateExecute } from '../../templates/generateTemplateExecute.js';
import agenda from '../agenda.js';
import ExecuteTemplateModel from '../../models/ExecuteTemplate.js';

export const autoGenerateExecuteTemplates = async ({ job }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  let agendaJobs = [];
  let listIdExecuteTemplate = [];
  let listChainId = [];
  let schedules = [];
  const date = moment().format(FORMAT_DATE);

  try {
    let chainIdSupport = await ChainIdModel.find({ type: TYPE_CHAIN_SUPPORT.paid_coin, is_active: true });
    chainIdSupport = chainIdSupport.map(info => info.chain_id);
    schedules = await ScheduleExecuteAuto.find({ date, chain_id: { $in: chainIdSupport } });
    if (schedules.length < chainIdSupport.length) {
      schedules = await ScheduleExecuteAuto.aggregate([
        { $match: { chain_id: { $in: chainIdSupport } } },
        { $sort: { date: -1 } },
        {
          $group: {
            _id: '$chain_id',
            data: { $first: '$$ROOT' },
          },
        },
        { $replaceRoot: { newRoot: '$data' } },
      ]);
    }

    for (let index = 0; index < schedules.length; index++) {
      let schedule = schedules[index];
      const scheduleId = schedule._id;
      delete schedule._id;
      if (schedule.date == date && schedule.is_scheduled) break;
      listChainId.push(schedule.chain_id);
      let result = await generateTemplateExecute({
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
      listIdExecuteTemplate = listIdExecuteTemplate.concat(result.listIdExecuteTemplate);

      let conditions = { chain_id: schedule.chain_id, date: date };

      let options = { upsert: true, new: true, setDefaultsOnInsert: true, session };

      if (result.status) await ScheduleExecuteAuto.findOneAndUpdate(conditions, { is_scheduled: true }, options);

      if (!result.status) throw result.error;
    }

    await session.commitTransaction();

    if (listChainId.length > 0)
      await logs({
        job_id: job.attrs._id,
        chain_id: listChainId?.toString(),
        type: NAME_JOB.auto.generate_templates_auto,
        schedule_id: schedules.map(schedule => schedule._id)?.toString(),
        type_schedule: TYPE_SCHEDULE.auto,
        status: true,
        date,
        descriptions: `${NAME_JOB.auto.generate_templates_auto} [date: ${date}] - [chainIds: ${listChainId}] successfully `,
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
    await sendNoti(`[BOT_TOOL]: N0301 - Trading Volume failed for date ${date}`);
    await logs({
      job_id: job.attrs._id,
      chain_id: listChainId?.toString(),
      type: NAME_JOB.auto.generate_templates_auto,
      schedule_id: schedules.map(schedule => schedule._id)?.toString(),
      type_schedule: TYPE_SCHEDULE.auto,
      status: false,
      error: formatError(error),
      date,
      descriptions: `${NAME_JOB.auto.generate_templates_auto} date ${date} fail `,
    });

    return {
      status: false,
      error,
    };
  }
};
