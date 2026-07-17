import { describe, it, expect } from "vitest";
import {
  FLAGSHIP,
  flagshipNames,
  relDate,
  renderFlagship,
  renderRecent,
  selectRecent,
} from "../scripts/feed-lib.mjs";

/** @param {Partial<import("../scripts/feed-lib.mjs").Repo> & { name: string }} r */
const repo = (r) => ({ html_url: `https://x/${r.name}`, pushed_at: "2026-01-01T00:00:00Z", ...r });

describe("selectRecent", () => {
  it("returns most recently pushed first", () => {
    const repos = [
      repo({ name: "old", pushed_at: "2026-01-01T00:00:00Z" }),
      repo({ name: "new", pushed_at: "2026-06-01T00:00:00Z" }),
      repo({ name: "mid", pushed_at: "2026-03-01T00:00:00Z" }),
    ];
    expect(selectRecent(repos, { count: 3 }).map((r) => r.name)).toEqual(["new", "mid", "old"]);
  });

  it("drops forks, archived, private, and the profile repo itself", () => {
    const repos = [
      repo({ name: "fork", fork: true }),
      repo({ name: "archived", archived: true }),
      repo({ name: "private", private: true }),
      repo({ name: "ThomasHartDev" }),
      repo({ name: "keep" }),
    ];
    expect(selectRecent(repos, { count: 10 }).map((r) => r.name)).toEqual(["keep"]);
  });

  it("excludes names already pinned as flagship (no cross-section duplicates)", () => {
    const repos = [repo({ name: "airlock" }), repo({ name: "fresh" })];
    const out = selectRecent(repos, { exclude: flagshipNames(), count: 10 });
    expect(out.map((r) => r.name)).toEqual(["fresh"]);
  });

  it("honors the count limit", () => {
    const repos = [repo({ name: "a" }), repo({ name: "b" }), repo({ name: "c" })];
    expect(selectRecent(repos, { count: 2 })).toHaveLength(2);
  });

  it("handles empty input", () => {
    expect(selectRecent([])).toEqual([]);
  });

  it("does not mutate the caller's array", () => {
    const repos = [repo({ name: "a", pushed_at: "2026-01-01T00:00:00Z" }), repo({ name: "b", pushed_at: "2026-06-01T00:00:00Z" })];
    const before = repos.map((r) => r.name);
    selectRecent(repos, { count: 2 });
    expect(repos.map((r) => r.name)).toEqual(before);
  });
});

describe("relDate", () => {
  const now = new Date("2026-06-15T00:00:00Z").getTime();
  it("clamps future and same-day to 'today'", () => {
    expect(relDate("2026-06-15T00:00:00Z", now)).toBe("today");
    expect(relDate("2026-07-01T00:00:00Z", now)).toBe("today");
  });
  it("names yesterday and recent days", () => {
    expect(relDate("2026-06-14T00:00:00Z", now)).toBe("yesterday");
    expect(relDate("2026-06-05T00:00:00Z", now)).toBe("10 days ago");
  });
  it("crosses into months at 30 days", () => {
    expect(relDate("2026-05-16T00:00:00Z", now)).toBe("last month");
    expect(relDate("2026-04-01T00:00:00Z", now)).toBe("2 months ago");
  });
});

describe("renderRecent", () => {
  it("falls back to a portfolio line when there is nothing to show", () => {
    expect(renderRecent([])).toContain("thomas-hart.com");
  });
  it("prefers description, then language, then a generic note", () => {
    const now = new Date("2026-01-02T00:00:00Z").getTime();
    const lines = renderRecent(
      [
        repo({ name: "with-desc", description: "does a thing" }),
        repo({ name: "lang-only", description: null, language: "Rust" }),
        repo({ name: "bare", description: null, language: null }),
      ],
      now
    ).split("\n");
    expect(lines[0]).toContain("does a thing");
    expect(lines[1]).toContain("Rust");
    expect(lines[2]).toContain("recently pushed");
  });
});

describe("renderFlagship", () => {
  it("emits one link line per repo with its blurb", () => {
    const lines = renderFlagship().split("\n");
    expect(lines).toHaveLength(FLAGSHIP.length);
    for (const f of FLAGSHIP) {
      expect(renderFlagship()).toContain(`[${f.name}](${f.url})`);
    }
  });

  it("keeps flagship and recent sections disjoint by name", () => {
    const repos = FLAGSHIP.map((f) => repo({ name: f.name }));
    expect(selectRecent(repos, { exclude: flagshipNames(), count: 10 })).toEqual([]);
  });
});
