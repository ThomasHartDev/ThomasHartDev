// Pure helpers for the profile feed. No I/O here so the selection and
// rendering rules are testable without hitting the network.

/**
 * @typedef {Object} Repo
 * @property {string} name
 * @property {string} html_url
 * @property {string} pushed_at
 * @property {string|null} [description]
 * @property {string|null} [language]
 * @property {boolean} [fork]
 * @property {boolean} [archived]
 * @property {boolean} [private]
 */

/**
 * @typedef {Object} Flagship
 * @property {string} name
 * @property {string} url
 * @property {string} blurb
 */

// Hand-picked repos, ordered by what they demonstrate rather than by push date.
// A recruiter should hit the strongest work first, not whatever I touched last.
/** @type {Flagship[]} */
export const FLAGSHIP = [
  {
    name: "event-broker-lab",
    url: "https://github.com/ThomasHartDev/event-broker-lab",
    blurb:
      "In-memory message broker from scratch: pub/sub, work queues, delivery guarantees, and backpressure.",
  },
  {
    name: "airlock",
    url: "https://github.com/ThomasHartDev/airlock",
    blurb:
      "Ephemeral zero-credential sandbox for untrusted or agent-generated code, with self-verifying execution.",
  },
  {
    name: "image-processing",
    url: "https://github.com/ThomasHartDev/image-processing",
    blurb: "Sharp optimizer that binary-searches encoder quality against an SSIM target.",
  },
  {
    name: "obs-phone-cam",
    url: "https://github.com/ThomasHartDev/obs-phone-cam",
    blurb: "Turns an iPhone into a low-latency OBS camera over the LAN.",
  },
];

const SELF = "ThomasHartDev";

// Old university coursework. It's fine to have public, but a chore commit on one
// of these shouldn't push it into "Recently shipped" ahead of real recent work,
// so the auto feed and pin scorer skip them.
/** @type {string[]} */
export const COURSEWORK = [
  "AES-Java",
  "Computational-Theory",
  "Computer-Security-Project-Reports",
  "Creative-Web-Project",
  "Design-Principle-Exercises-And-Notes",
  "Diffie-Hellman-Project",
  "EvilHangman",
  "HashAttack",
  "MAC-Attack",
  "RSA-Project",
  "SpellingCorrector",
  "Testing-Verification-and-Analysis",
  "algorithm-design-and-analysis",
  "discrete-structures",
  "family-map-application",
  "operating-system-design",
  "systems-programming",
  "tweeter",
  "y86-Lab",
];

/**
 * @returns {Set<string>}
 */
export function courseworkNames() {
  return new Set(COURSEWORK);
}

/**
 * Names already surfaced as curated projects, so the auto feed can skip them.
 * @param {Flagship[]} [list]
 * @returns {Set<string>}
 */
export function flagshipNames(list = FLAGSHIP) {
  return new Set(list.map((f) => f.name));
}

/**
 * @param {Repo} repo
 * @param {Set<string>} exclude
 * @returns {boolean}
 */
function eligible(repo, exclude) {
  return (
    !repo.fork &&
    !repo.archived &&
    !repo.private &&
    repo.name !== SELF &&
    !exclude.has(repo.name)
  );
}

/**
 * Most recently pushed repos, minus forks/archived/private, the profile repo
 * itself, and anything already listed as curated (no duplicates).
 * @param {Repo[]} repos
 * @param {{ exclude?: Set<string>, count?: number }} [opts]
 * @returns {Repo[]}
 */
export function selectRecent(repos, opts = {}) {
  const exclude = opts.exclude ?? new Set();
  const count = opts.count ?? 2;
  return repos
    .filter((r) => r && eligible(r, exclude))
    .slice()
    .sort((a, b) => new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime())
    .slice(0, count);
}

/**
 * @param {string} iso
 * @param {number} [now]
 * @returns {string}
 */
export function relDate(iso, now = Date.now()) {
  const days = Math.floor((now - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "last month" : `${months} months ago`;
}

/**
 * Keep project blurbs short enough to scan on the profile card.
 * @param {string} text
 * @param {number} [max]
 * @returns {string}
 */
export function shortenBlurb(text, max = 110) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > 40 ? cut.slice(0, sp) : cut).replace(/[,;:.\s]+$/, "")}…`;
}

/**
 * @param {Flagship[]} [list]
 * @returns {string}
 */
export function renderFlagship(list = FLAGSHIP) {
  return list.map((f) => `- **[${f.name}](${f.url})** — ${shortenBlurb(f.blurb)}`).join("\n\n");
}

/**
 * @param {Repo[]} repos
 * @returns {string}
 */
export function renderRecent(repos) {
  if (!repos.length) return "";
  return repos
    .map((r) => {
      const blurb = shortenBlurb(r.description || r.language || "recently pushed");
      return `- **[${r.name}](${r.html_url})** — ${blurb}`;
    })
    .join("\n\n");
}

/**
 * Single "Recent projects" block: curated flagship first, then freshly shipped.
 * @param {{ flagship?: Flagship[], recent?: Repo[] }} [opts]
 * @returns {string}
 */
export function renderRecentProjects(opts = {}) {
  const flagship = opts.flagship ?? FLAGSHIP;
  const recent = opts.recent ?? [];
  const head = renderFlagship(flagship);
  const tail = renderRecent(recent);
  if (head && tail) return `${head}\n\n${tail}`;
  if (head) return head;
  if (tail) return tail;
  return "- More on [thomas-hart.com](https://thomas-hart.com)";
}

