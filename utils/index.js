/* eslint-disable no-undef */
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import JSONbig from 'json-bigint';
import moment from 'moment';

export const sendNotiFile = async (channelId, message, filePath) => {
  try {
    const SLACK_BOT_TOKEN = process.env.ADMIN_KEY;

    const form = new FormData();
    form.append('file', fs.readFileSync(filePath), filePath);
    form.append('initial_comment', `${message}`);
    form.append('channels', channelId);

    return await axios.post('https://slack.com/api/files.upload', form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      },
    });
  } catch (e) {
    return { ok: false, error: e };
  }
};

export const writeToFile = (fileName, data) => {
  fs.writeFileSync(fileName, JSON.stringify(data, null, 4), 'utf-8');
};

export const writeToFileWithCreateFolder = (path, fileName, data) => {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path, { recursive: true });
  }
  fs.writeFileSync(`${path}/${fileName}`, JSON.stringify(data, null, 4), 'utf-8');
};

export const getDatasByFile = fileName => {
  const data = fs.readFileSync(fileName, 'utf8');
  return JSONbig.parse(data);
};

export const readFileByLines = path => {
  const data = fs.readFileSync(path)?.toString().split('\n');
  return data;
};

export const makeid = length => {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
};

export function isValidNumber(value) {
  const valid = value != '' && /^\d*\.?\d*$/.test(value);
  if (valid) {
    return true;
  }
  return false;
}

export const arrayRange = ({ start, stop, step }) =>
  Array.from({ length: (stop - start) / step + 1 }, (_, index) => start + index * step);

export const logUAW = (filename, data) => {
  const day = moment().utc().format('YYYY-MM-DD');
  if (!fs.existsSync(`logs/${day}`)) {
    fs.mkdirSync(`logs/${day}`, { recursive: true });
  }
  fs.appendFileSync(`logs/${day}/log_${filename}.txt`, `${new Date().toLocaleString()}: ${data}\n`);
};
