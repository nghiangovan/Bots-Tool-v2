import { exec } from 'child_process';
import { readdir as _readdir, unlink as _unlink, promises } from 'fs';
import moment from 'moment';
import path, { join } from 'path';
import { promisify } from 'util';
import { formatError } from '../../utils/format.js';
import { FORMAT_DATE } from '../../utils/time.js';
import LogModel from '../models/Log.js';
const execPromisified = promisify(exec);
const readdir = promisify(_readdir);
const unlink = promisify(_unlink);

export const backupAndManageDatabase = async (maxBackups = 5) => {
  const backupDirectory = 'database/backups';

  try {
    // Manage backups
    const files = (await readdir(backupDirectory)).filter(file => path.extname(file) === '.gzip');
    if (files.length >= maxBackups) {
      const filePaths = files.map(file => join(backupDirectory, file));
      const filePathsWithStat = await Promise.all(
        filePaths.map(async filePath => ({
          filePath,
          mtime: (await promises.stat(filePath)).mtime,
        })),
      );
      filePathsWithStat.sort((a, b) => a.mtime - b.mtime);
      await unlink(filePathsWithStat[0].filePath);
    }

    // Delete old data from LogModel
    const fiveDaysAgo = moment().subtract(5, 'days').format(FORMAT_DATE);
    const result = await LogModel.deleteMany({ date: { $lt: fiveDaysAgo } });
    console.log(`Deleted ${result.deletedCount} old documents from LogModel.`);

    // Backup database
    const { stdout } = await execPromisified(`docker/run-backups.sh`);
    console.log('Backup database completed:', stdout);
    return { status: true, error: null };
  } catch (error) {
    console.error('Backup database error:', error);
    return { status: false, error: formatError(error) };
  }
};
