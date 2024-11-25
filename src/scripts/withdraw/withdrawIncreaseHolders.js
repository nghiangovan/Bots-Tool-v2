import axios from 'axios';
import { ethers } from 'ethers';
import { ABIS } from '../../../configs/ABIs.js';
import { getMapToken } from '../../../configs/addresses.js';
import { connectMongoDB } from '../../../database/conection.js';
import { getProvider } from '../../../utils/blockchain.js';
import {
  CHAIN_ID_ADMIN_API_URL,
  CHAIN_ID_ADMIN_TOKEN,
  CHAIN_ID_API_URL,
  CHAIN_ID_BOT_TOKEN,
} from '../../../utils/constant.js';
import { SYMBOL_TOKEN } from '../../../utils/enum.js';
import { getDataByFile, writeNewToFile } from '../../../utils/file.js';
import WalletSkimModel from '../../models/WalletSkim.js';
import { randomFloatBetween } from '../../../utils/random.js';

const CHAIN_ID = 56;
const amount = 0.01;

const main = async () => {
  try {
    connectMongoDB();
    const wallets = getDataByFile('data/wallet_dex.json');
    const { current, target } = getDataByFile('data/current_index_holder.json');
    const index_from = current;
    const index_to = target;
    if (index_from > index_to) throw { error: 'index_from > index_to' };
    if (index_from < 0) throw { error: 'index_from < 0' };
    if (index_to > wallets.length) throw { error: 'index_to > wallets.length' };
    let holders_increased = 0;

    for (let i = index_from; i < index_to; i++) {
      console.log(`Withdraw holder ${i + 1} - ${wallets[i].address} - total holders increased ${holders_increased}`);
      const resBalance = await getBalanceOnChainToken({
        chainId: CHAIN_ID,
        symbolToken: SYMBOL_TOKEN.LCR,
        address: wallets[i].address,
      });

      let walletModel = await WalletSkimModel.findOne({ chain_id: CHAIN_ID, index: i });
      const holding_amount = walletModel?.holding_amount ? parseFloat(walletModel.holding_amount) : 0;

      if (resBalance >= amount) {
        if (resBalance > holding_amount) await walletModel.updateOne({ holding_amount: resBalance });
        writeNewToFile('data/current_index_holder.json', { current: i, target });
        continue;
      }

      const status_async_job = await fakeHolder({ wallet_address: wallets[i].address, index: i, balance: resBalance });
      if (status_async_job.status) {
        holders_increased++;
        writeNewToFile('data/current_index_holder.json', { current: i, target });
        const random = parseFloat(randomFloatBetween(2000, 5000)).toFixed(0);
        await new Promise(resolve => setTimeout(resolve, random));
      }
    }
    console.log('Done!');
    // eslint-disable-next-line no-undef
    return process.exit(0);
  } catch (error) {
    // eslint-disable-next-line no-undef
    return process.exit(0);
  }
};

const fakeHolder = async ({ wallet_address, index, balance }) => {
  try {
    const apiUrl = CHAIN_ID_API_URL[CHAIN_ID];
    if (!apiUrl) throw { error: 'Info apiUrl not found' };
    const adminApiUrl = CHAIN_ID_ADMIN_API_URL[CHAIN_ID];
    if (!adminApiUrl) throw { error: 'Info Admin API URL not found' };
    const tokenAdmin = CHAIN_ID_ADMIN_TOKEN[CHAIN_ID];
    if (!tokenAdmin) throw { error: `Admin Token not found` };
    const data = {
      wallet_address: wallet_address,
      amount,
    };
    const response = await axios.post(`${adminApiUrl}/v2/bots/withdraw_holder`, data, {
      headers: {
        Authorization: `Bearer ${tokenAdmin}`,
      },
    });
    if (response?.errors) throw { error: 'Create job withdraw fail!' };

    let walletModel = await WalletSkimModel.findOne({ chain_id: CHAIN_ID, index });
    if (walletModel) {
      const holdingAmountOld = walletModel?.holding_amount ? parseFloat(walletModel.holding_amount) : 0;

      if (holdingAmountOld > balance) await walletModel.updateOne({ holding_amount: balance + amount });
      else await walletModel.updateOne({ holding_amount: holdingAmountOld + amount });
    } else {
      const dataCreate = {
        chain_id: CHAIN_ID,
        index,
        address: wallet_address,
        holding_amount: amount,
      };
      await WalletSkimModel.create({ ...dataCreate });
    }

    const asyncJobIdGame = response?.data?.data?.async_job_id;
    // const status_async_job = await getStatusAsyncJob(asyncJobIdGame);
    // return status_async_job;
    return { status: true, data: asyncJobIdGame };
  } catch (error) {
    console.log(error);
    fakeHolder(wallet_address);
  }
};

// eslint-disable-next-line no-unused-vars
const getStatusAsyncJob = async async_job_id => {
  const apiUrl = CHAIN_ID_API_URL[CHAIN_ID];
  if (!apiUrl) throw { error: 'Info apiUrl not found' };
  const adminApiUrl = CHAIN_ID_ADMIN_API_URL[CHAIN_ID];
  if (!adminApiUrl) throw { error: 'Info Admin API URL not found' };
  const token = CHAIN_ID_BOT_TOKEN[CHAIN_ID];
  if (!token) throw { error: `Admin Token not found` };

  let count = 0;
  while (count < 4) {
    try {
      const response = await axios.get(`${apiUrl}/v2/async_jobs/${async_job_id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.errors) {
        console.log('API trả về lỗi:', JSON.stringify(response.errors));
        return { status: false, error: JSON.stringify(response.errors) };
      }
      if (response?.data?.data) {
        const data = response?.data?.data;
        if (data.status === 'success') {
          console.log('API trả về trạng thái Success');
          return { status: true, data: data };
        }
        if (data.status === 'failure') {
          console.log('API trả về trạng thái Failure');
          return { status: false, data: data };
        }
      }
      count++;

      console.log('API trả về trạng thái khác, đang thử lại sau...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.error('Lỗi khi gọi API:', error.message);
      // Xử lý lỗi nếu cần
      // Có thể tạo một số logic xử lý lỗi hoặc retry nếu có lỗi
      return { status: false, error: error.message };
    }
  }
  return { status: 'success', data: async_job_id };
};

export const getBalanceOnChainToken = async ({ chainId, symbolToken, address }) => {
  const token = getMapToken(chainId, symbolToken);
  if (!token) throw { error: `Token ${symbolToken} not supported` };
  const addressToken = token.address;
  const provider = await getProvider(chainId);

  const erc20 = new ethers.Contract(addressToken, ABIS.ERC20, provider);
  const balance = await erc20.balanceOf(address);
  return parseFloat(ethers.utils.formatEther(balance));
};

main();
