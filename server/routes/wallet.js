import express from 'express';
import { auth } from '../middleware/auth.js';
import Wallet from '../../src/models/Wallet.js';
import { PAGE_SIZE } from '../../utils/constant.js';

const router = express.Router();

//GET ALL Wallet
router.get('/', auth, async (req, res) => {
  try {
    let { page, size } = req.query;
    if (!page) page = 1;
    else page = parseInt(page);
    if (!size) size = PAGE_SIZE;
    else size = parseInt(size);
    const limit = parseInt(size);
    const skip = (page - 1) * size;

    let objFilter = {};
    if (req.query?.chain_id) objFilter['chain_id'] = req.query.chain_id;
    if (req.query?.address) objFilter['address'] = { $regex: new RegExp('^' + req.query.address.toLowerCase(), 'i') };
    if (req.query?.index) objFilter['index'] = req.query.index;
    if (req.query?.is_using) objFilter['is_using'] = req.query.is_using;

    const wllets = await Wallet.find({ ...objFilter })
      .limit(limit)
      .skip(skip)
      .sort({ index: 1 });

    const total_documents = await Wallet.countDocuments({ ...objFilter });
    const total_pages = Math.ceil(total_documents / size);

    const previous_pages = page - 1;
    const next_pages = Math.ceil((total_documents - skip) / size);

    res.status(200).send({ data: wllets, page, size, previous_pages, next_pages, total_pages });
  } catch (err) {
    res.status(500).send(err);
  }
});

export default router;
