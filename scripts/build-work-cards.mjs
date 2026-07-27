// Builds Selected Work card assets (PNG + SMIL-animated SVG) from portfolio heroes.
// Run: node scripts/build-work-cards.mjs
// GH README cannot do true CSS :hover on <img>; SVGs use a border/CTA pulse instead.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// sharp is not a hard dep of this repo (assets are committed). Resolve from
// local install or a sibling monorepo path when regenerating cards.
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
const chromeH = 36;
const labelH = 64;
const shotH = H - chromeH - labelH;
const radius = 18;

/** @param {string} s */
function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** @param {string} url */
function displayHost(url) {
  return url.replace(/^https?:\/\//, "");
}

/**
 * @param {{ input: string, title: string, url: string, accent: string, pngName: string }} c
 */
async function makePng(c) {
  const shot = await sharp(c.input)
    .resize(W - 2, shotH, { fit: "cover", position: "top" })
    .png()
    .toBuffer();

  const host = displayHost(c.url);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="chrome" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1a2433"/>
      <stop offset="1" stop-color="#121a26"/>
    </linearGradient>
    <linearGradient id="label" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#0E1C2E"/>
      <stop offset="1" stop-color="#152536"/>
    </linearGradient>
    <clipPath id="frame">
      <rect x="0" y="0" width="${W}" height="${H}" rx="${radius}" ry="${radius}"/>
    </clipPath>
  </defs>
  <g clip-path="url(#frame)">
    <rect width="${W}" height="${chromeH}" fill="url(#chrome)"/>
    <circle cx="22" cy="18" r="5" fill="#ff5f57"/>
    <circle cx="40" cy="18" r="5" fill="#febc2e"/>
    <circle cx="58" cy="18" r="5" fill="#28c840"/>
    <rect x="90" y="10" width="${W - 110}" height="16" rx="8" fill="#0a121c" stroke="#ffffff" stroke-opacity="0.08"/>
    <text x="106" y="21.5" fill="#8FA1B6" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="10">${esc(host)}</text>
    <rect y="${H - labelH}" width="${W}" height="${labelH}" fill="url(#label)"/>
    <rect y="${H - labelH}" width="${W}" height="1" fill="#ffffff" fill-opacity="0.08"/>
    <text x="24" y="${H - 38}" fill="#F3EDE3" font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif" font-size="20" font-weight="700">${esc(c.title)}</text>
    <text x="24" y="${H - 16}" fill="#8FA1B6" font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif" font-size="13">Open live site</text>
    <rect x="${W - 148}" y="${H - 46}" width="124" height="28" rx="14" fill="${c.accent}"/>
    <text x="${W - 86}" y="${H - 27}" text-anchor="middle" fill="#F3EDE3" font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif" font-size="13" font-weight="600">Visit site →</text>
    <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="${radius}" fill="none" stroke="#ffffff" stroke-opacity="0.12"/>
  </g>
</svg>`;

  const base = await sharp({
    create: {
      width: W,
      height: H,
      channels: 4,
      background: { r: 10, g: 18, b: 28, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  await sharp(base)
    .composite([
      { input: shot, top: chromeH, left: 1 },
      { input: Buffer.from(svg), top: 0, left: 0 },
    ])
    .png({ compressionLevel: 9 })
    .toFile(path.join(outDir, c.pngName));
}

/**
 * Animated SVG card. SMIL pulse on border + CTA (GH img cannot do CSS hover).
 * @param {{ input: string, title: string, url: string, accent: string, outName: string }} c
 */
async function makeAnimatedSvg(c) {
  const embed = await sharp(c.input)
    .resize(600, 280, { fit: "cover", position: "top" })
    .jpeg({ quality: 72 })
    .toBuffer();
  const b64 = embed.toString("base64");
  const host = displayHost(c.url);
  const shotSvgH = 280;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(c.title)} — visit ${esc(host)}">
  <defs>
    <linearGradient id="chrome" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1a2433"/>
      <stop offset="1" stop-color="#121a26"/>
    </linearGradient>
    <linearGradient id="label" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#0E1C2E"/>
      <stop offset="1" stop-color="#152536"/>
    </linearGradient>
    <clipPath id="frame"><rect width="${W}" height="${H}" rx="${radius}" ry="${radius}"/></clipPath>
  </defs>
  <g clip-path="url(#frame)">
    <rect width="${W}" height="${H}" fill="#0a121c"/>
    <rect width="${W}" height="${chromeH}" fill="url(#chrome)"/>
    <circle cx="22" cy="18" r="5" fill="#ff5f57"/>
    <circle cx="40" cy="18" r="5" fill="#febc2e"/>
    <circle cx="58" cy="18" r="5" fill="#28c840"/>
    <rect x="90" y="10" width="${W - 110}" height="16" rx="8" fill="#0a121c" stroke="#ffffff" stroke-opacity="0.08"/>
    <text x="106" y="21.5" fill="#8FA1B6" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="10">${esc(host)}</text>

    <image y="${chromeH}" width="${W}" height="${shotSvgH}" preserveAspectRatio="xMidYMin slice" href="data:image/jpeg;base64,${b64}" xlink:href="data:image/jpeg;base64,${b64}"/>

    <rect y="${H - labelH}" width="${W}" height="${labelH}" fill="url(#label)"/>
    <rect y="${H - labelH}" width="${W}" height="1" fill="#ffffff" fill-opacity="0.08"/>
    <text x="24" y="${H - 38}" fill="#F3EDE3" font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif" font-size="20" font-weight="700">${esc(c.title)}</text>
    <text x="24" y="${H - 16}" fill="#8FA1B6" font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif" font-size="13">Click to open live site</text>

    <g>
      <rect x="${W - 148}" y="${H - 46}" width="124" height="28" rx="14" fill="${c.accent}">
        <animate attributeName="opacity" values="1;0.82;1" dur="2.4s" repeatCount="indefinite"/>
      </rect>
      <text x="${W - 86}" y="${H - 27}" text-anchor="middle" fill="#F3EDE3" font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif" font-size="13" font-weight="600">Visit site →</text>
    </g>

    <rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" rx="${radius - 1}" fill="none" stroke="${c.accent}" stroke-opacity="0.35" stroke-width="2">
      <animate attributeName="stroke-opacity" values="0.2;0.7;0.2" dur="2.8s" repeatCount="indefinite"/>
    </rect>
    <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="${radius}" fill="none" stroke="#ffffff" stroke-opacity="0.10"/>
  </g>
</svg>`;

  fs.writeFileSync(path.join(outDir, c.outName), svg);
}

const cards = [
  {
    input: "/tmp/profile-cards/fs-hero.png",
    title: "Forbidden Street",
    url: "https://forbidden-street.com",
    accent: "#B23A48",
    outName: "work-forbidden-street.svg",
    pngName: "work-forbidden-street.png",
  },
  {
    input: "/tmp/profile-cards/pa-hero.webp",
    title: "Photo Atlas",
    url: "https://photo-atlas.com",
    accent: "#2F6FED",
    outName: "work-photo-atlas.svg",
    pngName: "work-photo-atlas.png",
  },
  {
    input: "/tmp/profile-cards/ss-hero.webp",
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
