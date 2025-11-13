import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { createWorker } from "tesseract.js";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load template
const template = JSON.parse(fs.readFileSync(path.join(__dirname, "template.json"), "utf8"));

// Initialize Tesseract worker
const worker = await createWorker("eng");

// Whitelists
const NUMERIC_WHITELIST = "0123456789/.:%";
const TEXT_WHITELIST = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ";
const DEFAULT_WHITELIST = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789,./:;()-°% ";

//Confidence threshold
const CONFIDENCE_THRESHOLD = 80; // anything below this triggers manual review

// Field type detection
const isNumericField = (field) =>
  (field.startsWith("bp_") ||
    field.startsWith("hr_") ||
    field.startsWith("rr_") ||
    field.startsWith("urine") ||
    field.includes("temperature") ||
    field.includes("oxygen")) &&
  !field.endsWith("_obs");

const isObsField = (field) => field.endsWith("_obs");

// --- Preprocess full image ---
async function preprocessImage(imagePath, width, height) {
  const buffer = await sharp(imagePath)
    .resize(width, height, { fit: "fill" })
    .grayscale()
    .flatten({ background: {r:255,g:255,b:255} })
    .median(1)
    .normalize()
    .modulate({ brightness: 1.1, contrast: 1.2 })
    .gamma(1.05)
    .sharpen({ sigma: 0.4 })
    .toBuffer();

  fs.mkdirSync("./output", { recursive: true });
  await sharp(buffer).toFile("./output/preprocessed_clean.png");

  return buffer;
}

// --- Preprocess field crop ---
async function preprocessFieldCrop(buffer, box, numeric = false) {
  let crop = sharp(buffer)
    .extract({ left: box.x, top: box.y, width: box.w, height: box.h })
    .extend({ top: 2, bottom: 2, left: 2, right: 2, background: {r:255,g:255,b:255}  });

  if (numeric) {
    crop = crop
      .resize(box.w * 4, box.h * 4) // upscale for faint digits
      .threshold(171) // make digits solid
      .modulate({ brightness: 1.3, contrast: 1.5 })
      .sharpen({ sigma: 1.55 });
  } else {
    crop = crop.resize(box.w * 2, box.h * 2);
  }

  return crop.toBuffer();
}

// --- Get OCR config ---
function getOcrConfig(field) {
  if (isNumericField(field)) return { whitelist: NUMERIC_WHITELIST, psm: 7 };
  if (isObsField(field)) return { whitelist: TEXT_WHITELIST, psm: 7 };
  return { whitelist: DEFAULT_WHITELIST, psm: 6 };
}

// --- Main processing function ---
export async function processImage(imagePath) {
  console.log("Processing:", imagePath);
  const results = {};
  const missingFields = [];
  const lowConfidenceFields = [];

  const buffer = await preprocessImage(
    imagePath,
    template.canonicalSize.width,
    template.canonicalSize.height
  );

  for (const [field, box] of Object.entries(template.fields)) {
    const numeric = isNumericField(field);
    const cropBuffer = await preprocessFieldCrop(buffer, box, numeric);
    let needsReview = false;

    fs.mkdirSync("./output/crops", { recursive: true });
    await sharp(cropBuffer).toFile(`./output/crops/${field}.png`);

    const { whitelist, psm } = getOcrConfig(field);

    await worker.setParameters({
      tessedit_pageseg_mode: psm,
      tessedit_char_whitelist: whitelist,
      preserve_interword_spaces: "1",
    });

    const { data } = await worker.recognize(cropBuffer);
    let text = data.text ? data.text.trim().replace(/\s+/g, " ") : "";
    let confidence = data.confidence ? Number(data.confidence.toFixed(2)) : 0;
    // Flag fields for human review if confidence is low
    if (confidence < CONFIDENCE_THRESHOLD && confidence!=0) {
      needsReview = true;
      lowConfidenceFields.push(field)
    }

    if (!text) {
      text = "/"; // fallback
      missingFields.push(field);
    }

    results[field] = {
      text,
      confidence,
      needsReview
    };
  }

  console.log("OCR complete!");
  if (missingFields.length > 0) {
    console.log(`Missing fields (${missingFields.length}): ${missingFields.join(", ")}`);
  } else {
    console.log("All fields detected successfully!");
  }

  if(lowConfidenceFields.length > 0){
    console.log(`Low confidence fields detected (${lowConfidenceFields.length}): ${lowConfidenceFields.join(", ")}`);
  }

  return results;
}
