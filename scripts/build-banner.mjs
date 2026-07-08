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
      <stop offset="0.5" stop-color="#ffffff" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="wmclip"><path d="${wm.d}"/></clipPath>
  </defs>

  <style>
    .rise { opacity: 0; transform: translateY(14px); animation: rise .9s cubic-bezier(.21,.47,.32,.98) .1s forwards; }
    .eyebrow { opacity: 0; animation: fade .8s ease .05s forwards; }
    .tag { opacity: 0; animation: fade .9s ease .5s forwards; }
    .ul { stroke-dasharray: ${ulLen.toFixed(1)}; stroke-dashoffset: ${ulLen.toFixed(1)}; animation: draw 1.1s cubic-bezier(.21,.47,.32,.98) .55s forwards; }
    .glow { animation: pulse 5s ease-in-out infinite; transform-origin: center; }
    .sweep { animation: sweep 4.5s ease-in-out 1.2s infinite; }
    .dot { animation: track 3.2s cubic-bezier(.5,0,.5,1) 1.4s infinite; }
    @keyframes rise { to { opacity: 1; transform: translateY(0); } }
    @keyframes fade { to { opacity: 1; } }
    @keyframes draw { to { stroke-dashoffset: 0; } }
    @keyframes pulse { 0%,100% { opacity: .45; } 50% { opacity: .7; } }
    @keyframes sweep { 0% { transform: translateX(-40%); } 55%,100% { transform: translateX(140%); } }
    @keyframes track { 0% { transform: translateX(0); opacity: 0; } 8% { opacity: 1; } 92% { opacity: 1; } 100% { transform: translateX(${(ulLen - 8).toFixed(0)}px); opacity: 0; } }
    @media (prefers-reduced-motion: reduce) {
      .rise,.eyebrow,.tag { opacity: 1; transform: none; animation: none; }
      .ul { stroke-dashoffset: 0; animation: none; }
      .glow,.sweep,.dot { animation: none; }
      .sweep { opacity: 0; } .dot { opacity: 1; }
    }
  </style>

  <rect width="${W}" height="${H}" rx="18" fill="url(#bg)"/>
  <ellipse class="glow" cx="${W / 2}" cy="200" rx="440" ry="150" fill="url(#glow)"/>

  <!-- faint hairline frame -->
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="18" fill="none" stroke="#ffffff" stroke-opacity="0.06"/>

  <!-- eyebrow -->
  <text class="eyebrow" x="${W / 2}" y="88" text-anchor="middle" fill="${C.muted}"
        font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="19" letter-spacing="7">SOFTWARE ENGINEER  ·  SUBSECOND STUDIO</text>

  <!-- wordmark (Fraunces Black, baked to paths) + light sweep clipped to the letters -->
  <g class="rise">
    <path d="${wm.d}" fill="${C.ink}"/>
    <g clip-path="url(#wmclip)">
      <rect class="sweep" x="${wm.x0 - 30}" y="90" width="220" height="150" fill="url(#sweep)"/>
    </g>
  </g>

  <!-- animated underline + a claret dot that runs its length (the "subsecond" beat) -->
  <line class="ul" x1="${ulX1.toFixed(1)}" y1="${ulY}" x2="${ulX2.toFixed(1)}" y2="${ulY}"
        stroke="${C.claret}" stroke-width="4" stroke-linecap="round"/>
  <circle class="dot" cx="${ulX1.toFixed(1)}" cy="${ulY}" r="5" fill="${C.claretLite}"/>

  <!-- tagline -->
  <text class="tag" x="${W / 2}" y="292" text-anchor="middle" fill="${C.muted}"
        font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="20" letter-spacing="1.5">Full-stack web · Next.js · TypeScript · Postgres · I ship, then I prove it.</text>
</svg>
`;

fs.writeFileSync(path.join(root, "assets", "banner.svg"), svg);
console.log("wrote assets/banner.svg", svg.length, "bytes; wordmark width", wm.width.toFixed(0));
