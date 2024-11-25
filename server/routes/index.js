import express from 'express';
// import interactRouter = from './interact';
// import walletRouter = from './wallet';
const router = express.Router();

/* GET home page. */
router.get('/', async (req, res) => {
  // let schedule = await ScheduleModel.findById('6489e47f5fb5457c62607273');
  // schedule.jobs[0].run_at = moment().format(FORMAT_DATE_TIME)?.toString();
  // await schedule.save();
  // const schedules = await ScheduleModel.find();
  // console.log(moment(schedules[0].jobs[0].run_at).format(FORMAT_DATE_TIME));
  res.json({ success: 'ok' });
});

export default router;
