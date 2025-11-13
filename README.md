# OCR Proof of Concept

This is a simple, **non-scalable proof of concept** for extracting fields from a scanned document and exporting them to CSV.

---

## 🧠 Goal
Demonstrate that OCR field extraction and CSV export work correctly for a fixed template.

---

## ⚙️ How to Run
1. Install dependencies:
   ```bash
   npm install
2. Run the main program:
   ```bash
   npm start

## Solution

# OCR Pipeline

Extract structured data from a single sample image using **Tesseract.js** and Node.js, with preprocessing, confidence tracking, and CSV export.

## Features

- **Field-Specific OCR:** Crops and recognizes each field based on coordinates from `template.json`.
- **Image Preprocessing:** Uses **Sharp** for grayscale conversion, noise reduction, sharpening, and brightness/contrast adjustment. Numeric fields get extra upscaling and thresholding to improve digit recognition.
- **Confidence & Review:** Each OCR result includes a confidence score. Low-confidence fields (<80) are flagged for human review. Empty fields are marked `/` and are not flagged.
- **CSV Export:** Uses `csv-writer` to save results as a single row per image, with separate columns for text and confidence for each field.

## Output

- `./output/preprocessed_clean.png` – preprocessed full image.
- `./output/crops/{field}.png` – cropped and preprocessed fields for debugging.
- `./output/result.csv` – CSV file containing OCR results.
- `./output/debug-boxes.png` – Overlay image of the boxes in template.json file over the sample image

## Field Handling

- **Numeric fields:** `hr_`, `bp_`, `rr_`, `urine`, `temperature`, `oxygen`.
- **Observation text fields:** fields ending with `_obs`.
- **Default fields:** all other fields.

## Workflow

1. Provide a single sample image.  
2. OCR processes each field, calculates confidence, and flags low-confidence fields.  
3. Outputs debug crops, preprocessed image, and CSV for easy inspection and review.

## Usage Example

```javascript
import { processImage } from "./processImage.js";
import { writeCsv } from "./writeCsv.js";

const results = await processImage("./sample-image.png");
await writeCsv(results);
