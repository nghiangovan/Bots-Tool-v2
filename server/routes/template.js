import express from 'express';
import { auth } from '../middleware/auth.js';
import TemplateModel from '../../src/models/Template.js';
import { PAGE_SIZE } from '../../utils/constant.js';

const router = express.Router();

//GET ALL Template
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
    if (req.query?.number_jobs) objFilter['number_jobs'] = req.query.number_jobs;
    if (req.query?.number_wallets) objFilter['number_wallets'] = req.query.number_wallets;
    if (req.query?.name) objFilter['name'] = { $regex: req.query.name.toLowerCase() };

    const templates = await TemplateModel.find({ ...objFilter })
      .sort({ _id: 1 })
      .limit(limit)
      .skip(skip);

    const total_documents = await TemplateModel.countDocuments({ ...objFilter });
    const total_pages = Math.ceil(total_documents / size);

    const previous_pages = page - 1;
    const next_pages = Math.ceil((total_documents - skip) / size);

    res.status(200).send({ data: templates, page, size, previous_pages, next_pages, total_pages });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const templates = await TemplateModel.find({
      name: req.body.name,
    });
    if (templates.length) {
      const updatedTemplate = await TemplateModel.findOneAndUpdate(
        { name: req.body.name },
        {
          $set: req.body,
        },
        { new: true },
      );
      res.status(200).send(updatedTemplate);
    } else {
      const newTemplate = new TemplateModel(req.body);
      const savedTemplate = await newTemplate.save();
      res.status(200).send(savedTemplate);
    }
  } catch (err) {
    res.status(500).send(err);
  }
});

//DELETE
router.delete('/:name', auth, async (req, res) => {
  try {
    await TemplateModel.findOneAndDelete({ name: req.params.name });
    res.status(200).send({ result: true, msg: `Template name "${req.params.name}" has been deleted` });
  } catch (err) {
    res.status(500).send(err);
  }
});

export default router;
