/* eslint-disable no-undef */
import * as dotenv from 'dotenv';
import { shuffle } from './random.js';

dotenv.config();

export const { CHAIN_ID } = process.env;
export const { ADMIN_TOKEN_WITHDRAW_PROD } = process.env;
export const { ADMIN_TOKEN_PROD } = process.env;
export const { ADMIN_TOKEN_STG } = process.env;
export const { TOKEN_BOT_PROD } = process.env;
export const { TOKEN_BOT_STG } = process.env;
export const { TOKEN_SERVER } = process.env;
export const { BOT_USER_ID_PROD } = process.env;
export const { BOT_USER_ID_STG } = process.env;
export const { MNEMONIC_ROOT } = process.env;
export const { MNEMONIC_ROOT_SOURCE } = process.env;
export const { MNEMONIC_ROOT_SKIM } = process.env;
export const { MNEMONIC_ROOT_SOURCE_SKIM } = process.env;
export const { MNEMONIC_ROOT_BALANCE_RATE } = process.env;
export const { MNEMONIC_ROOT_SPENDING } = process.env;
export const { PRIVATE_KEY_SWAP_SIGNER } = process.env;
export const { DATABASE_MONGO_URL } = process.env;
export const { API_KEY_BITQUERY } = process.env;
export const { API_KEY_BSCSCAN } = process.env;
export const { API_KEY_CELOSCAN } = process.env;

export const { HOST } = process.env;
export const { WORKING_DIR } = process.env;
export const CONFIG_DIR = `${process.env.WORKING_DIR}/config`;
export const STG_DIR = `${process.env.WORKING_DIR}/stg`;
export const SRC_DIR = `${process.env.WORKING_DIR}/src`;
export const DATA_DIR = `${process.env.WORKING_DIR}/data`;
export const DATA_STG_DIR = `${process.env.WORKING_DIR}/data-stg`;
export const LOGS_DIR = `${process.env.WORKING_DIR}/logs`;
export const SERVER_DIR = `${process.env.WORKING_DIR}/slack`;
export const SCRIPT_DIR = `${process.env.WORKING_DIR}/script`;
export const SCRIPT_STG_DIR = `${process.env.WORKING_DIR}/script-stg`;
export const { SLACK_NOTI } = process.env;
export const { SLACK_NOTI_BACKEND_TEAM } = process.env;
export const { ADMIN_KEY } = process.env;
export const SLACK_AMORY = '<@UDK9CHKCM>';
export const SLACK_HENRY = '<@U02KSTMDYAG>';
export const SLACK_NOLAN = '<@U03N8A8BD0C>';
export const SLACK_KEN = '<@U38DXTCHE>';
export const SLACK_MAI = '<@UBU77NEEB>';
export const SLACK_JAY = '<@UPFJLFLJJ>';
export const SLACK_MINCHAN = '<@UDW03RVGR>';
export const SLACK_CHANNEL_ID = 'C04K4RCVCJ3'; // bot-wallet
export const SLACK_CHANNEL_ID_STG = 'C04L971T56C'; // bot-wallet-stg
export const SLACK_STG_CHANNEL_ID = 'C04L971T56C';

export const CHAIN_ID_API_URL = {
  56: 'https://api.blcr.xyz',
  97: 'https://api.stg.blcr.xyz',
};

export const CHAIN_ID_ADMIN_API_URL = {
  56: 'https://admin-api.blcr.xyz',
  97: 'https://admin-api.stg.blcr.xyz',
};

export const CHAIN_ID_ADMIN_TOKEN = {
  56: ADMIN_TOKEN_PROD,
  97: ADMIN_TOKEN_STG,
};

export const CHAIN_ID_BOT_TOKEN = {
  56: TOKEN_BOT_PROD,
  97: TOKEN_BOT_STG,
};

export const CHAIN_ID_BOT_ID = {
  56: BOT_USER_ID_PROD,
  97: BOT_USER_ID_STG,
};

export const NETWORK = {
  56: 'BSC',
  97: 'BSC',
};

export const NETWORK_BITQUERY = {
  56: 'bsc',
  97: 'bsc_testnet',
  42220: 'celo_mainnet',
};

export const BASE_URL_API_SCAN = {
  56: 'https://api.bscscan.com/api',
  97: 'https://api-testnet.bscscan.com/api',
  42220: 'https://api.celoscan.io/api',
};

export const BASE_URL_SCAN = {
  56: 'https://bscscan.com',
  97: 'https://testnet.bscscan.com',
  42220: 'https://celoscan.io',
};

export const API_KEY_SCAN = {
  56: API_KEY_BSCSCAN,
  97: API_KEY_BSCSCAN,
  42220: API_KEY_CELOSCAN,
};

export const BASE_API_BINANCE = 'https://api.binance.com/api/v3/ticker/price?symbol=';

export const MIN_BALANCE_NATIVE = { 56: 0.001, 97: 0.005, 42220: 0.001 };
export const BUFF_GAS_FEE = { 56: 0.008, 97: 0.025, 42220: 0.015 };

export const MIN_AMOUNT_LCR_RECOVERY = 0.04; // LCR format Ether
export const MIN_AMOUNT_USDT_RECOVERY = 0.04; // USDT format Ether
export const MIN_AMOUNT_BNB_RECOVERY = { 56: 0.0003, 97: 0.0003, 42220: 0.0006 }; // BNB format Ether

export const BUFF_GASLIMT = { 97: 30000, 56: 20000 };
export const BUFF_GAS_PRICE = 1; // 1 Gwei
export const BUFF_GAS_PRICE_SKIM = 2; // 1 Gwei
export const BUFF_GAS_PRICE_HOLDER = 2; // 1 Gwei
export const FEE_WITHDRAW_TOKEN = 0; // UTT
export const AMOUNT_MAKE_DUST_WEI = 100000000000000; // wei UTT
export const GAS_LIMIT_APPROVE = 48000;
export const GAS_LIMIT_SWAP = 207000;
export const GAS_LIMIT_DEPOSIT = 90000;

export const LIST_INDEX_WALLET_SOURCE = [...Array(10).keys()];
export const LIST_INDEX_SOURCE_SKIM = [...Array(3).keys()];
export const LIST_INDEX_WALLET_SPENDING = [...Array(1).keys()];
export const LIST_INDEX_WALLET_BALANCE_RATE = [...Array(3).keys()];
export const AMOUNT_HOLDER = { min: 0.01, max: 0.01 }; // Min a holder LCR is from 3 LCR to -> 5 LCR

export const SETTING_AMOUNTS_IN = {
  4.75: 40,
  9.5: 50,
  28.5: 5,
  47.5: 3,
  95: 2,
};

export const SETTING_AMOUNTS_IN_FREE_COIN = {
  0.4: 70,
  1.7: 20,
  5.1: 8,
  10.5: 2,
};

export const LIST_AMOUNTS_IN = shuffle(
  Object.keys(SETTING_AMOUNTS_IN)
    .map(key => Array(Math.round((SETTING_AMOUNTS_IN[key] * 100) / 100)).fill(parseFloat(key)))
    .flat(1),
);

export const LIST_AMOUNTS_IN_FREE_COIN = shuffle(
  Object.keys(SETTING_AMOUNTS_IN_FREE_COIN)
    .map(key => Array(Math.round((SETTING_AMOUNTS_IN_FREE_COIN[key] * 100) / 100)).fill(parseFloat(key)))
    .flat(1),
);

export const PAGE_SIZE = 20;

export const RATE_BALANCE_DEX = {
  index_1: { usdt: 55, lcr: 45 },
  index_2: { usdt: 53, lcr: 47 },
  index_3: { usdt: 46, lcr: 54 },
  index_4: { usdt: 44, lcr: 56 },
};

export const RANGE_BALANCE = { min: 120, max: 180 };
export const MIN_VALUE_DEX_BOT = 50; // USD
export const MIN_USDT_BOT = 15;
export const MIN_LCR_BOT = 15;

export const PAIR_ADDRESS = {
  56: '0x10877eb0eDD0fe548fE376A9095A9c59D2B1Ac8D',
};
