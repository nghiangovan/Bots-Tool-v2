import express from 'express';
import LogModel from '../../src/models/Log.js';
import { PAGE_SIZE } from '../../utils/constant.js';
import { NAME_JOB } from '../../utils/enum.js';
import ReportExecuteModel from '../../src/models/ReportExecute.js';
import { cacheKpiServerFromLogsToReportExecute } from '../../src/handlers/functions.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    let { page, size } = req.query;
    if (!page) page = 1;
    else page = parseInt(page);
    if (!size) size = PAGE_SIZE;
    else size = parseInt(size);
    const limit = parseInt(size);
    const skip = (page - 1) * size;

    let filter = {};
    if (req.query?.chain_id) filter.chain_id = req.query.chain_id;
    if (req.query?.date) filter.date = req.query.date;

    if (req.query?.from_date) {
      filter.date = {
        $gte: req.query.from_date,
      };
    }

    if (req.query?.to_date) {
      filter.date = req.query.from_date
        ? {
            $gte: req.query.from_date,
            $lte: req.query.to_date,
          }
        : {
            $lte: req.query.to_date,
          };
    }

    if (req.query?.types) {
      filter.type = { $in: req.query.types };
    }

    if (req.query?.from_wallet) filter.wallet_address_1 = { $regex: req.query.from_wallet.toLowerCase() };

    if (req.query?.to_wallet) filter.wallet_address_2 = { $regex: req.query.to_wallet.toLowerCase() };

    if (req.query?.token_in) filter.token_in = { $regex: req.query.token_in.toLowerCase() };

    if (req.query?.token_out) filter.token_out = { $regex: req.query.token_out.toLowerCase() };

    const logs = await LogModel.find({ ...filter })
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total_documents = await LogModel.countDocuments({ ...filter });
    const total_pages = Math.ceil(total_documents / size);

    const previous_pages = page - 1;
    const next_pages = Math.ceil((total_documents - skip) / size);

    res.status(200).send({ data: logs, page, size, previous_pages, next_pages, total_pages });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.get('/kpi_server', async (req, res) => {
  try {
    let { page, size } = req.query;
    if (!page) page = 1;
    else page = parseInt(page);
    if (!size) size = PAGE_SIZE;
    else size = parseInt(size);
    const limit = parseInt(size);
    const skip = (page - 1) * size;
    let chain_id = '56';
    if (req.query?.chain_id) chain_id = req.query.chain_id;

    await cacheKpiServerFromLogsToReportExecute({ chainId: chain_id });

    const logs_uaw = await ReportExecuteModel.find({ chain_id }).skip(skip).limit(limit).sort({ date: -1 });

    const total_documents = await ReportExecuteModel.countDocuments({ chain_id });
    const total_pages = Math.ceil(total_documents / size);

    const previous_pages = page - 1;
    const next_pages = Math.ceil((total_documents - skip) / size);

    res.status(200).send({ data: logs_uaw, page, size, previous_pages, next_pages, total_pages });
  } catch (err) {
    res.status(500).send(err);
  }
});

router.get('/most_recent_skim', async (req, res) => {
  try {
    let chain_id = '56';
    if (req.query?.chain_id) chain_id = req.query.chain_id;

    const recent_skim = await LogModel.findOne({
      chain_id,
      type: { $in: [NAME_JOB.fake_actives.execute_fake_actives, NAME_JOB.fake_actives.execute_fake_actives_free_coin] },
      status: true,
    })
      .sort({ createdAt: -1 })
      .limit(1);

    res.status(200).send({ data: recent_skim });
  } catch (err) {
    res.status(500).send(err);
  }
});

export default router;
