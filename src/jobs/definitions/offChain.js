import { NAME_JOB } from '../../../utils/enum.js';
import { commonProcessOffChain } from '../services/offChain.js';

export const offChainDefinitions = agenda => {
  agenda.define(NAME_JOB.offChain.withdraw_token_utt, async (job, done) => {
    await commonProcessOffChain({ job, done });
  });
};
