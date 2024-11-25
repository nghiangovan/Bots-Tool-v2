import axios from 'axios';
import { SLACK_NOTI, SLACK_NOTI_BACKEND_TEAM } from './constant.js';

export const sendNoti = async (...messages) => {
  const slack_noti = SLACK_NOTI;
  try {
    return await axios.post(slack_noti, {
      text: `${messages.join(' ')}`,
    });
  } catch (e) {
    console.log('sendNoti', e);
  }
};

export const sendNotiBackendTeam = async (...messages) => {
  const slack_noti_backend_team = SLACK_NOTI_BACKEND_TEAM;
  try {
    return await axios.post(slack_noti_backend_team, {
      text: `${messages.join(' ')}`,
    });
  } catch (e) {
    console.log('sendNotiBackendTeam', e);
  }
};

export const sleep = millis => new Promise(resolve => setTimeout(resolve, millis));
