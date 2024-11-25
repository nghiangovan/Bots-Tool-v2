/* eslint-disable no-undef */
import axios from 'axios';
import { connectMongoDB } from '../../../database/conection.js';
import {
  CHAIN_ID_ADMIN_API_URL,
  CHAIN_ID_ADMIN_TOKEN,
  CHAIN_ID_API_URL,
  CHAIN_ID_BOT_ID,
} from '../../../utils/constant.js';

const main = async () => {
  connectMongoDB();
  const chainId = 56;
  const apiUrl = CHAIN_ID_API_URL[chainId];
  if (!apiUrl) throw { error: 'Info apiUrl not found' };
  const adminApiUrl = CHAIN_ID_ADMIN_API_URL[chainId];
  if (!adminApiUrl) throw { error: 'Info Admin API URL not found' };
  const tokenAdmin = CHAIN_ID_ADMIN_TOKEN[chainId];
  if (!tokenAdmin) throw { error: `Admin Token not found` };
  const botUserId = CHAIN_ID_BOT_ID[chainId];
  if (!botUserId) throw { error: `Bot Id not found` };

  const source = {
    wallet_0: '0x5FB6481fEEdfe538e427a924C0bF86a418C83059',
    wallet_1: '0x3df0f1795cbcae88b51ca3303d94c0b0ad00788c',
    wallet_2: '0xb73a6edb63a8bac2623ab5f42a22d925e9c6010e',
    wallet_3: '0x654F12792b6710C6f3dfb6c1FEe77b6c724d4D25',
    wallet_4: '0xD51d71248f7a95393e24175b2609c37790F76DfC',
    wallet_5: '0xb516c33fEdD9B9f968925Cd9Abc15FA551dC76c1',
    wallet_6: '0xf5A84897F33af155cc9c7a23E4288ea379Ed4C32',
    wallet_7: '0xe60E2D3C9969597D7b5DCaA1b5f8a1C5a0d616Cd',
    wallet_8: '0xF8851abCE8F305cc0db57E6298eBaa63478A1b57',
    wallet_9: '0x8bE654fa5884A90bE389648D366d75ebd670C9C0',
  };

  const data = {
    bot_user_id: botUserId,
    wallet_address: source.wallet_3,
    amount: 1132,
  };
  await axios.post(`${adminApiUrl}/v2/bots/withdraws`, data, {
    headers: {
      Authorization: `Bearer ${tokenAdmin}`,
    },
  });
  console.log('Done!');
  return process.exit(0);
};
main();
