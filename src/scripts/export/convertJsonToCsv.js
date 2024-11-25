import fs from 'fs';
import { parse } from 'json2csv';

export function main(jsonFilePath, csvFilePath) {
  // Load the JSON file
  const data = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));

  // Convert the JSON to CSV
  const csv = parse(data);

  // Write the CSV data to a file
  fs.writeFileSync(csvFilePath, csv);
}

main('src/scripts/export/result.json', 'src/scripts/export/result.csv');
