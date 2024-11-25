/* eslint-disable no-undef */
import { ethers } from 'ethers';
import { ABIS } from '../../../configs/ABIs.js';
import { getMapToken } from '../../../configs/addresses.js';
import { connectMongoDB } from '../../../database/conection.js';
import ERC20 from '../../../modules/wallet/transfer/ERC20.js';
import { getProvider } from '../../../utils/blockchain.js';
import { SYMBOL_TOKEN, TYPE_WALLET } from '../../../utils/enum.js';
import { formatCeilNearest, formatFloorNearest } from '../../../utils/format.js';
import { randomFloatBetween } from '../../../utils/random.js';
import { sleep } from '../../../utils/utils.js';
import { getMultiBalancesByContrat } from '../../handlers/assetsRecovery.js';
import { fecthPriceLCR_USDT, getWalletByIndexOffChain, getWalletSourceByIndexOffChain } from '../../handlers/common.js';
import WalletSkimModel from '../../models/WalletSkim.js';

const main = async () => {
  try {
    connectMongoDB();
    const chainId = 56;
    const index_from = 10000;
    const index_to = 15004;

    const infoTokenLcr = getMapToken(chainId, SYMBOL_TOKEN.LCR);
    if (!infoTokenLcr) throw { error: `Token ${SYMBOL_TOKEN.LCR} not supported` };
    const infoTokenUsdt = getMapToken(chainId, SYMBOL_TOKEN.USDT);
    if (!infoTokenUsdt) throw { error: `Token ${SYMBOL_TOKEN.USDT} not supported` };

    const listTokens = [
      {
        address: infoTokenLcr.address,
        symbol: SYMBOL_TOKEN.LCR,
      },
      {
        address: infoTokenUsdt.address,
        symbol: SYMBOL_TOKEN.USDT,
      },
    ];

    let wallets = await WalletSkimModel.find({ chain_id: chainId, index: { $gte: index_from, $lte: index_to } });
    let listSubWallets = [];
    for (let i = 0; i < wallets.length; i += 1000) {
      const subListWallets = wallets.slice(i, i + 1000);
      listSubWallets.push(subListWallets);
    }

    let results = await Promise.all(
      listSubWallets.map(async (subWallets, i) => {
        await sleep(i * 100);
        console.log(`GetBalancesByContract: ${i}/${listSubWallets.length - 1}`);
        const subListAddress = subWallets.map(w => w.address.toLowerCase());

        const infoBalances = await getMultiBalancesByContrat(chainId, subListAddress, listTokens);
        if (!infoBalances.status) throw infoBalances.error;

        let mapWallets = new Map();
        subWallets.forEach(async wallet => {
          mapWallets.set(wallet?.address?.toLowerCase(), wallet);
        });

        const balances = Object.keys(infoBalances.balances).map(address => {
          const infoWallet = mapWallets.get(address?.toLowerCase());
          let infoBalance = {
            index: infoWallet?.index,
            address: address.toLowerCase(),
            holding_amount: infoWallet?.holding_amount ? parseFloat(infoWallet?.holding_amount) : 0,
          };
          return { ...infoBalance, ...infoBalances.balances[address.toLowerCase()] };
        });

        return balances;
      }),
    );

    results = results.flat();

    const priceLCR = await fecthPriceLCR_USDT({ chainId }); // price LCR/USDT

    let filter = await Promise.all(
      results.map(async info => {
        const holding_amount = info?.holding_amount ? parseFloat(info?.holding_amount) : 0;
        const resBalanceLCR = info?.lcr;
        const availableLCR = resBalanceLCR - holding_amount;
        const valueLCR = parseFloat(availableLCR) * priceLCR;
        const resBalanceUSDT = parseFloat(info?.usdt);
        const totalValueUSD = resBalanceUSDT + valueLCR;
        if (resBalanceUSDT > 0 && totalValueUSD > 30 && totalValueUSD < 120) {
          return {
            index: info.index,
            address: info.address,
            holding_amount: holding_amount,
            value_usdt: resBalanceUSDT,
            value_lcr: availableLCR,
            total_value: totalValueUSD,
          };
        }
        return false;
      }),
    );

    console.log(`Total wallets less than Min : ${filter.filter(f => f).length}`);
    const walletsFiltered = filter.filter(f => f);

    let listSubWalletsNeedBalance = [];
    const totalWalletFiltered = walletsFiltered.length;
    for (let i = 0; i < totalWalletFiltered; i += 10) {
      const subListWallets = walletsFiltered.slice(i, i + 10);
      listSubWalletsNeedBalance.push(subListWallets);
    }

    for (let index = 0; index < listSubWalletsNeedBalance.length; index++) {
      const subWallets = listSubWalletsNeedBalance[index];
      const count = index * subWallets.length;
      console.log(`Index: [${count} -> ${count + subWallets.length - 1}]/${totalWalletFiltered - 1}`);
      await Promise.all(
        subWallets.map(async (info, idx) => {
          await sleep(idx * 1000);

          console.log(
            `- Holder: ${info.index} - ${info.address}
              + holding: ${formatFloorNearest(info.holding_amount)}
              + USDT: ${formatFloorNearest(info.value_usdt)}
              + LCR: ${formatFloorNearest(info.value_lcr)}
              + Value: ${formatFloorNearest(info.total_value)}`,
          );

          const provider = await getProvider(chainId);
          let usdt = new ERC20({ chainId, token: infoTokenUsdt.address });
          let lcr = new ERC20({ chainId, token: infoTokenLcr.address });

          const indexSourceWallet = idx;
          const wallet = getWalletByIndexOffChain({ indexWallet: info.index }).connect(provider);
          const sourceWallet = getWalletSourceByIndexOffChain({ indexWallet: indexSourceWallet });

          await usdt.init();
          await lcr.init();

          usdt.provider = provider;
          lcr.provider = provider;

          const randomBalance = formatCeilNearest(randomFloatBetween(120, 150));
          const halfOfTotal = formatCeilNearest(randomBalance / 2);

          if (info.value_usdt > halfOfTotal) {
            const amountNeedBack = formatFloorNearest(info.value_usdt - halfOfTotal);

            if (amountNeedBack > 0) {
              let txSendBackUSDT = await usdt.transfer({
                privateKey: wallet.privateKey,
                receiver: sourceWallet.address,
                amount: amountNeedBack,
                typeWallet: TYPE_WALLET.dex,
              });
              console.log(
                ` -> Transfer ${amountNeedBack} USDT From index ${info.index} to Source ${indexSourceWallet}: ${txSendBackUSDT.data.txHash}`,
              );
            }
          } else if (info.value_usdt < halfOfTotal) {
            const amountNeedTo = formatFloorNearest(halfOfTotal - info.value_usdt);
            if (amountNeedTo > 0) {
              let txSendToUSDT = await usdt.transfer({
                privateKey: sourceWallet.privateKey,
                receiver: wallet.address,
                amount: amountNeedTo,
                typeWallet: TYPE_WALLET.source_dex,
              });

              console.log(
                ` -> Transfer ${amountNeedTo} USDT From Source ${indexSourceWallet} to Bot index ${info.index}: ${txSendToUSDT.data.txHash}`,
              );
            }
          }

          if (info.value_lcr > halfOfTotal) {
            const amountNeedBack = formatFloorNearest(info.value_lcr - halfOfTotal);

            if (amountNeedBack > 0) {
              let txSendBackLCR = await lcr.transfer({
                privateKey: wallet.privateKey,
                receiver: sourceWallet.address,
                amount: amountNeedBack,
                typeWallet: TYPE_WALLET.dex,
              });

              console.log(
                ` -> Transfer ${amountNeedBack} LCR From index ${info.index} to Source ${indexSourceWallet}: ${txSendBackLCR.data.txHash}`,
              );
            }
          } else if (info.value_lcr < halfOfTotal) {
            const amountNeedTo = formatFloorNearest(halfOfTotal - info.value_lcr);
            if (amountNeedTo > 0) {
              let txSendToUSDT = await lcr.transfer({
                privateKey: sourceWallet.privateKey,
                receiver: wallet.address,
                amount: amountNeedTo,
                typeWallet: TYPE_WALLET.source_dex,
              });

              console.log(
                ` -> Transfer ${amountNeedTo} LCR From Source ${indexSourceWallet} to Bot index ${info.index}: ${txSendToUSDT.data.txHash}`,
              );
            }
          }
        }),
      );
    }

    console.log('Done!');
    return process.exit(0);
  } catch (error) {
    console.log(error);
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
