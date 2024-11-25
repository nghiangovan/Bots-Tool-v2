import { NAME_JOB } from '../../../utils/enum.js';
import { commonProcessOnChain } from '../services/onChain.js';

export const onChainDefinitions = agenda => {
  agenda.define(NAME_JOB.onChain.transfer_native_from_source, async (job, done) => {
    await commonProcessOnChain({ queue: agenda, job, done });
  });

  agenda.define(NAME_JOB.onChain.transfer_token_from_source, async (job, done) => {
    await commonProcessOnChain({ queue: agenda, job, done });
  });

  agenda.define(NAME_JOB.onChain.transfer_on_chain_native, async (job, done) => {
    await commonProcessOnChain({ queue: agenda, job, done });
  });

  agenda.define(NAME_JOB.onChain.transfer_on_chain_token, async (job, done) => {
    await commonProcessOnChain({ queue: agenda, job, done });
  });

  agenda.define(NAME_JOB.onChain.deposit_token_utt_to_spending, async (job, done) => {
    await commonProcessOnChain({ queue: agenda, job, done });
  });

  agenda.define(NAME_JOB.onChain.swap_native_to_token_pancake, async (job, done) => {
    await commonProcessOnChain({ queue: agenda, job, done });
  });

  agenda.define(NAME_JOB.onChain.swap_token_to_native_pancake, async (job, done) => {
    await commonProcessOnChain({ queue: agenda, job, done });
  });

  agenda.define(NAME_JOB.onChain.swap_token_to_token_our_dex, async (job, done) => {
    await commonProcessOnChain({ queue: agenda, job, done });
  });
};
