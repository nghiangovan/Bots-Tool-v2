/* eslint-disable no-undef */
import express from 'express';
import { LOWER_BOUND_PRICE_LCR, UPPER_BOUND_PRICE_LCR } from '../../src/balanceExchangeRate/configBalanceRate.js';
import ConfigModel from '../../src/models/Config.js';
import { KEY_CONFIG, SYMBOL_TOKEN } from '../../utils/enum.js';
import { formatError } from '../../utils/format.js';
import { auth } from '../middleware/auth.js';
import { processCheckAndBalanceRate } from '../../src/balanceExchangeRate/listenAndProcessEventsTransfer.js';
import { getMapToken } from '../../configs/addresses.js';

const router = express.Router();

router.get('/configs/:chain_id', auth, async (req, res) => {
  try {
    const chainId = req.params.chain_id;
    let configBalanceRate = await ConfigModel.findOne({ chain_id: chainId, key: KEY_CONFIG.balance_rate });
    if (!configBalanceRate) {
      let newConfig = new ConfigModel({
        chain_id: chainId,
        key: KEY_CONFIG.balance_rate,
        value: JSON.stringify({
          lower_bound: LOWER_BOUND_PRICE_LCR,
          upper_bound: UPPER_BOUND_PRICE_LCR,
          enable_process: true,
        }),
      });
      configBalanceRate = await newConfig.save();
    }
    res.status(200).send({ data: JSON.parse(configBalanceRate.value) });
  } catch (error) {
    res.status(500).send({ data: null, error: formatError(error) });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    let result = null;
    const chain_id = req.body.chain_id;
    const configBalanceRate = await ConfigModel.findOne({
      chain_id,
      key: KEY_CONFIG.balance_rate,
    });
    if (configBalanceRate) {
      const { lower_bound, upper_bound, enable_process } = JSON.parse(configBalanceRate.value);
      let obj = {};
      obj.lower_bound = req.body.lower_bound ? req.body.lower_bound : lower_bound;
      obj.upper_bound = req.body.upper_bound ? req.body.upper_bound : upper_bound;
      obj.enable_process = req.body.enable_process != undefined ? req.body.enable_process : enable_process;
      const value = JSON.stringify(obj);
      result = await ConfigModel.findOneAndUpdate(
        { chain_id, key: KEY_CONFIG.balance_rate },
        {
          $set: { value },
        },
        { new: true },
      );
    } else {
      let newConfig = new ConfigModel({
        chain_id,
        key: KEY_CONFIG.balance_rate,
        value: JSON.stringify({
          lower_bound: LOWER_BOUND_PRICE_LCR,
          upper_bound: UPPER_BOUND_PRICE_LCR,
          enable_process: true,
        }),
      });
      result = await newConfig.save();
    }

    const tokenLCR = getMapToken(chain_id, SYMBOL_TOKEN.LCR);
    if (!tokenLCR) throw { error: `Token ${SYMBOL_TOKEN.LCR} not supported` };
    const addressLCR = tokenLCR.address;

    const tokenUSDT = getMapToken(chain_id, SYMBOL_TOKEN.USDT);
    if (!tokenUSDT) throw { error: `Token ${SYMBOL_TOKEN.LCR} not supported` };
    const addressUSDT = tokenUSDT.address;

    await processCheckAndBalanceRate({ chainId: chain_id, addressLCR, addressUSDT });

    return res.status(200).send(result);
  } catch (err) {
    res.status(500).send(err);
  }
});

export default router;
