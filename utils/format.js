import { ethers } from 'ethers';

export function etherToWei(numberEther) {
  try {
    numberEther = numberEther?.toString();

    // Check if number of decimals exceeds 18
    const parts = numberEther.split('.');
    if (parts.length > 1 && parts[1].length > 18) {
      // Trim string to only include up to 18 decimal places
      numberEther = parts[0] + '.' + parts[1].substring(0, 18);
    }

    return ethers.utils.parseEther(numberEther);
  } catch (error) {
    console.log(error);
    throw false;
  }
}

export function etherToWeiUnit(numberEther, decimals) {
  try {
    numberEther = numberEther?.toString();

    // Check if number of decimals exceeds 18
    const parts = numberEther.split('.');
    if (parts.length > 1 && parts[1].length > 18) {
      // Trim string to only include up to 18 decimal places
      numberEther = parts[0] + '.' + parts[1].substring(0, 18);
    }

    return ethers.utils.parseUnits(numberEther, decimals);
  } catch (error) {
    console.log(error);
    throw false;
  }
}

export function weiToEther(numberWei) {
  try {
    numberWei = numberWei?.toString();
    return ethers.utils.formatEther(numberWei);
  } catch (error) {
    console.log(error);
    throw false;
  }
}

export function weiToEtherUnit(numberWei, decimals) {
  try {
    numberWei = numberWei?.toString();
    return ethers.utils.formatUnits(numberWei, decimals);
  } catch (error) {
    console.log(error);
    throw false;
  }
}

export function formatError(error) {
  return error instanceof Error
    ? `Error - [ code: ${error?.code} ] - [ reason: ${
        error?.reason
      } ] - [ error: ${error?.error?.toString()} ] - [ stack: ${error.stack
        .split(/\n| at /)
        .map(line => (line.startsWith('at') ? `\nat  ${line}` : `\n  ${line}`))
        .join('')} ]`
    : JSON.stringify(error);
}

export function formatFloorNumber(amount) {
  return Math.floor(amount * 100) / 100;
}

export function formatFloorNearest(num) {
  const numString = num.toString();
  const decimals = numString.split('.')[1]?.split('') || [];
  let decimalPlaces = 1;
  for (let i = 0; i < decimals.length; i++) {
    if (decimals[i] <= 0) decimalPlaces++;
    if (decimals[i] > 0) break;
  }
  if (decimalPlaces == 1 && decimals.length > 2) decimalPlaces = 2;

  const precision = Math.pow(10, decimalPlaces);

  return Math.floor(num * precision) / precision;
}

export function formatCeilNearest(num) {
  const numString = num.toString();
  const decimals = numString.split('.')[1]?.split('') || [];
  let decimalPlaces = 1;
  for (let i = 0; i < decimals.length; i++) {
    if (decimals[i] <= 0) decimalPlaces++;
    if (decimals[i] > 0) break;
  }
  if (decimalPlaces == 1 && decimals.length > 2) decimalPlaces = 2;

  const precision = Math.pow(10, decimalPlaces);

  return Math.ceil(num * precision) / precision;
}

export function roundDownToNearestAuto(num) {
  let precision = 1;

  if (num > 0 && num < 1) {
    const numString = num.toString();
    const decimals = numString.split('.')[1].split('');
    let decimalPlaces = 1;
    for (let i = 0; i < decimals.length; i++) {
      if (decimals[i] <= 0) decimalPlaces++;
      if (decimals[i] > 0) break;
    }
    precision = Math.pow(10, decimalPlaces);
  }

  return Math.floor(num * precision) / precision;
}

export function roundUpToNearestAuto(num) {
  let precision = 1;

  if (num > 0 && num < 1) {
    const numString = num.toString();
    const decimals = numString.split('.')[1].split('');
    let decimalPlaces = 1;
    for (let i = 0; i < decimals.length; i++) {
      if (decimals[i] <= 0) decimalPlaces++;
      if (decimals[i] > 0) break;
    }
    precision = Math.pow(10, decimalPlaces);
  }

  return Math.ceil(num * precision) / precision;
}
