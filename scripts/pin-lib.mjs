// Decides which repos to pin on the profile. GitHub allows six pins, so this
// scores every public repo and keeps the top six. Pure logic (no network) so the
// scoring and tie-breaks are unit tested; the gh GraphQL calls live in pin-repos.mjs.
import { FLAGSHIP, flagshipNames } from "./feed-lib.mjs";

/**
 * @typedef {Object} PinCandidate
 * @property {string} name
 * @property {string} url
 * @property {string} pushedAt
 * @property {string|null} [description]
 * @property {number} [stargazerCount]
 * @property {number} [forkCount]
 * @property {number} [topicCount]
 * @property {string|null} [primaryLanguage]
 * @property {boolean} [isFork]
 * @property {boolean} [isArchived]
 * @property {boolean} [isPrivate]
 */

export const PIN_LIMIT = 6;
const SELF = "ThomasHartDev";

// Stars order comparable repos; curated flagship names are boosted so they always
// pin regardless of star count, and the remaining slots fill by measured signal.
const W = { star: 12, fork: 6, desc: 4, lang: 3, topic: 1.5, fresh: 8, boost: 1000 };
const TOPIC_CAP = 6;
const FRESH_FULL_DAYS = 30;
const FRESH_ZERO_DAYS = 365;

/**
 * @param {PinCandidate} repo
 * @param {Set<string>} exclude
 * @returns {boolean}
 */
function eligible(repo, exclude) {
  return (
    !!repo &&
    !repo.isFork &&
    !repo.isArchived &&
    !repo.isPrivate &&
    repo.name !== SELF &&
    !exclude.has(repo.name)
  );
}

/**
 * @param {string} iso
 * @param {number} now
 * @returns {number}
 */
function freshness(iso, now) {
  const days = (now - new Date(iso).getTime()) / 86400000;
  if (days <= FRESH_FULL_DAYS) return W.fresh; // future/recent both count as fresh
  if (days >= FRESH_ZERO_DAYS) return 0;
  return (W.fresh * (FRESH_ZERO_DAYS - days)) / (FRESH_ZERO_DAYS - FRESH_FULL_DAYS);
}

/**
 * @param {PinCandidate} repo
 * @param {{ boost?: Set<string>, now?: number }} [opts]
 * @returns {number}
 */
export function scoreRepo(repo, opts = {}) {
  const boost = opts.boost ?? new Set();
  const now = opts.now ?? Date.now();
  let s = 0;
  s += Math.log2((repo.stargazerCount ?? 0) + 1) * W.star;
  s += Math.log2((repo.forkCount ?? 0) + 1) * W.fork;
  if (repo.description && repo.description.trim()) s += W.desc;
  if (repo.primaryLanguage) s += W.lang;
  s += Math.min(repo.topicCount ?? 0, TOPIC_CAP) * W.topic;
  s += freshness(repo.pushedAt, now);
  if (boost.has(repo.name)) s += W.boost;
  return s;
}

/**
 * @param {{ repo: PinCandidate, score: number }} a
 * @param {{ repo: PinCandidate, score: number }} b
 * @returns {number}
 */
function byRank(a, b) {
  if (b.score !== a.score) return b.score - a.score;
  const stars = (b.repo.stargazerCount ?? 0) - (a.repo.stargazerCount ?? 0);
  if (stars) return stars;
  const pushed = new Date(b.repo.pushedAt).getTime() - new Date(a.repo.pushedAt).getTime();
  if (pushed) return pushed;
  return a.repo.name.localeCompare(b.repo.name);
}

/**
 * Eligible repos scored and ordered strongest first. Deterministic tie-breaks
 * (stars, then push date, then name) so the same input always pins the same set.
 * @param {PinCandidate[]} repos
 * @param {{ boost?: Set<string>, exclude?: Set<string>, now?: number }} [opts]
 * @returns {{ repo: PinCandidate, score: number }[]}
 */
export function rankPins(repos, opts = {}) {
  const boost = opts.boost ?? flagshipNames();
  const exclude = opts.exclude ?? new Set();
  const now = opts.now ?? Date.now();
  return repos
    .filter((r) => eligible(r, exclude))
    .map((repo) => ({ repo, score: scoreRepo(repo, { boost, now }) }))
    .sort(byRank);
}

/**
 * @param {PinCandidate[]} repos
 * @param {{ boost?: Set<string>, exclude?: Set<string>, now?: number, limit?: number }} [opts]
 * @returns {{ repo: PinCandidate, score: number }[]}
 */
export function selectPins(repos, opts = {}) {
  const limit = Math.max(0, opts.limit ?? PIN_LIMIT);
  return rankPins(repos, opts).slice(0, limit);
}

/**
 * @param {string} login
 * @param {number} [first]
 * @returns {string}
 */
export function pinnableQuery(login, first = 100) {
  return `query {
  user(login: ${JSON.stringify(login)}) {
    repositories(first: ${first}, ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC, orderBy: { field: PUSHED_AT, direction: DESC }) {
      nodes {
        name
        url
        description
        pushedAt
        stargazerCount
        forkCount
        isArchived
        isPrivate
        isFork
        primaryLanguage { name }
        repositoryTopics { totalCount }
      }
    }
  }
}`;
}

/**
 * Flattens the gh GraphQL response into candidates. Tolerates missing/null
 * fields since a repo may have no language, description, or topics.
 * @param {unknown} data
 * @returns {PinCandidate[]}
 */
export function parseRepos(data) {
  const nodes =
    /** @type {any} */ (data)?.data?.user?.repositories?.nodes ??
    /** @type {any} */ (data)?.user?.repositories?.nodes;
  if (!Array.isArray(nodes)) return [];
  return nodes.filter(Boolean).map((n) => ({
    name: n.name,
    url: n.url,
    description: n.description ?? null,
    pushedAt: n.pushedAt,
    stargazerCount: n.stargazerCount ?? 0,
    forkCount: n.forkCount ?? 0,
    topicCount: n.repositoryTopics?.totalCount ?? 0,
    primaryLanguage: n.primaryLanguage?.name ?? null,
    isArchived: !!n.isArchived,
    isPrivate: !!n.isPrivate,
    isFork: !!n.isFork,
  }));
}

/**
 * @param {{ repo: PinCandidate, score: number }[]} ranked
 * @returns {string}
 */
export function renderPinPlan(ranked) {
  if (!ranked.length) return "no eligible repos to pin";
  return ranked
    .map((r, i) => `${i + 1}. ${r.repo.name} (${r.score.toFixed(1)}) — ${r.repo.url}`)
    .join("\n");
}

export { FLAGSHIP };
