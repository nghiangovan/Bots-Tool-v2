import { rescheduleFailedJob, scheduleNextJob } from './index.js';
import { NAME_JOB } from '../../../utils/enum.js';
import { formatError } from '../../../utils/format.js';
import { getWalletByIndex, processingWithdrawTokenUtt } from '../../handlers/common.js';
import { logs } from '../../models/Log.js';
import { FEE_WITHDRAW_TOKEN } from '../../../utils/constant.js';
import { maxNumberDecimal } from '../../handlers/functions.js';

export const withdrawTokenUtt = async ({ chainId, indexWalletReceiver, amount, idExecuteTemplate, jobiIndex }) => {
  const walletReceiver = await getWalletByIndex({ chainId, indexWallet: indexWalletReceiver });
  try {
    await processingWithdrawTokenUtt({
      chainId,
      addressReceiver: walletReceiver.address,
      amount,
      idExecuteTemplate,
      jobiIndex,
    });
    return {
      status: true,
      amountIn: amount,
      amountOut: amount,
      error: null,
      addressSender: null,
      addressReceiver: walletReceiver.address,
    };
  } catch (error) {
    console.log(error);
    return {
      status: false,
      amountIn: amount,
      amountOut: amount,
      error,
      addressSender: null,
      addressReceiver: walletReceiver.address,
    };
  }
};

export const commonProcessOffChain = async ({ job, done }) => {
  const { chain_id, index_wallet_out, symbol_token_in, amount, job_index, id_execute_template } = job.attrs.data;

  let respone = null;
  let descriptions = null;
  let type = null;
  let index_wallet_1 = null;
  let index_wallet_2 = null;
  let token_in = null;
  let token_out = null;
  let amount_fee = null;

  switch (job.attrs.name) {
    case NAME_JOB.offChain.withdraw_token_utt:
      respone = await withdrawTokenUtt({
        chainId: chain_id,
        indexWalletReceiver: index_wallet_out,
        amount,
        idExecuteTemplate: id_execute_template,
        jobiIndex: job_index,
      });

      type = NAME_JOB.offChain.withdraw_token_utt;
      index_wallet_2 = index_wallet_out;
      token_in = symbol_token_in;
      token_out = symbol_token_in;
      amount_fee = FEE_WITHDRAW_TOKEN;
      descriptions = `${job.attrs.name} ${amount} ${symbol_token_in} to ${respone.addressReceiver}[${index_wallet_out}]`;
      break;

    default:
      throw { error: 'Not find define name' };
  }

  let { status, error, addressSender, addressReceiver, amountOut } = respone;

  if (status) {
    await done();
    job.attrs.data.amountOut = parseFloat(maxNumberDecimal(amountOut));
    await job.setShouldSaveResult(true);
    await job.save();
    await scheduleNextJob({ job, amountOut });
  } else {
    job.fail(formatError(error));
    await job.save();
    await rescheduleFailedJob({ job, error: formatError(error) });
  }

  await logs({
    chain_id,
    type: type,
    status,
    wallet_address_1: addressSender,
    wallet_address_2: addressReceiver,
    index_wallet_1,
    index_wallet_2,
    amount,
    token_in,
    token_out,
    amount_fee,
    job_id: job.attrs._id,
    job_index,
    id_execute_template,
    descriptions,
    error: error && formatError(error),
  });
};
