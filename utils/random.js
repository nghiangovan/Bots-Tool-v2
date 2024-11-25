import moment from 'moment';
import { FORMAT_DATE_TIME } from './time.js';

export const randomMultipleFromArray = (array, num) => {
  const shuffled = [...array].sort(() => 0.5 - Math.random());

  return shuffled.slice(0, num);
};

export const randomOneFromArray = array => {
  const randomElement = array[Math.floor(Math.random() * array.length)];
  return randomElement;
};

export const randomIntBetween = (min, max) => {
  if (min > max) [min, max] = [max, min];
  return Math.floor(Math.random() * (max - min + 1) + min);
};

export const randomFloatBetween = (min, max) => {
  if (min > max) [min, max] = [max, min];
  return min + Math.random() * (max - min);
};

export const randomNumbersFromRange = (min, max, times) => {
  return [...Array(times)].map(() => randomIntBetween(min, max));
};

export const randomDatetimesFromRange = (start_datetime, end_datetime, num) => {
  const unix_start = Math.floor(start_datetime.unix());
  const unix_end = Math.floor(end_datetime.unix());
  const numbers = randomNumbersFromRange(unix_start, unix_end, num);
  return numbers.map(number => moment.unix(number).format(FORMAT_DATE_TIME));
};

export function shuffle(array) {
  let currentIndex = array.length,
    randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex != 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }

  return array;
}

export const normalizeRandom = x => {
  if (x < 10)
    if (Math.random() < 0.5) return Math.ceil(x * 1000) / 1000;
    else return 10;
  else if (x < 100)
    if (Math.random() < 0.6) return Math.ceil(x * 100) / 100;
    else return Math.ceil(x / 10) * 10;
  else {
    const factor = 10 ** (1 - parseInt(Math.floor(Math.log10(Math.abs(x)))));
    return Math.round(x * factor) / factor;
  }
};

export const geoRandom = (height, p = 0.9) => {
  return Math.min(10000.0, (height * 2.1 * Math.log(Math.random())) / Math.log(1 - p));
};
