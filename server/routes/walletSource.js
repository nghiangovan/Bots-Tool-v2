import express from 'express';
import { auth } from '../middleware/auth.js';
import { PAGE_SIZE } from '../../utils/constant.js';
import WalletSourceModel from '../../src/models/WalletSource.js';
import {
  cacheBalanceAll,
  cacheBalanceSourceSkim,
  cacheBalanceWalletsSource,
  cacheBalanceWalletsSpending,
} from '../../src/handlers/assetsRecovery.js';
import { transferAssetBetweentWallets } from '../../src/handlers/common.js';
import HistoryBalancesModel from '../../src/models/HistoryBalances.js';

const router = express.Router();

//GET ALL Wallet Source By Chain
router.get('/', auth, async (req, res) => {
  try {
    let { page, size } = req.query;
    if (!page) page = 1;
    else page = parseInt(page);
    if (!size) size = PAGE_SIZE;
    else size = parseInt(size);
    const limit = parseInt(size);
    const skip = (page - 1) * size;

    const chain_id = req.query.chain_id;

    let objFilter = {};
    if (req.query?.chain_id) objFilter['chain_id'] = req.query.chain_id;
    if (req.query?.address) objFilter['address'] = { $regex: new RegExp('^' + req.query.address.toLowerCase(), 'i') };

    const wallets = await WalletSourceModel.aggregate([
      { $sort: { index: 1 } },
      {
        $match: { ...objFilter },
      },
      {
        $group: {
          _id: { address: '$address', chain_id: '$chain_id', index: '$index', type: '$type' },
          data: { $push: '$$ROOT' },
        },
      },
    ])
      .limit(limit)
      .skip(skip)
      .sort({ index: 1 });

    const balancesAll = await WalletSourceModel.aggregate([
      {
        $match: { chain_id },
      },
      {
        $group: {
          _id: { asset: '$asset', chain_id: '$chain_id' },
          total: { $sum: '$balance' },
        },
      },
    ]);

    const total_wallets = (
      await WalletSourceModel.aggregate([
        {
          $match: { chain_id },
        },
        {
          $group: {
            _id: { asset: '$asset', chain_id: '$chain_id' },
            count: { $sum: 1 },
          },
        },
      ])
    ).length;

    const total_documents = await WalletSourceModel.countDocuments({ ...objFilter });
    const total_pages = Math.ceil(total_documents / size);

    const previous_pages = page - 1;
    const next_pages = Math.ceil((total_documents - skip) / size);

    const resultFinal = wallets.map(wallet => {
      return {
        address: wallet._id.address,
        chain_id: wallet._id.chain_id,
        index: wallet._id.index,
        type: wallet._id.type,
        balances: wallet.data.map(infoBalance => {
          return {
            asset: infoBalance.asset,
            balance: parseFloat(infoBalance.balance),
          };
        }),
      };
    });

    const balancesAllFinal = balancesAll.map(asset => {
      return {
        asset: asset._id.asset,
        chain_id: asset._id.chain_id,
        total: parseFloat(asset.total),
      };
    });

    res.status(200).send({
      data: resultFinal,
      total_assets: balancesAllFinal,
      total_wallets,
      page,
      size,
      previous_pages,
      next_pages,
      total_pages,
    });
  } catch (err) {
    res.status(500).send(err);
  }
});

//GET ALL Wallet Source In All Chains
router.get('/all', auth, async (req, res) => {
  try {
    let { page, size } = req.query;
    if (!page) page = 1;
    else page = parseInt(page);
    if (!size) size = PAGE_SIZE;
    else size = parseInt(size);
    const limit = parseInt(size);
    const skip = (page - 1) * size;

    let balances = await HistoryBalancesModel.find().limit(limit).skip(skip).sort({ time_cache: -1 });
    balances = balances.map(i => ({ balances: JSON.parse(i.balances), date: i.date, time_cache: i.time_cache }));

    const total_documents = await HistoryBalancesModel.countDocuments();
    const total_pages = Math.ceil(total_documents / size);

    const previous_pages = page - 1;
    const next_pages = Math.ceil((total_documents - skip) / size);

    res.status(200).send({ data: balances, page, size, previous_pages, next_pages, total_pages });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.post('/cache/:chain_id', auth, async (req, res) => {
  try {
    cacheBalanceWalletsSource({ chainId: req.params.chain_id });
    if (req.params.chain_id == '42220') {
      cacheBalanceWalletsSpending({ chainId: req.params.chain_id });
    }
    cacheBalanceSourceSkim({ chainId: req.params.chain_id });
    res.status(200).send({ result: true });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.post('/cache_all', auth, async (req, res) => {
  try {
    await cacheBalanceAll();
    return res.status(200).send({ result: true });
  } catch (err) {
    return res.status(500).send(err);
  }
});

router.post('/transfer', auth, async (req, res) => {
  try {
    const chainId = req.body.chain_id;
    const asset = req.body.asset; // BNB, USDT, LCR
    const typeWalletFrom = req.body.type_wallet_from;
    const indexWalletFrom = req.body.index_wallet_from;
    const typeWalletTo = req.body.type_wallet_to;
    const indexWalletTo = req.body.index_wallet_to;
    const amount = req.body.amount;

    const result = await transferAssetBetweentWallets({
      chainId,
      asset,
      typeWalletFrom,
      indexWalletFrom,
      typeWalletTo,
      indexWalletTo,
      amount,
    });
    if (!result.status) throw result.error;
    res.status(200).send({ result: true });
  } catch (err) {
    res.status(500).send(err);
  }
});
export default router;
