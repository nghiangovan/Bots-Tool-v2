import fastcsv from 'fast-csv';

export async function exportArrayToCsv({ data, columns, fileName }) {
  fastcsv
    .writeToPath(
      fileName,
      data.map(item => columns.reduce((obj, key) => ({ ...obj, [key]: item[key] }), {})),
      { headers: true },
    )
    .on('finish', () => console.log(`Write to ${fileName} successfully!`));
}
