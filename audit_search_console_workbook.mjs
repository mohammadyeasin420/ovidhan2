/** Read a Google Search Console XLSX export without modifying it. */

import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  throw new Error("Usage: node audit_search_console_workbook.mjs INPUT.xlsx OUTPUT.json");
}

const expectedSheets = [
  "Chart",
  "Queries",
  "Pages",
  "Countries",
  "Devices",
  "Search appearance",
  "Filters",
];

const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);
const sheetInspection = await workbook.inspect({
  kind: "sheet",
  include: "id,name",
  maxChars: 10000,
});

const sheets = {};
for (const sheetName of expectedSheets) {
  const sheet = workbook.worksheets.getItem(sheetName);
  const usedRange = sheet.getUsedRange();
  sheets[sheetName] = {
    address: usedRange.address,
    values: usedRange.values,
    formulas: usedRange.formulas,
  };
}

const output = {
  sourceWorkbook: inputPath,
  expectedSheets,
  sheetInspection: sheetInspection.ndjson,
  sheets,
};
await fs.writeFile(outputPath, JSON.stringify(output), "utf8");
console.log(
  JSON.stringify(
    Object.fromEntries(
      Object.entries(sheets).map(([name, data]) => [name, { address: data.address, rows: data.values.length }]),
    ),
    null,
    2,
  ),
);
