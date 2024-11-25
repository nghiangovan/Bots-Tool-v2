import { NAME_JOB } from '../../../utils/enum.js';
import { formatError } from '../../../utils/format.js';
import {
  autoGenerateExecuteTemplatesFreeCoin,
  commonProcessOnChainFreeCoin,
  manualGenerateExecuteTemplatesFreeCoin,
} from '../services/freeCoin.js';

export const freeCoinDefinitions = agendaFreeCoin => {
  agendaFreeCoin.define(NAME_JOB.manual.generate_templates_free_coin_manual, async (job, done) => {
    let { status, error } = await manualGenerateExecuteTemplatesFreeCoin({ job });
    if (status) {
      await done();
      job.setShouldSaveResult(true);
    } else {
      job.fail(formatError(error));
    }
    await job.save();
  });

  agendaFreeCoin.define(NAME_JOB.auto.generate_templates_free_coin_auto, async (job, done) => {
    let { status, error } = await autoGenerateExecuteTemplatesFreeCoin({ job });
    if (status) {
      await done();
      await job.setShouldSaveResult(true);
    } else {
      job.fail(formatError(error));
    }
    await job.save();
  });

  agendaFreeCoin.define(NAME_JOB.free_coin.transfer_native_from_spending, async (job, done) => {
    await commonProcessOnChainFreeCoin({ queue: agendaFreeCoin, job, done });
  });

  agendaFreeCoin.define(NAME_JOB.free_coin.transfer_token_from_spending, async (job, done) => {
    await commonProcessOnChainFreeCoin({ queue: agendaFreeCoin, job, done });
  });

  agendaFreeCoin.define(NAME_JOB.free_coin.transfer_native_from_source, async (job, done) => {
    await commonProcessOnChainFreeCoin({ queue: agendaFreeCoin, job, done });
  });

  agendaFreeCoin.define(NAME_JOB.free_coin.transfer_token_from_source, async (job, done) => {
    await commonProcessOnChainFreeCoin({ queue: agendaFreeCoin, job, done });
  });

  agendaFreeCoin.define(NAME_JOB.free_coin.transfer_on_chain_native, async (job, done) => {
    await commonProcessOnChainFreeCoin({ queue: agendaFreeCoin, job, done });
  });

  agendaFreeCoin.define(NAME_JOB.free_coin.transfer_on_chain_token, async (job, done) => {
    await commonProcessOnChainFreeCoin({ queue: agendaFreeCoin, job, done });
  });

  agendaFreeCoin.define(NAME_JOB.free_coin.swap_token_to_token_our_dex, async (job, done) => {
    await commonProcessOnChainFreeCoin({ queue: agendaFreeCoin, job, done });
  });

  agendaFreeCoin.define(NAME_JOB.free_coin.deposit_token_free_to_spending, async (job, done) => {
    await commonProcessOnChainFreeCoin({ queue: agendaFreeCoin, job, done });
  });

  agendaFreeCoin.define(NAME_JOB.free_coin.spending_swap_token_to_token_our_dex, async (job, done) => {
    await commonProcessOnChainFreeCoin({ queue: agendaFreeCoin, job, done });
  });

  agendaFreeCoin.define(NAME_JOB.free_coin.withdraw_free_coin, async (job, done) => {
    await commonProcessOnChainFreeCoin({ queue: agendaFreeCoin, job, done });
  });
};
