import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const templatePath = path.join(__dirname, "template.json");
const template = JSON.parse(fs.readFileSync(templatePath, "utf8"));

/**
 * Draws translucent red boxes and optionally field labels over the base form image.
 * Saves result to ./output/debug-boxes.png
 */
export async function drawBoxes(
  inputPath,
  outputPath = "./output/debug-boxes.png"
) {
  const { width, height } = template.canonicalSize;

  // Resize base image to canonical dimensions (contain = no cropping)
  const base = await sharp(inputPath)
    .resize(width, height, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255 }
    })
    .toBuffer();

  // Create a Sharp canvas to draw labels on
  const overlays = [];

  // For each field in template.json, make a semi-transparent red rectangle
  for (const [name, box] of Object.entries(template.fields)) {
    // Rectangle overlay
    overlays.push({
      input: {
        create: {
          width: box.w,
          height: box.h,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 0.25 }
        }
      },
      left: box.x,
      top: box.y
    });

    // Uncomment to also see the names of the fields associated
    // Label overlay as a small text PNG
    /*const labelSvg = Buffer.from(`
      <svg width="${box.w}" height="20">
        <style>
          text { fill: #000; font-size: 12px; font-family: Arial, sans-serif; }
        </style>
        <rect width="100%" height="100%" fill="white" fill-opacity="0.6"/>
        <text x="2" y="14">${name}</text>
      </svg>
    `);

    overlays.push({
      input: labelSvg,
      left: box.x,
      top: Math.max(box.y - 18, 0) // place label slightly above the box
    });*/
  }

  // Compose all overlays over base image
  const result = await sharp(base).composite(overlays).png().toBuffer();

  // Ensure output folder exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Save result
  await sharp(result).toFile(outputPath);
  console.log(`Debug overlay image saved → ${outputPath}`);
}
