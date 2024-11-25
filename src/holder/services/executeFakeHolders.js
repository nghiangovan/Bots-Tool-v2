import axios from 'axios';
import { ethers } from 'ethers';
import { ABIS } from '../../../configs/ABIs.js';
import { SPENDING_WALLET_PAID_COIN, getMapToken } from '../../../configs/addresses.js';
import ERC20 from '../../../modules/wallet/transfer/ERC20.js';
import {
  AMOUNT_HOLDER,
  CHAIN_ID_ADMIN_API_URL,
  CHAIN_ID_ADMIN_TOKEN,
  CHAIN_ID_API_URL,
  CHAIN_ID_BOT_TOKEN,
  SLACK_JAY,
} from '../../../utils/constant.js';
import { SYMBOL_TOKEN } from '../../../utils/enum.js';
import { weiToEther } from '../../../utils/format.js';
import { sendNotiBackendTeam } from '../../../utils/utils.js';
import {
  awaitTransaction,
  buffNativeHaveCheckMinBalance,
  getGasPriceDynamic,
  getWalletByIndex,
  getWalletByIndexOffChain,
} from '../../handlers/common.js';
import { deployments, getStatusAsyncJob, getStatusJobId } from '../../handlers/functions.js';
import { logs } from '../../models/Log.js';
import WalletSkimModel from '../../models/WalletSkim.js';

export const withdrawIncreaseHolders = async ({ job }) => {
  try {
    const { date, chain_id, index, id_execute, async_job_id_game } = job.attrs.data;

    const symbolToken = SYMBOL_TOKEN.LCR;
    const wallet = getWalletByIndexOffChain({ indexWallet: index });

    const apiUrl = CHAIN_ID_API_URL[chain_id];
    if (!apiUrl) throw { error: 'Info apiUrl not found' };
    const adminApiUrl = CHAIN_ID_ADMIN_API_URL[chain_id];
    if (!adminApiUrl) throw { error: 'Info Admin API URL not found' };
    const tokenAdmin = CHAIN_ID_ADMIN_TOKEN[chain_id];
    if (!tokenAdmin) throw { error: `Admin Token not found` };
    const token = CHAIN_ID_BOT_TOKEN[chain_id];
    if (!token) throw { error: `Admin Token not found` };

    const randomAmount = AMOUNT_HOLDER.min;

    let asyncJobIdGame = async_job_id_game;

    if (asyncJobIdGame) {
      const res = await getStatusJobId({ token: tokenAdmin, jobId: asyncJobIdGame, apiUrl });
      if (res?.data?.status === 'failure') asyncJobIdGame = null;
    }

    if (!asyncJobIdGame) {
      const data = {
        wallet_address: wallet.address,
        amount: randomAmount,
      };

      const response = await axios.post(`${adminApiUrl}/v2/bots/withdraw_holder`, data, {
        headers: {
          Authorization: `Bearer ${tokenAdmin}`,
        },
      });

      if (response?.errors) return { status: false, error: JSON.stringify(response.errors) };
      asyncJobIdGame = response.data.data.async_job_id;
      job.attrs.data.async_job_id_game = asyncJobIdGame;
      await job.save();
    }

    const status_async_job = await getStatusAsyncJob({ token: token, async_job_id: asyncJobIdGame, apiUrl });
    if (status_async_job.status) {
      let walletModel = await WalletSkimModel.findOne({ chain_id, index });
      if (walletModel) {
        const holdingAmountOld = walletModel?.holding_amount ? parseFloat(walletModel.holding_amount) : 0;
        let resultUpdate = await walletModel.updateOne({ holding_amount: holdingAmountOld + randomAmount });
        if (!resultUpdate) throw { error: 'Update Holding Amount DB Fail!' };
      } else {
        let resultUpdate = await WalletSkimModel.create({
          chain_id,
          index,
          address: wallet.address,
          holding_amount: randomAmount,
        });
        if (!resultUpdate) throw { error: 'Update Holding Amount DB Fail!' };
      }

      const descriptions = `${job.attrs.name} ${randomAmount} ${symbolToken} to ${wallet.address}[${index}]`;
      await logs({
        chain_id,
        type: job.attrs.name,
        status: true,
        wallet_address_1: SPENDING_WALLET_PAID_COIN[chain_id] || 'Spending_Wallet',
        wallet_address_2: wallet.address,
        index_wallet_1: index,
        index_wallet_2: null,
        amount: randomAmount,
        token_in: symbolToken,
        token_out: symbolToken,
        amount_fee: 0,
        date,
        job_id: job.attrs._id,
        id_execute_template: id_execute,
        descriptions,
      });

      return { status: true, error: null, msg: 'done' };
    } else {
      await sendNotiBackendTeam(
        `[BOT_TOOL]: N0304 - ${SLACK_JAY} Withdraw UTT token for holder failed - receviver [${wallet.address}] - Job_Id backend game [${asyncJobIdGame}]`,
      );
      throw { error: 'Withdrawal failed due to too long' };
    }
  } catch (error) {
    console.log(error);
    return { status: false, error, msg: null };
  }
};

export const depositReduceHolders = async ({ job }) => {
  try {
    const { date, chain_id, index, id_execute } = job.attrs.data;
    const chainId = chain_id;
    const wallet = await getWalletByIndex({ chainId, indexWallet: index });

    const symbolToken = SYMBOL_TOKEN.LCR;
    const token = getMapToken(chainId, symbolToken);
    if (!token) throw { error: `Token ${symbolToken} not supported` };
    const addressToken = token.address;

    const erc20 = new ERC20({
      chainId,
      token: addressToken,
    });

    await erc20.init();

    const balanceWei = await erc20.balanceOf({ address: wallet.address });
    if (balanceWei.lte(0)) return { status: true, error: null, msg: 'Balance equal 0' };
    const balanceEther = weiToEther(balanceWei);

    const addressOperator = deployments[chainId].LCROperator[0];

    const amountAllowanceWei = await erc20.allowance({
      owner: wallet.address,
      spender: addressOperator,
    });
    if (amountAllowanceWei.lt(balanceWei)) {
      await buffNativeHaveCheckMinBalance({ chainId, wallet, amountNativeNeedSend: 0 });
      await erc20.approveMax({ privateKey: wallet.privateKey, spender: addressOperator });
    }

    await buffNativeHaveCheckMinBalance({ chainId, wallet, amountNativeNeedSend: 0 });

    const lcrOperatorContract = new ethers.Contract(addressOperator, ABIS.LCROperator, wallet);
    const gasPrice = await getGasPriceDynamic({ chainId });

    let gasLimit = await lcrOperatorContract.estimateGas.depositToken(addressToken, balanceWei);

    let txDeposit = await lcrOperatorContract.depositToken(addressToken, balanceWei, { gasLimit, gasPrice });

    await txDeposit.wait(1);

    const gasFee = await awaitTransaction({ chainId, txHash: txDeposit.hash });

    const resultUpdate = await WalletSkimModel.findOneAndUpdate({ chain_id, index }, { holding_amount: 0 });
    if (!resultUpdate) throw { error: 'Update Holding Amount DB Fail!' };

    const descriptions = `${wallet.address}[${index}] ${job.attrs.name} ${balanceEther} ${symbolToken} to spending wallet`;
    await logs({
      chain_id,
      type: job.attrs.name,
      status: true,
      wallet_address_1: wallet.address,
      wallet_address_2: null,
      index_wallet_1: index,
      index_wallet_2: null,
      amount: balanceEther,
      token_in: symbolToken,
      token_out: symbolToken,
      amount_fee: 0,
      date,
      gas_fee: gasFee,
      tx_hash: txDeposit.hash,
      job_id: job.attrs._id,
      id_execute_template: id_execute,
      descriptions,
    });

    return { status: true, error: null, msg: 'done' };
  } catch (error) {
    console.log(error);
    return { status: false, error, msg: null };
  }
};
