import express from 'express';
import { getInfoWallet, transferAssetBetweentWallets } from '../../src/handlers/common.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

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
    res.status(200).send({ result: result.status, txHash: result.txHash, gasFee: result.gasFee, error: null });
  } catch (error) {
    res.status(500).send({ result: false, txHash: null, gasFee: null, error });
  }
});

router.post('/verify_wallet', auth, async (req, res) => {
  try {
    const { type, index } = req.body;
    const { status, error, wallet } = await getInfoWallet({ type, index });
    if (!status) res.status(400).send({ status: false, wallet: null, error });
    res.status(200).send({ status: true, wallet, error: null });
  } catch (error) {
    res.status(500).send({ status: false, wallet: null, error });
  }
});

export default router;
