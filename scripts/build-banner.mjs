// Builds assets/banner.svg — a self-contained animated banner for the GitHub profile.
// The wordmark is baked to vector paths from Fraunces Black so it renders identically
// everywhere (GitHub strips webfonts from README <img> SVGs; paths always draw).
// Run: node scripts/build-banner.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

// Subsecond Studio brand tokens
const C = {
  navyTop: "#0E1C2E",
  navyBot: "#091320",
  claret: "#B23A48",
  claretLite: "#D2586A",
  ink: "#F3EDE3",
  muted: "#8FA1B6",
};

const W = 1200;
const H = 340;

const font = opentype.parse(
  fs.readFileSync(path.join(__dirname, "fraunces-black.ttf")).buffer
);

// Lay out the wordmark centered horizontally, baseline at y0.
function wordmarkPath(text, fontSize, y0) {
  const scale = fontSize / font.unitsPerEm;
  let advance = 0;
  for (const ch of text) advance += font.charToGlyph(ch).advanceWidth * scale;
  const x0 = (W - advance) / 2;
  const p = font.getPath(text, x0, y0, fontSize);
  return { d: p.toPathData(2), width: advance, x0 };
}

const wm = wordmarkPath("Thomas Hart", 132, 214);

// Underline geometry: sits just under the wordmark, spans its width.
const ulY = 236;
const ulX1 = wm.x0 - 4;
const ulX2 = wm.x0 + wm.width + 4;
const ulLen = ulX2 - ulX1;

// Motion note: GitHub sanitizes README SVGs and does NOT run CSS @keyframes, but it
// DOES run SMIL <animate> (same as the contribution snake). So every element is drawn
// visible in its BASE state and SMIL only adds motion on top — the banner is fully
// legible even where animation is frozen, and animates where SMIL is supported.
const sweepX0 = wm.x0 - 260;
const sweepX1 = wm.x0 + wm.width + 60;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" role="img" aria-label="Thomas Hart — Software Engineer, Subsecond Studio">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.navyTop}"/>
      <stop offset="1" stop-color="${C.navyBot}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="58%" r="60%">
      <stop offset="0" stop-color="${C.claret}" stop-opacity="0.55"/>
      <stop offset="55%" stop-color="${C.claret}" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="${C.claret}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#ffffff" stop-opacity="0.5"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="wmclip"><path d="${wm.d}"/></clipPath>
  </defs>

  <rect width="${W}" height="${H}" rx="18" fill="url(#bg)"/>

  <!-- claret glow, gently pulsing -->
  <ellipse cx="${W / 2}" cy="200" rx="440" ry="150" fill="url(#glow)" opacity="0.55">
    <animate attributeName="opacity" values="0.45;0.72;0.45" dur="5s" repeatCount="indefinite"/>
  </ellipse>

  <!-- faint hairline frame -->
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="18" fill="none" stroke="#ffffff" stroke-opacity="0.06"/>

  <!-- eyebrow -->
  <text x="${W / 2}" y="88" text-anchor="middle" fill="${C.muted}"
        font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="19" letter-spacing="7">SOFTWARE ENGINEER  ·  SUBSECOND STUDIO</text>

  <!-- wordmark (Fraunces Black, baked to paths); a light sweep runs across the letters -->
  <path d="${wm.d}" fill="${C.ink}"/>
  <g clip-path="url(#wmclip)">
    <rect x="${sweepX0.toFixed(0)}" y="90" width="200" height="150" fill="url(#sweep)">
      <animate attributeName="x" from="${sweepX0.toFixed(0)}" to="${sweepX1.toFixed(0)}"
               dur="4.5s" begin="1s;click+0.2s" repeatCount="indefinite"/>
    </rect>
  </g>

  <!-- underline draws once, then a claret dot keeps running its length -->
  <line x1="${ulX1.toFixed(1)}" y1="${ulY}" x2="${ulX2.toFixed(1)}" y2="${ulY}"
        stroke="${C.claret}" stroke-width="4" stroke-linecap="round"
        stroke-dasharray="${ulLen.toFixed(1)}" stroke-dashoffset="0">
    <animate attributeName="stroke-dashoffset" from="${ulLen.toFixed(1)}" to="0"
             dur="1.1s" begin="0.4s" fill="freeze"/>
  </line>
  <circle cx="${ulX1.toFixed(1)}" cy="${ulY}" r="5" fill="${C.claretLite}">
    <animate attributeName="cx" values="${ulX1.toFixed(1)};${ulX2.toFixed(1)};${ulX1.toFixed(1)}"
             dur="3.6s" begin="1.5s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0;1;1;1;0" dur="3.6s" begin="1.5s" repeatCount="indefinite"/>
  </circle>

  <!-- tagline -->
  <text x="${W / 2}" y="292" text-anchor="middle" fill="${C.muted}"
        font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="20" letter-spacing="1.5">Full-stack web · Next.js · TypeScript · Postgres · I ship, then I prove it.</text>
</svg>
`;

fs.writeFileSync(path.join(root, "assets", "banner.svg"), svg);
console.log("wrote assets/banner.svg", svg.length, "bytes; wordmark width", wm.width.toFixed(0));
