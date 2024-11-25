/* eslint-disable no-undef */
import { connectMongoDB } from '../../../database/conection.js';
import { sleep } from '../../../utils/utils.js';
import { getWalletSkimByIndexOffChain } from '../../handlers/common.js';
import WalletSkimModel from '../../models/WalletSkim.js';

const main = async () => {
  connectMongoDB();
  const chain_id = 42220;
  const lowerLimit = 0;
  const upperLimit = 160000;
  const indexWallets = Array.from({ length: upperLimit - lowerLimit }, (_, i) => i + lowerLimit);
  let listSubAddress = [];
  for (let i = 0; i < indexWallets.length; i += 1000) listSubAddress.push(indexWallets.slice(i, i + 1000));

  await Promise.all(
    listSubAddress.map(async (subListIndex, ix) => {
      await sleep(ix * 5);
      for (let i = 0; i < subListIndex.length; i++) {
        const index = subListIndex[i];
        let wallet = getWalletSkimByIndexOffChain({ indexWallet: index });
        await WalletSkimModel.updateOne(
          { chain_id, index, address: wallet.address },
          { chain_id, index, address: wallet.address },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );
        console.log('index: ', index);
      }
    }),
  );
  console.log('done');
  return process.exit(0);
};

main();
