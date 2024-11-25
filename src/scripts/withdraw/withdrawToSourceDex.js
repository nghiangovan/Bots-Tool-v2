/* eslint-disable no-undef */
import axios from 'axios';
import { ethers } from 'ethers';
import { ABIS } from '../../../configs/ABIs.js';
import { getMapToken } from '../../../configs/addresses.js';
import { connectMongoDB } from '../../../database/conection.js';
import { getProvider } from '../../../utils/blockchain.js';
import { ADMIN_TOKEN_WITHDRAW_PROD, CHAIN_ID_ADMIN_API_URL, CHAIN_ID_API_URL } from '../../../utils/constant.js';
import { randomFloatBetween } from '../../../utils/random.js';
import { sleep } from '../../../utils/utils.js';
import WalletSkimModel from '../../models/WalletSkim.js';

const CHAIN_ID = '56';

const main = async () => {
  connectMongoDB();
  await sleep(1000);

  const wallets = [
    {
      index: 0,
      address: '0x5fb6481feedfe538e427a924c0bf86a418c83059',
    },
    {
      index: 1,
      address: '0xb73a6edb63a8bac2623ab5f42a22d925e9c6010e',
    },
    {
      index: 2,
      address: '0x3df0f1795cbcae88b51ca3303d94c0b0ad00788c',
    },
    {
      index: 3,
      address: '0x654f12792b6710c6f3dfb6c1fee77b6c724d4d25',
    },
    {
      index: 4,
      address: '0xd51d71248f7a95393e24175b2609c37790f76dfc',
    },
    {
      index: 5,
      address: '0xb516c33fedd9b9f968925cd9abc15fa551dc76c1',
    },
    {
      index: 6,
      address: '0xf5a84897f33af155cc9c7a23e4288ea379ed4c32',
    },
    {
      index: 7,
      address: '0xe60e2d3c9969597d7b5dcaa1b5f8a1c5a0d616cd',
    },
    {
      index: 8,
      address: '0xf8851abce8f305cc0db57e6298ebaa63478a1b57',
    },
    {
      index: 9,
      address: '0x8be654fa5884a90be389648d366d75ebd670c9c0',
    },
  ];

  for (let i = 0; i < wallets.length; i++) {
    const amount = randomFloatBetween(300, 310);
    const result = await fakeBigHolder({ wallet_address: wallets[i].address, index: wallets[i].index, amount });
    console.log(` -> Withdraw big holder ${i} - ${wallets[i].address}  - amount ${amount} - result ${result.data}`);
  }
  console.log('Done!');
  return process.exit(0);
};

const fakeBigHolder = async ({ wallet_address, index, amount }) => {
  try {
    const apiUrl = CHAIN_ID_API_URL[CHAIN_ID];
    if (!apiUrl) throw { error: 'Info apiUrl not found' };
    const adminApiUrl = CHAIN_ID_ADMIN_API_URL[CHAIN_ID];
    if (!adminApiUrl) throw { error: 'Info Admin API URL not found' };
    const tokenAdmin = ADMIN_TOKEN_WITHDRAW_PROD;
    if (!tokenAdmin) throw { error: `Admin Token not found` };

    const data = {
      asset_type: 'UTT',
      bot_type: 'source_dex',
      wallet_index: index,
      wallet_address: wallet_address.toLowerCase(),
      amount,
      note: 'withdraw Source DEX',
    };
    const response = await axios.post(`${adminApiUrl}/v2/bots/withdraw_whitelist`, data, {
      headers: {
        Authorization: `Bearer ${tokenAdmin}`,
      },
    });
    if (response?.errors) throw { error: 'Create job withdraw fail!' };

    let walletModel = await WalletSkimModel.findOne({ chain_id: CHAIN_ID, index });
    if (walletModel) {
      const holdingAmountOld = walletModel?.holding_amount ? parseFloat(walletModel.holding_amount) : 0;
      await walletModel.updateOne({ holding_amount: holdingAmountOld + amount });
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
    return { status: true, data: asyncJobIdGame };
  } catch (error) {
    console.log(error);
    fakeBigHolder(wallet_address);
  }
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
