import { formatError } from '../../utils/format.js';
import { cacheBalanceSourceSkim, cacheBalanceWalletsSource } from './assetsRecovery.js';
import { getGasPriceBSC, getGasPriceCELO } from './common.js';

export const cacheDataSource = async () => {
  try {
    // let startTime = new Date();

    await cacheBalanceWalletsSource({ chainId: 56 });
    await cacheBalanceSourceSkim({ chainId: 56 });

    // let endTime = new Date();
    // console.log('Total Time: ', endTime.getTime() - startTime.getTime());
  } catch (error) {
    throw { error: `Cache Data Source Wallet: ${formatError(error)}` };
  }
};

export const cacheDataGasPrice = async () => {
  try {
    // let startTime = new Date();

    await getGasPriceBSC();
    await getGasPriceCELO();

    // let endTime = new Date();
    // console.log('Total Time: ', endTime.getTime() - startTime.getTime());
  } catch (error) {
    throw { error: `Cache Data Gas Price: ${formatError(error)}` };
  }
};
