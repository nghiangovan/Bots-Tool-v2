import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import fs_extra from 'fs-extra';

const pathToMap = 'chain-info/deployments/map.json';

export function writeNewToFile(fileName, data) {
  writeFileSync(fileName, JSON.stringify(data, null, 4), 'utf-8');
}

export function writeNewToFileWithCreateFolder(path, fileName, data) {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
  writeFileSync(`${path}/${fileName}`, JSON.stringify(data, null, 4), 'utf-8');
}

export function moveFile(sourcePath, desPath, nameFile) {
  if (!existsSync(desPath)) {
    mkdirSync(desPath, { recursive: true });
  }
  renameSync(sourcePath, `${desPath}/${nameFile}`);
}

export function moveFolder(sourcePath, desPath) {
  fs_extra.move(sourcePath, desPath, err => {
    if (err) return console.error(err);
    console.log('move foler success!');
  });
}

export function getDataByFile(fileName) {
  try {
    const rawData = readFileSync(fileName, 'utf8');
    const data = JSON.parse(rawData);
    return data;
  } catch (error) {
    return false;
  }
}

export const getAddressFromMapJson = (chainId, nameContract) => {
  try {
    if (existsSync(pathToMap)) {
      chainId = typeof chainId != 'string' ? chainId?.toString() : chainId;
      let rawdata = readFileSync(pathToMap);
      let contractAddress = JSON.parse(rawdata);
      return contractAddress[chainId]
        ? contractAddress[chainId][nameContract]
          ? contractAddress[chainId][nameContract][0]
          : null
        : null;
    }
    return null;
  } catch (err) {
    console.error(err);
  }
};
