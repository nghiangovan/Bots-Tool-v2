/* eslint-disable no-undef */
import axios from 'axios';
import { ethers } from 'ethers';
import { ABIS } from '../../../configs/ABIs.js';
import { getMapToken } from '../../../configs/addresses.js';
import { connectMongoDB } from '../../../database/conection.js';
import { getProvider } from '../../../utils/blockchain.js';
import { ADMIN_TOKEN_WITHDRAW_PROD, CHAIN_ID_ADMIN_API_URL, CHAIN_ID_API_URL } from '../../../utils/constant.js';
import { getDataByFile, writeNewToFile } from '../../../utils/file.js';
import { randomFloatBetween } from '../../../utils/random.js';
import { sleep } from '../../../utils/utils.js';
import WalletSkimModel from '../../models/WalletSkim.js';
import { SYMBOL_TOKEN } from '../../../utils/enum.js';

const CHAIN_ID = '56';

const amounts = [
  83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83,
  83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83,
  83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83,
  83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83,
  83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83,
  83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83,
  83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 83, 85, 85, 88, 90, 92, 95, 98, 98, 99, 102, 103, 103, 104, 104, 104, 105,
  105, 106, 106, 107, 107, 107, 107, 108, 109, 109, 109, 110, 110, 110, 111, 111, 112, 113, 113, 113, 114, 114, 114,
  114, 114, 115, 115, 116, 116, 116, 117, 117, 118, 119, 119, 120, 120, 120, 121, 121, 122, 123, 123, 124, 125, 126,
  126, 126, 127, 127, 128, 129, 129, 130, 130, 131, 132, 132, 132, 133, 134, 134, 134, 135, 135, 136, 137, 137, 138,
  138, 139, 140, 140, 141, 142, 143, 143, 144, 145, 145, 146, 146, 147, 147, 147, 148, 149, 149, 149, 149, 150, 150,
  151, 151, 152, 153, 153, 154, 155, 155, 156, 156, 157, 157, 159, 159, 160, 161, 162, 162, 163, 164, 165, 165, 166,
  166, 167, 168, 169, 170, 170, 170, 170, 171, 171, 173, 173, 173, 173, 174, 175, 175, 176, 178, 178, 180, 180, 180,
  181, 182, 183, 184, 185, 186, 187, 187, 187, 189, 190, 190, 191, 191, 191, 193, 193, 194, 195, 197, 197, 197, 198,
  199, 199, 201, 202, 202, 202, 203, 203, 204, 204, 205, 206, 206, 207, 208, 209, 211, 211, 212, 213, 214, 215, 215,
  216, 217, 218, 219, 219, 220, 221, 222, 223, 223, 223, 224, 225, 226, 227, 228, 228, 229, 230, 230, 232, 233, 234,
  235, 236, 237, 238, 238, 239, 240, 241, 241, 243, 245, 245, 247, 249, 250, 251, 252, 254, 255, 257, 257, 258, 260,
  262, 263, 264, 264, 265, 267, 269, 270, 270, 271, 272, 274, 276, 277, 278, 280, 281, 282, 283, 285, 286, 287, 287,
  288, 288, 288, 291, 292, 293, 295, 295, 296, 297, 298, 299, 301, 302, 303, 305, 307, 309, 310, 312, 313, 315, 315,
  316, 318, 319, 320, 322, 323, 324, 324, 325, 327, 327, 329, 331, 334, 336, 339, 339, 341, 344, 345, 345, 347, 349,
  351, 353, 354, 354, 356, 357, 359, 360, 362, 363, 364, 364, 365, 366, 369, 371, 374, 376, 377, 378, 380, 382, 383,
  383, 384, 386, 388, 388, 389, 392, 394, 396, 400, 402, 402, 404, 406, 409, 410, 411, 413, 415, 417, 417, 418, 420,
  422, 424, 424, 425, 426, 426, 428, 431, 434, 435, 437, 439, 441, 443, 447, 448, 450, 451, 452, 456, 457, 460, 464,
  466, 466, 470, 472, 475, 477, 478, 481, 485, 485, 486, 489, 493, 497, 499, 501, 502, 504, 505, 506, 506, 510, 511,
  511, 515, 519, 520, 520, 522, 526, 529, 533, 536, 538, 539, 541, 543, 543, 546, 547, 549, 553, 554, 556, 556, 558,
  561, 563, 566, 571, 572, 572, 576, 577, 582, 586, 587, 590, 591, 596, 598, 599, 600, 603, 606, 610, 612, 615, 616,
  616, 619, 621, 625, 627, 627, 628, 632, 632, 636, 640, 645, 650, 653, 657, 661, 662, 667, 671, 676, 679, 681, 685,
  688, 692, 698, 701, 702, 705, 710, 712, 716, 721, 726, 727, 729, 730, 731, 733, 737, 739, 744, 744, 745, 750, 754,
  758, 760, 760, 760, 762, 765, 767, 769, 771, 775, 778, 782, 786, 791, 793, 797, 801, 802, 804, 807, 813, 819, 825,
  831, 834, 836, 837, 839, 839, 842, 849, 855, 862, 863, 864, 866, 867, 868, 873, 876, 878, 881, 883, 884, 886, 887,
  892, 895, 900, 907, 912, 916, 922, 925, 930, 931, 935, 937, 944, 951, 954, 959, 961, 967, 970, 977, 984, 984, 985,
  993, 993, 996, 1003, 1009, 1015, 1021, 1029, 1033, 1035, 1040, 1045, 1050, 1052, 1056, 1056, 1060, 1064, 1068, 1069,
  1075, 1076, 1084, 1087, 1095, 1095, 1104, 1104, 1106, 1110, 1118, 1123, 1126, 1131, 1134, 1137, 1140, 1141, 1149,
  1156, 1164, 1166, 1175, 1179, 1183, 1191, 1192, 1193, 1199, 1200, 1208, 1209, 1216, 1216, 1222, 1224, 1225, 1225,
  1232, 1234, 1238, 1246, 1248, 1248, 1255, 1264, 1274, 1283, 1287, 1288, 1292, 1296, 1303, 1304, 1312, 1314, 1315,
  1322, 1327, 1328, 1331, 1340, 1348, 1349, 1353, 1363, 1371, 1377, 1381, 1382, 1392, 1395, 1398, 1404, 1413, 1415,
  1420, 1430, 1430, 1438, 1439, 1446, 1446, 1452, 1454, 1462, 1467, 1476, 1482, 1491, 1501, 1510, 1520, 1521, 1526,
  1528, 1534, 1541, 1548, 1556, 1557, 1565, 1569, 1581, 1587, 1588, 1596, 1604, 1614, 1627, 1633, 1637, 1640, 1649,
  1662, 1667, 1675, 1680, 1693, 1705, 1710, 1721, 1727, 1727, 1735, 1744, 1749, 1756, 1759, 1766, 1768, 1781, 1781,
  1794, 1801, 1814, 1818, 1822, 1828, 1834, 1835, 1844, 1851, 1865, 1869, 1878, 1884, 1887, 1892, 1896, 1911, 1919,
  1927, 1929, 1940, 1954, 1957, 1963, 1974, 1988, 2004, 2005, 2013, 2019, 2026, 2031, 2040, 2042, 2058, 2060, 2074,
  2080, 2088, 2098, 2110, 2119, 2124, 2128, 2139, 2156, 2156, 2165, 2174, 2191, 2201, 2207, 2216, 2229, 2231, 2233,
  2239, 2247, 2263, 2275, 2276, 2283, 2292, 2295, 2299, 2311, 2328, 2336, 2350, 2359, 2376, 2389, 2390, 2405, 2406,
  2417, 2435, 2448, 2457, 2474, 2480, 2482, 2500, 2504, 2512, 2515, 2534, 2534, 2552, 2556, 2576, 2593, 2609, 2612,
  2632, 2647, 2660, 2665, 2667, 2673, 2682, 2683, 2687, 2695, 2698, 2706, 2725, 2735, 2736, 2739, 2761, 2777, 2794,
  2806, 2826, 2841, 2863, 2866, 2879, 2880, 2893, 2894, 2910, 2914, 2925, 2938, 2948, 2953, 2968, 2989, 2996, 3015,
  3034, 3043, 3049, 3062, 3064, 3072, 3081, 3081, 3103, 3124, 3129, 3150, 3172, 3178, 3180, 3187, 3190, 3201, 3218,
  3244, 3263, 3287, 3291, 3294, 3315, 3328, 3348, 3366, 3369, 3388, 3404, 3428, 3429, 3434, 3450, 3461, 3477, 3501,
  3528, 3556, 3558, 3565, 3574, 3587, 3602, 3611, 3634, 3657, 3685, 3713, 3717, 3733, 3757, 3763, 3775, 3779, 4687,
  4838, 4968, 5103, 5229, 5344, 5401, 5558, 5568, 5578, 5591, 5666, 5733, 5817, 5872, 5973, 6115, 6286, 6424, 6437,
  6511, 6572, 6686, 6782, 6858, 7065, 7247, 7450, 7594, 7624, 7723, 7760, 7922, 8061, 8329, 8624, 8729, 8953, 9032,
  9215, 9248, 9389, 9489, 9823, 10008, 10120, 10132, 10292, 10436, 10584, 10724, 10790, 10793, 10912, 11028, 11080,
  11187, 11299, 11560, 11677, 11760, 12018, 12079, 12079, 12233, 12518, 12678, 12918, 13381, 13715, 13910, 14209, 14560,
  14790, 15151, 15400, 15560, 15719, 15918, 16205, 16486, 16611, 17049, 17052, 17342, 17415, 17747, 17811, 18374, 18409,
  18426, 18457, 18847, 18849, 19357, 19803, 20173, 20461, 20948,
];

const main = async () => {
  connectMongoDB();
  await sleep(1000);

  const wallets = getDataByFile('data/wallet_dex.json');
  const { index_from, current } = getDataByFile('data/current_index_big_holder.json');

  let holders_increased = 0;

  const start_index = index_from == current ? index_from : current + 1;
  const start_idx = index_from == current ? 0 : current - index_from + 1;

  if (start_idx >= amounts.length) return process.exit(0);

  for (let i = start_idx; i < amounts.length; i++) {
    const index = start_index + i;

    const address = wallets[index].address;

    const resBalance = await getBalanceOnChainToken({ chainId: CHAIN_ID, symbolToken: SYMBOL_TOKEN.LCR, address });

    let walletModel = await WalletSkimModel.findOne({ chain_id: CHAIN_ID, index });
    const holding_amount = walletModel?.holding_amount ? parseFloat(walletModel.holding_amount) : 0;

    console.log(`Index: ${index} - Holding: ${holding_amount} - Balance: ${resBalance} - Amount: ${amounts[i]}`);

    if (resBalance >= amounts[i]) {
      if (resBalance > holding_amount) await walletModel.updateOne({ holding_amount: resBalance });
      continue;
    }

    const amount = amounts[i] - resBalance;

    if (amount <= 0.001) continue;

    const status_async_job = await fakeBigHolder({ wallet_address: address, index, amount });

    if (status_async_job.status) {
      holders_increased++;
      writeNewToFile('data/current_index_big_holder.json', { index_from, current: index });
      const random = parseFloat(randomFloatBetween(5000, 8000)).toFixed(0);
      await new Promise(resolve => setTimeout(resolve, random));
    }

    console.log(
      ` -> Withdraw big holder ${index} - ${wallets[i].address} - total increased ${holders_increased} - amount ${amount}`,
    );
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
      bot_type: 'dex',
      wallet_index: index,
      wallet_address: wallet_address.toLowerCase(),
      amount,
      note: 'withdraw big holder',
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
