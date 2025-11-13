import { createObjectCsvWriter } from "csv-writer";
import fs from "fs";

// Function to write OCR results to a CSV file
export async function writeCsv(results, outputPath = "./output/result.csv") {
  // Ensure the output directory exists
  if (!fs.existsSync("./output")) fs.mkdirSync("./output");

  // Initialize the CSV writer with dynamic headers based on results keys
  const csvWriter = createObjectCsvWriter({
    path: outputPath,
    header: Object.keys(results).flatMap((key) => [
      { id: `${key}_text`, title: key },        // Column for OCR text of the field
      { id: `${key}_conf`, title: `${key}_conf` } // Column for OCR confidence of the field
    ])
  });

  // Prepare a single record object to write to the CSV
  const record = {};
  for (const [key, val] of Object.entries(results)) {
    record[`${key}_text`] = val.text; // Store the OCR text
    record[`${key}_conf`] = val.confidence.toFixed(2); // Store the confidence, rounded to 2 decimals
  }

  // Write the record to the CSV file
  await csvWriter.writeRecords([record]);
  console.log(`CSV saved to ${outputPath}\n`);
}
