/* eslint-disable no-undef */
import { getMapToken } from '../../../configs/addresses.js';
import { connectMongoDB } from '../../../database/conection.js';
import ERC20 from '../../../modules/wallet/transfer/ERC20.js';
import { NAME_JOB, SYMBOL_TOKEN, TYPE_WALLET } from '../../../utils/enum.js';
import { formatFloorNearest, weiToEther } from '../../../utils/format.js';
import { hasDecimal } from '../../../utils/number.js';
import { sleep } from '../../../utils/utils.js';
import agendaDex from '../../dex/agendaDex.js';
import {
  getCurrentIndexWalletSource,
  getWalletByIndexOffChain,
  getWalletSourceByIndexOffChain,
} from '../../handlers/common.js';
import ExecuteDexModel from '../../models/ExecuteDex.js';
import WalletSkimModel from '../../models/WalletSkim.js';

const main = async () => {
  connectMongoDB();
  await sleep(1000);
  const chainId = '56';
  const regex = /is insufficient to swap sender/;
  const infoTokenLcr = getMapToken(chainId, SYMBOL_TOKEN.LCR);
  if (!infoTokenLcr) throw { error: `Token ${SYMBOL_TOKEN.LCR} not supported` };
  const infoTokenUsdt = getMapToken(chainId, SYMBOL_TOKEN.USDT);
  if (!infoTokenUsdt) throw { error: `Token ${SYMBOL_TOKEN.USDT} not supported` };
  let usdt = new ERC20({ chainId, token: infoTokenUsdt.address });
  let lcr = new ERC20({ chainId, token: infoTokenLcr.address });

  let jobsFailed = await agendaDex.jobs({
    $and: [
      // Failed
      { lastFinishedAt: { $exists: true } },
      { failedAt: { $exists: true } },
      { $expr: { $eq: ['$lastFinishedAt', '$failedAt'] } },
      {
        name: {
          $in: [
            NAME_JOB.dex.swap_token_to_token_our_dex,
            NAME_JOB.dex.transfer_token_from_source,
            NAME_JOB.dex.schedule_execute_jobs,
          ],
        },
      },
    ],
  });

  for (let idx = 0; idx < jobsFailed.length; idx++) {
    let job = jobsFailed[idx];
    const { symbol_token_in, symbol_token_out, address_wallet_in, execute_id, index, index_wallet_in } = job.attrs.data;
    const amount = parseFloat(job.attrs.data.amount);
    if (job?.attrs?.name == NAME_JOB.dex.schedule_execute_jobs) {
      const schedule_jobs = await agendaDex.jobs({
        'name': NAME_JOB.dex.schedule_execute_jobs,
        'data.execute_id': execute_id,
      });
      if (schedule_jobs.length > 0) await schedule_jobs[0].run();
      continue;
    }
    if ((!amount || Number.isNaN(amount)) && (index == 8 || index == 0)) {
      await job.remove();
      const schedule_jobs = await agendaDex.jobs({
        'name': NAME_JOB.dex.schedule_execute_jobs,
        'data.execute_id': execute_id,
      });
      if (schedule_jobs.length > 0) await schedule_jobs[0].run();
      continue;
    }
    if (hasDecimal(amount) > 5) {
      const execute = await ExecuteDexModel.findById(execute_id);
      for (let i = 0; i < execute.jobs.length; i++) {
        const j = execute.jobs[i];
        if (hasDecimal(j.amount) > 5) {
          if (j.job_id) {
            let jobQueue = await agendaDex.jobs({ _id: j.job_id });
            if (jobQueue.length > 0) {
              const numFormated = formatFloorNearest(j.amount);
              jobQueue[0].attrs.data.amount = numFormated;
              await jobQueue[0].save();
              await execute.updateOne({ $set: { [`jobs.${i}.amount`]: formatFloorNearest(j.amount) } });
            }
          } else {
            await execute.updateOne({ $set: { [`jobs.${i}.amount`]: formatFloorNearest(j.amount) } });
          }
        }
      }
      continue;
    }
    if (regex.test(job?.attrs?.failReason?.toString())) {
      const balanceOnChainUSDT = formatFloorNearest(weiToEther(await usdt.balanceOf({ address: address_wallet_in })));
      const balanceOnChainLCR = formatFloorNearest(weiToEther(await lcr.balanceOf({ address: address_wallet_in })));
      const wallet_skim = await WalletSkimModel.findOne({
        chain_id: chainId,
        address: { $regex: new RegExp('^' + address_wallet_in.toLowerCase(), 'i') },
      });
      const holdingAmount = parseFloat(wallet_skim?.holding_amount) || 0;
      const availableLCR = formatFloorNearest(balanceOnChainLCR - holdingAmount);

      const indexSourceWallet = await getCurrentIndexWalletSource({ chainId });
      const sourceWallet = getWalletSourceByIndexOffChain({ indexWallet: indexSourceWallet });
      const wallet = getWalletByIndexOffChain({ indexWallet: index_wallet_in });

      if (
        symbol_token_in == SYMBOL_TOKEN.LCR &&
        symbol_token_out == SYMBOL_TOKEN.USDT &&
        amount > availableLCR &&
        amount < balanceOnChainUSDT
      ) {
        let txSendToLCR = await lcr.transfer({
          privateKey: sourceWallet.privateKey,
          receiver: wallet.address,
          amount,
          typeWallet: TYPE_WALLET.source_dex,
        });
        console.log(
          ` -> Transfer ${amount} LCR From Source ${indexSourceWallet} to Bot index ${wallet_skim.index}: ${txSendToLCR.data.txHash}`,
        );

        let txSendBackUSDT = await usdt.transfer({
          privateKey: wallet.privateKey,
          receiver: sourceWallet.address,
          amount,
          typeWallet: TYPE_WALLET.dex,
        });
        console.log(
          ` -> Transfer ${amount} USDT From index ${wallet_skim.index} to Source ${indexSourceWallet}: ${txSendBackUSDT.data.txHash}`,
        );

        await job.run();
      } else if (
        symbol_token_in == SYMBOL_TOKEN.USDT &&
        symbol_token_out == SYMBOL_TOKEN.LCR &&
        amount < availableLCR &&
        amount > balanceOnChainUSDT
      ) {
        let txSendToUSDT = await usdt.transfer({
          privateKey: sourceWallet.privateKey,
          receiver: wallet.address,
          amount,
          typeWallet: TYPE_WALLET.source_dex,
        });
        console.log(
          ` -> Transfer ${amount} USDT From Source ${indexSourceWallet} to Bot index ${wallet_skim.index}: ${txSendToUSDT.data.txHash}`,
        );

        let txSendBackLCR = await lcr.transfer({
          privateKey: wallet.privateKey,
          receiver: sourceWallet.address,
          amount,
          typeWallet: TYPE_WALLET.dex,
        });
        console.log(
          ` -> Transfer ${amount} LCR From index ${wallet_skim.index} to Source ${indexSourceWallet}: ${txSendBackLCR.data.txHash}`,
        );

        await job.run();
      } else {
        await job.run();
      }
      continue;
    }
  }
  console.log('Done');
  return process.exit(0);
};
main();
