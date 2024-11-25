import moment from 'moment';
import { TYPE_WALLET } from '../../../utils/enum.js';
import { FORMAT_DATE } from '../../../utils/time.js';
import { cacheBalanceWalletsSource, getBalancePair } from '../../handlers/assetsRecovery.js';
import ReportBalancesDexModel from '../../models/ReportBalancesDex.js';
import WalletSourceModel from '../../models/WalletSource.js';
import { reportBalancesAllWalletsHaveMoney } from '../../reports/reportsBalancesWallets.js';
import { formatError } from '../../../utils/format.js';

export const reportBalanceDex = async () => {
  const chainId = '56';

  const cachePromise = cacheBalanceWalletsSource({ chainId });
  const reportPromise = reportBalancesAllWalletsHaveMoney({ chainId, isDex: true });
  const balancePair = await getBalancePair({ chainId });
  const [report, pair] = await Promise.all([reportPromise, balancePair, cachePromise]);

  const total_usdt_pair = pair.balance.usdt;
  const total_lcr_pair = pair.balance.lcr;

  // Get info source wallets from DB after cache on-chain
  let sourceWallets = await WalletSourceModel.aggregate([
    { $sort: { index: 1 } },
    {
      $match: { chain_id: chainId, type: TYPE_WALLET.source_dex },
    },
    {
      $group: {
        _id: { address: '$address', chain_id: '$chain_id', index: '$index', type: '$type' },
        data: { $push: '$$ROOT' },
      },
    },
  ]);

  const total_usdt_source_dex = sourceWallets.reduce((total, wallet) => {
    const { data } = wallet;
    const usdt = data.find(item => item.asset == 'usdt');
    return total + parseFloat(usdt.balance);
  }, 0);
  const total_lcr_source_dex = sourceWallets.reduce((total, wallet) => {
    const { data } = wallet;
    const lcr = data.find(item => item.asset == 'lcr');
    return total + parseFloat(lcr.balance);
  }, 0);
  const total_bnb_source_dex = sourceWallets.reduce((total, wallet) => {
    const { data } = wallet;
    const bnb = data.find(item => item.asset == 'bnb');
    return total + parseFloat(bnb.balance);
  }, 0);

  const number_source_dex = sourceWallets.length;

  // Get info bots wallets from On-chain
  const total_usdt_bots = report.walletsHaveBalances.reduce((acc, cur) => acc + parseFloat(cur.usdt), 0);
  const total_lcr_bots = report.walletsHaveBalances.reduce((acc, cur) => acc + parseFloat(cur.lcr), 0);
  const total_bnb_bots = report.walletsHaveBalances.reduce((acc, cur) => acc + parseFloat(cur.bnb), 0);
  const total_holding_amount = report.walletsHaveBalances.reduce((acc, cur) => acc + parseFloat(cur.holding_amount), 0);
  const total_number_bots = report.walletsHaveBalances.length;

  return {
    chain_id: chainId,
    total_lcr_pair,
    total_usdt_pair,
    total_usdt_source_dex,
    total_lcr_source_dex,
    total_bnb_source_dex,
    number_source_dex,
    total_usdt_bots,
    total_lcr_bots,
    total_bnb_bots,
    total_holding_amount_bots: total_holding_amount,
    total_number_bots,
  };
};

export const cacheReportBalanceDex = async () => {
  try {
    const report = await reportBalanceDex();
    await ReportBalancesDexModel.create({
      chain_id: report.chain_id,
      total_lcr_pair: report.total_lcr_pair,
      total_usdt_pair: report.total_usdt_pair,
      total_bnb_source_dex: report.total_bnb_source_dex,
      total_lcr_source_dex: report.total_lcr_source_dex,
      total_usdt_source_dex: report.total_usdt_source_dex,
      number_source_dex: report.number_source_dex,
      total_bnb_bots: report.total_bnb_bots,
      total_lcr_bots: report.total_lcr_bots,
      total_usdt_bots: report.total_usdt_bots,
      total_holding_amount_bots: report.total_holding_amount_bots,
      number_bots: report.total_number_bots,
      date: moment().format(FORMAT_DATE),
      time_cache: moment(),
    });
    return { status: true, error: null };
  } catch (error) {
    console.error('Backup database error:', error);
    return { status: false, error: formatError(error) };
  }
};
