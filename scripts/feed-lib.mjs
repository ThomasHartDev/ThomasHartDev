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
      "A message broker I built from scratch in memory, with publish/subscribe, work queues, delivery guarantees, and backpressure. It's the core of what Kafka and SQS do, shrunk down to something you can read in one sitting.",
  },
  {
    name: "airlock",
    url: "https://github.com/ThomasHartDev/airlock",
    blurb:
      "Ephemeral, zero-credential sandbox for running untrusted or agent-generated code, with self-verifying execution.",
  },
  {
    name: "image-processing",
    url: "https://github.com/ThomasHartDev/image-processing",
    blurb:
      "Sharp-based optimizer that binary-searches encoder quality against an SSIM target, with perceptual scoring.",
  },
  {
    name: "obs-phone-cam",
    url: "https://github.com/ThomasHartDev/obs-phone-cam",
    blurb: "Turns an iPhone into a low-latency OBS camera over the LAN. No app, no fee.",
  },
];

const SELF = "ThomasHartDev";

/**
 * Names already surfaced elsewhere on the profile, so the auto feed can skip them.
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
 * itself, and anything already pinned as flagship (no duplicates across sections).
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
 * @param {Flagship[]} [list]
 * @returns {string}
 */
export function renderFlagship(list = FLAGSHIP) {
  return list.map((f) => `- [${f.name}](${f.url}) — ${f.blurb}`).join("\n");
}

/**
 * @param {Repo[]} repos
 * @param {number} [now]
 * @returns {string}
 */
export function renderRecent(repos, now = Date.now()) {
  if (!repos.length) return "- More on [thomas-hart.com](https://thomas-hart.com)";
  return repos
    .map((r) => {
      const blurb = r.description || r.language || "recently pushed";
      return `- [${r.name}](${r.html_url}) — ${blurb} &nbsp;·&nbsp; <sub>${relDate(r.pushed_at, now)}</sub>`;
    })
    .join("\n");
}
