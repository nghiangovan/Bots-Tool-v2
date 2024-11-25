import express from 'express';
import ConfigModel from '../../src/models/Config.js';
import { KEY_CONFIG } from '../../utils/enum.js';
import { BUFF_GASLIMT, BUFF_GAS_PRICE } from '../../utils/constant.js';

const router = express.Router();

router.get('/buff_gas_price/:chain_id', async (req, res) => {
  try {
    const chain_id = req.params.chain_id;
    let configBuffGasPrice = await ConfigModel.findOne({
      chain_id,
      key: KEY_CONFIG.buff_gas_price,
    });
    if (!configBuffGasPrice)
      configBuffGasPrice = await ConfigModel.create({
        chain_id,
        key: KEY_CONFIG.buff_gas_price,
        value: BUFF_GAS_PRICE?.toString(),
      });
    res.status(200).send({ buff_gas_price: configBuffGasPrice.value });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.post('/buff_gas_price/:chain_id', async (req, res) => {
  try {
    const chain_id = req.params.chain_id;
    const buff_gas_price = req.body.buff_gas_price;
    let configBuffGasPrice = await ConfigModel.findOne({
      chain_id,
      key: KEY_CONFIG.buff_gas_price,
    });
    if (!configBuffGasPrice)
      await ConfigModel.create({
        chain_id,
        key: KEY_CONFIG.buff_gas_price,
        value: buff_gas_price?.toString(),
      });
    else
      await ConfigModel.findOneAndUpdate(
        {
          chain_id,
          key: KEY_CONFIG.buff_gas_price,
        },
        { value: buff_gas_price },
      );
    res.status(200).send({ result: 'success' });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.get('/buff_gas_limit/:chain_id', async (req, res) => {
  try {
    const chain_id = req.params.chain_id;
    let configBuffGasLimit = await ConfigModel.findOne({
      chain_id,
      key: KEY_CONFIG.buff_gas_limit,
    });
    if (!configBuffGasLimit)
      configBuffGasLimit = await ConfigModel.create({
        chain_id,
        key: KEY_CONFIG.buff_gas_limit,
        value: BUFF_GASLIMT[chain_id] ? BUFF_GASLIMT[chain_id].toString() : 0,
      });
    res.status(200).send({ buff_gas_limit: configBuffGasLimit.value });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.post('/buff_gas_limit/:chain_id', async (req, res) => {
  try {
    const chain_id = req.params.chain_id;
    const buff_gas_limit = req.body.buff_gas_limit;
    let configBuffGasLimit = await ConfigModel.findOne({
      chain_id,
      key: KEY_CONFIG.buff_gas_limit,
    });
    if (!configBuffGasLimit)
      await ConfigModel.create({
        chain_id,
        key: KEY_CONFIG.buff_gas_limit,
        value: buff_gas_limit?.toString(),
      });
    else
      await ConfigModel.findOneAndUpdate(
        {
          chain_id,
          key: KEY_CONFIG.buff_gas_limit,
        },
        { value: buff_gas_limit },
      );
    res.status(200).send({ result: 'success' });
  } catch (err) {
    res.status(500).send(err);
  }
});

export default router;
