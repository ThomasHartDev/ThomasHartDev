// Builds Selected Work card assets (PNG + SMIL-animated SVG) from portfolio heroes.
// Clean screenshot tiles only: no fake browser chrome, no bottom CTA bars.
// Run: node scripts/build-work-cards.mjs
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
/** @type {typeof import("sharp")} */
let sharp;
try {
  sharp = require("sharp");
} catch {
  try {
    sharp = require("/root/command-center/node_modules/sharp");
  } catch {
    console.error("sharp not found. Install it or set NODE_PATH to a tree that has it.");
    process.exit(1);
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "assets");

const W = 640;
const H = 400;
const radius = 14;

/** @param {string} s */
function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Flat screenshot PNG with rounded corners + thin border.
 * @param {{ input: string, title: string, url: string, accent: string, pngName: string }} c
 */
async function makePng(c) {
  const shot = await sharp(c.input)
    .resize(W, H, { fit: "cover", position: "top" })
    .png()
    .toBuffer();

  const mask = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" rx="${radius}" ry="${radius}" fill="#fff"/>
</svg>`);

  const border = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0.75" y="0.75" width="${W - 1.5}" height="${H - 1.5}" rx="${radius}" ry="${radius}"
        fill="none" stroke="${c.accent}" stroke-opacity="0.45" stroke-width="1.5"/>
</svg>`);

  await sharp(shot)
    .composite([
      { input: mask, blend: "dest-in" },
      { input: border, top: 0, left: 0 },
    ])
    .png({ compressionLevel: 9 })
    .toFile(path.join(outDir, c.pngName));
}

/**
 * Animated SVG tile: screenshot only + soft border pulse (no chrome / no footer bar).
 * @param {{ input: string, title: string, url: string, accent: string, outName: string }} c
 */
async function makeAnimatedSvg(c) {
  const embed = await sharp(c.input)
    .resize(W, H, { fit: "cover", position: "top" })
    .jpeg({ quality: 78 })
    .toBuffer();
  const b64 = embed.toString("base64");
  const host = c.url.replace(/^https?:\/\//, "");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(c.title)} — ${esc(host)}">
  <defs>
    <clipPath id="frame"><rect width="${W}" height="${H}" rx="${radius}" ry="${radius}"/></clipPath>
  </defs>
  <g clip-path="url(#frame)">
    <rect width="${W}" height="${H}" fill="#0a121c"/>
    <image width="${W}" height="${H}" preserveAspectRatio="xMidYMin slice" href="data:image/jpeg;base64,${b64}" xlink:href="data:image/jpeg;base64,${b64}"/>
  </g>
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="${radius - 1}" ry="${radius - 1}" fill="none" stroke="${c.accent}" stroke-opacity="0.35" stroke-width="2">
    <animate attributeName="stroke-opacity" values="0.2;0.65;0.2" dur="2.8s" repeatCount="indefinite"/>
  </rect>
</svg>`;

  fs.writeFileSync(path.join(outDir, c.outName), svg);
}

const cards = [
  {
    input: path.join(root, "assets/sources/fs-hero.png"),
    title: "Forbidden Street",
    url: "https://forbidden-street.com",
    accent: "#B23A48",
    outName: "work-fs.svg",
    pngName: "work-fs.png",
  },
  {
    input: path.join(root, "assets/sources/pa-hero.webp"),
    title: "Photo Atlas",
    url: "https://photo-atlas.com",
    accent: "#2F6FED",
    outName: "work-photo-atlas.svg",
    pngName: "work-photo-atlas.png",
  },
  {
    input: path.join(root, "assets/sources/ss-hero.webp"),
    title: "Subsecond Studio",
    url: "https://subsecondstudio.com",
    accent: "#C45C26",
    outName: "work-subsecond-studio.svg",
    pngName: "work-subsecond-studio.png",
  },
];

for (const c of cards) {
  if (!fs.existsSync(c.input)) {
    console.error("missing source image:", c.input);
    process.exit(1);
  }
  await makePng(c);
  await makeAnimatedSvg(c);
  const svgKb = (fs.statSync(path.join(outDir, c.outName)).size / 1024).toFixed(1);
  const pngKb = (fs.statSync(path.join(outDir, c.pngName)).size / 1024).toFixed(1);
  console.log(`${c.title}: ${c.outName} ${svgKb}kb, ${c.pngName} ${pngKb}kb`);
}
