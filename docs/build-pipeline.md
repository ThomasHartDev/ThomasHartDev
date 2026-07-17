# Profile build pipeline

`README.md` is generated, not hand-edited. Edit `README.template.md` and regenerate.

## How it works

`scripts/update-feed.mjs` reads `README.template.md` and fills three placeholder blocks:

- `<!-- LATEST_POSTS -->` — the three newest posts from the `thomas-hart.com` sitemap.
- `<!-- FLAGSHIP -->` — a curated list of the strongest repos, ordered by what each one demonstrates rather than by push date.
- `<!-- RECENT_SHIP -->` — the most recently pushed public repos, minus forks, archived, and anything already pinned as flagship so no repo shows up twice.

The selection and rendering rules live in `scripts/feed-lib.mjs` as pure functions (`selectRecent`, `renderFlagship`, `renderRecent`, `relDate`) so they can be unit tested without network access. `update-feed.mjs` keeps only the I/O (fetch, file read/write).

Curated flagship entries are the `FLAGSHIP` array in `scripts/feed-lib.mjs`. Add or reorder there.

## What's implemented

- Self-updating "Latest writing" pulled from the public sitemap.
- Curated flagship-repos section with per-repo descriptions, deduped against the auto "recently shipped" list.
- Animated banner build (`scripts/build-banner.mjs`).

## Run it

```bash
pnpm install
pnpm run build:feed   # regenerate README.md from the template
pnpm run typecheck    # tsc over the feed scripts and tests
pnpm test             # vitest unit tests for the selection/render logic
```

CI (`.github/workflows/ci.yml`) runs `typecheck` and `test` on every push and PR to `main`.
The daily `update-profile` workflow runs `build:feed` and commits the refreshed `README.md`.
