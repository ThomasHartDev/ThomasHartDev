import { describe, it, expect } from "vitest";
import {
  PIN_LIMIT,
  parseRepos,
  pinnableQuery,
  rankPins,
  renderPinPlan,
  scoreRepo,
  selectPins,
} from "../scripts/pin-lib.mjs";

const NOW = new Date("2026-06-15T00:00:00Z").getTime();

/** @param {Partial<import("../scripts/pin-lib.mjs").PinCandidate> & { name: string }} r */
const repo = (r) => ({ url: `https://github.com/ThomasHartDev/${r.name}`, pushedAt: "2026-06-01T00:00:00Z", ...r });

describe("scoreRepo", () => {
  it("ranks more stars higher, all else equal", () => {
    const hi = scoreRepo(repo({ name: "hi", stargazerCount: 200 }), { now: NOW });
    const lo = scoreRepo(repo({ name: "lo", stargazerCount: 2 }), { now: NOW });
    expect(hi).toBeGreaterThan(lo);
  });

  it("rewards description, language, and topics", () => {
    const bare = scoreRepo(repo({ name: "bare" }), { now: NOW });
    const rich = scoreRepo(
      repo({ name: "rich", description: "does a thing", primaryLanguage: "TypeScript", topicCount: 4 }),
      { now: NOW }
    );
    expect(rich).toBeGreaterThan(bare);
  });

  it("caps the topic bonus so a topic-stuffed repo can't run away", () => {
    const six = scoreRepo(repo({ name: "six", topicCount: 6 }), { now: NOW });
    const fifty = scoreRepo(repo({ name: "fifty", topicCount: 50 }), { now: NOW });
    expect(fifty).toBe(six);
  });

  it("decays freshness with age and treats future dates as fresh", () => {
    const fresh = scoreRepo(repo({ name: "fresh", pushedAt: "2026-06-14T00:00:00Z" }), { now: NOW });
    const stale = scoreRepo(repo({ name: "stale", pushedAt: "2024-06-14T00:00:00Z" }), { now: NOW });
    const future = scoreRepo(repo({ name: "future", pushedAt: "2027-01-01T00:00:00Z" }), { now: NOW });
    expect(fresh).toBeGreaterThan(stale);
    expect(future).toBe(fresh);
  });

  it("boosts curated names above everything", () => {
    const boost = new Set(["curated"]);
    const curated = scoreRepo(repo({ name: "curated", stargazerCount: 0 }), { boost, now: NOW });
    const popular = scoreRepo(repo({ name: "popular", stargazerCount: 5000 }), { boost, now: NOW });
    expect(curated).toBeGreaterThan(popular);
  });
});

describe("rankPins / selectPins", () => {
  it("orders strongest first and drops the ineligible", () => {
    const repos = [
      repo({ name: "star", stargazerCount: 100 }),
      repo({ name: "fork", stargazerCount: 999, isFork: true }),
      repo({ name: "archived", stargazerCount: 999, isArchived: true }),
      repo({ name: "private", stargazerCount: 999, isPrivate: true }),
      repo({ name: "ThomasHartDev", stargazerCount: 999 }),
      repo({ name: "small", stargazerCount: 1 }),
    ];
    expect(rankPins(repos, { boost: new Set(), now: NOW }).map((r) => r.repo.name)).toEqual([
      "star",
      "small",
    ]);
  });

  it("caps the pin set at six by default", () => {
    const repos = Array.from({ length: 20 }, (_, i) =>
      repo({ name: `r${i}`, stargazerCount: i })
    );
    expect(selectPins(repos, { boost: new Set(), now: NOW })).toHaveLength(PIN_LIMIT);
  });

  it("returns fewer than the limit when eligible repos are scarce", () => {
    const repos = [repo({ name: "only" })];
    expect(selectPins(repos, { boost: new Set(), now: NOW })).toHaveLength(1);
  });

  it("honors an explicit limit and a zero limit", () => {
    const repos = [repo({ name: "a" }), repo({ name: "b" }), repo({ name: "c" })];
    expect(selectPins(repos, { boost: new Set(), now: NOW, limit: 2 })).toHaveLength(2);
    expect(selectPins(repos, { boost: new Set(), now: NOW, limit: 0 })).toEqual([]);
  });

  it("handles empty input", () => {
    expect(selectPins([], { boost: new Set() })).toEqual([]);
  });

  it("breaks score ties by stars, then name, deterministically", () => {
    const repos = [
      repo({ name: "zebra", stargazerCount: 10 }),
      repo({ name: "alpha", stargazerCount: 10 }),
      repo({ name: "top", stargazerCount: 11 }),
    ];
    expect(rankPins(repos, { boost: new Set(), now: NOW }).map((r) => r.repo.name)).toEqual([
      "top",
      "alpha",
      "zebra",
    ]);
  });

  it("does not mutate the caller's array", () => {
    const repos = [repo({ name: "a", stargazerCount: 1 }), repo({ name: "b", stargazerCount: 9 })];
    const before = repos.map((r) => r.name);
    selectPins(repos, { boost: new Set(), now: NOW });
    expect(repos.map((r) => r.name)).toEqual(before);
  });

  it("pins curated repos ahead of a more popular non-curated one", () => {
    const repos = [
      repo({ name: "popular", stargazerCount: 4000 }),
      repo({ name: "airlock", stargazerCount: 3 }),
    ];
    const pins = selectPins(repos, { boost: new Set(["airlock"]), now: NOW });
    expect(pins[0].repo.name).toBe("airlock");
  });
});

describe("parseRepos", () => {
  it("flattens gh nodes and fills defaults for null fields", () => {
    const data = {
      data: {
        user: {
          repositories: {
            nodes: [
              {
                name: "x",
                url: "https://github.com/ThomasHartDev/x",
                description: null,
                pushedAt: "2026-06-01T00:00:00Z",
                stargazerCount: 5,
                forkCount: 0,
                isArchived: false,
                isPrivate: false,
                isFork: false,
                primaryLanguage: null,
                repositoryTopics: { totalCount: 3 },
              },
            ],
          },
        },
      },
    };
    const [r] = parseRepos(data);
    expect(r).toMatchObject({ name: "x", description: null, primaryLanguage: null, topicCount: 3, stargazerCount: 5 });
  });

  it("accepts an already-unwrapped payload and returns [] for junk", () => {
    const nodes = { user: { repositories: { nodes: [{ name: "y", url: "u", pushedAt: "2026-06-01T00:00:00Z" }] } } };
    expect(parseRepos(nodes).map((r) => r.name)).toEqual(["y"]);
    expect(parseRepos(null)).toEqual([]);
    expect(parseRepos({ data: {} })).toEqual([]);
  });

  it("round-trips through the scorer without throwing on missing fields", () => {
    const parsed = parseRepos({ user: { repositories: { nodes: [{ name: "z", url: "u", pushedAt: "2026-06-01T00:00:00Z" }] } } });
    expect(() => selectPins(parsed, { boost: new Set(), now: NOW })).not.toThrow();
  });
});

describe("pinnableQuery", () => {
  it("embeds the login and page size and requests the scoring fields", () => {
    const q = pinnableQuery("octocat", 50);
    expect(q).toContain('user(login: "octocat")');
    expect(q).toContain("first: 50");
    expect(q).toContain("stargazerCount");
    expect(q).toContain("primaryLanguage");
  });
});

describe("renderPinPlan", () => {
  it("numbers the plan with scores, and reports when empty", () => {
    const ranked = selectPins([repo({ name: "a", stargazerCount: 3 })], { boost: new Set(), now: NOW });
    expect(renderPinPlan(ranked)).toMatch(/^1\. a \(/);
    expect(renderPinPlan([])).toContain("no eligible repos");
  });
});
