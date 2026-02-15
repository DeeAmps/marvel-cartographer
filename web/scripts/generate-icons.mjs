/**
 * Generate PWA icon set from SVG source using sharp (bundled with Next.js).
 *
 * Usage: node scripts/generate-icons.mjs
 */
import sharp from "sharp";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = join(__dirname, "..", "public", "icons");
const SVG_PATH = join(ICONS_DIR, "icon.svg");

const STANDARD_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const MASKABLE_SIZES = [192, 512];

async function generateIcons() {
  const svgBuffer = readFileSync(SVG_PATH);
  const svgString = readFileSync(SVG_PATH, "utf-8");

  // Generate standard icons
  for (const size of STANDARD_SIZES) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(join(ICONS_DIR, `icon-${size}x${size}.png`));
    console.log(`Generated: icon-${size}x${size}.png`);
  }

  // Generate maskable icons (with 10% padding for safe zone)
  for (const size of MASKABLE_SIZES) {
    const padding = Math.round(size * 0.1);
    const innerSize = size - padding * 2;

    // Render the SVG at the inner size, then composite on a padded background
    const innerPng = await sharp(svgBuffer)
      .resize(innerSize, innerSize)
      .png()
      .toBuffer();

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 8, g: 9, b: 13, alpha: 1 }, // #08090d
      },
    })
      .composite([{ input: innerPng, left: padding, top: padding }])
      .png()
      .toFile(join(ICONS_DIR, `icon-maskable-${size}x${size}.png`));
    console.log(`Generated: icon-maskable-${size}x${size}.png`);
  }

  // Apple Touch Icon (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(join(ICONS_DIR, "apple-touch-icon.png"));
  console.log("Generated: apple-touch-icon.png");

  // Favicon PNGs
  for (const size of [16, 32]) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(join(ICONS_DIR, `favicon-${size}x${size}.png`));
    console.log(`Generated: favicon-${size}x${size}.png`);
  }

  // Generate favicon.ico (32x32 PNG renamed — browsers accept PNG favicons)
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(join(ICONS_DIR, "..", "favicon.png"));
  console.log("Generated: favicon.png");

  console.log("\nAll icons generated successfully!");
}

generateIcons().catch(console.error);
