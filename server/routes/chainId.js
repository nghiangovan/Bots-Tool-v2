import express from 'express';
import { auth } from '../middleware/auth.js';
import ChainIdModel from '../../src/models/ChainId.js';

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const chainsId = await ChainIdModel.find({ ...req.query });
    res.status(200).send({ data: chainsId });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const ChainIds = await ChainIdModel.find({
      chain_id: req.body.chain_id,
    });
    if (ChainIds.length) {
      const updatedChainId = await ChainIdModel.findOneAndUpdate(
        { chain_id: req.body.chain_id },
        {
          $set: req.body,
        },
        { new: true },
      );
      res.status(200).send(updatedChainId);
    } else {
      const newChainId = new ChainIdModel(req.body);
      const savedChainId = await newChainId.save();
      res.status(200).send(savedChainId);
    }
  } catch (err) {
    res.status(500).send(err);
  }
});

export default router;
