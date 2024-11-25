export const FORMAT_DATE = 'YYYY-MM-DD';
export const FORMAT_DATE_TIME = 'YYYY-MM-DD HH:mm:ss';

export function timestampNow() {
  return parseInt(Math.floor(Date.now() / 1000));
}

export function getMaxHour(numberUaw) {
  if (numberUaw > 500) return { number: 18, unit: 'hours' };
  if (numberUaw > 300) return { number: 15, unit: 'hours' };
  if (numberUaw > 200) return { number: 12, unit: 'hours' };
  if (numberUaw > 100) return { number: 10, unit: 'hours' };
  if (numberUaw > 90) return { number: 9, unit: 'hours' };
  if (numberUaw > 80) return { number: 8, unit: 'hours' };
  if (numberUaw > 70) return { number: 7, unit: 'hours' };
  if (numberUaw > 60) return { number: 6, unit: 'hours' };
  if (numberUaw > 50) return { number: 5, unit: 'hours' };
  if (numberUaw > 40) return { number: 4, unit: 'hours' };
  if (numberUaw > 30) return { number: 3, unit: 'hours' };
  if (numberUaw > 20) return { number: 2, unit: 'hours' };
  if (numberUaw > 10) return { number: 1, unit: 'hours' };
  return { number: 30, unit: 'minutes' };
}

export function checkOddOrEvenNumber(number) {
  return number % 2 == 0 ? 'even' : 'odd';
}
