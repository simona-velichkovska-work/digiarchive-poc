import { processImage } from "./ocr.js";
import { writeCsv } from "./csvWriter.js";
import { drawBoxes } from "./debugOverlay.js";

// Main function that starts the proof of concept program
async function run() {
  try {
    console.log("Generating debug overlay...");

    //Create the debug overlay image from the sample image
    await drawBoxes("./examples/sample.png");
    
    console.log("Starting OCR proof of concept...\n");
    const results = await processImage("./examples/sample.png");

    //Create the table of contents in the console for better visual representation
    console.table(results);

    //Use the CSV writer to create the CSV file
    await writeCsv(results);

    console.log("Done!");
  } catch (err) {
    console.error("Error:", err.message);
  }
}

run();
