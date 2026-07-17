# Profile build pipeline

`README.md` is generated, not hand-edited. Edit `README.template.md` and regenerate.

## How it works

`scripts/update-feed.mjs` reads `README.template.md` and fills three placeholder blocks:

- `<!-- LATEST_POSTS -->` — the three newest posts from the `thomas-hart.com` sitemap.
- `<!-- FLAGSHIP -->` — a curated list of the strongest repos, ordered by what each one demonstrates rather than by push date.
- `<!-- RECENT_SHIP -->` — the most recently pushed public repos, minus forks, archived, and anything already pinned as flagship so no repo shows up twice.

The selection and rendering rules live in `scripts/feed-lib.mjs` as pure functions (`selectRecent`, `renderFlagship`, `renderRecent`, `relDate`) so they can be unit tested without network access. `update-feed.mjs` keeps only the I/O (fetch, file read/write).

Curated flagship entries are the `FLAGSHIP` array in `scripts/feed-lib.mjs`. Add or reorder there.

## Pin planner

GitHub pins six repos to the top of a profile. `scripts/pin-repos.mjs` fetches every public repo through the gh GraphQL API and prints the six it would pin, strongest first. Scoring lives in `scripts/pin-lib.mjs` as pure functions (`scoreRepo`, `rankPins`, `selectPins`, `parseRepos`, `pinnableQuery`) so the ranking is unit tested without a network call.

Each repo scores on log-scaled stars and forks, whether it has a description, language, and topics, and how recently it was pushed (freshness decays from 30 to 365 days). Curated flagship names get a large boost so they always pin, and the remaining slots fill by measured signal. Ties break by stars, then push date, then name, so the same repos produce the same plan every run.

GitHub has no supported mutation to set pins from the API, so the script prints the plan and you apply it once in the profile UI:

```bash
pnpm run plan:pins    # needs gh authenticated
```

## What's implemented

- Self-updating "Latest writing" pulled from the public sitemap.
- Curated flagship-repos section with per-repo descriptions, deduped against the auto "recently shipped" list.
- Animated banner build (`scripts/build-banner.mjs`).
- Pin planner that scores repos over the gh GraphQL API and prints the six strongest to pin.

## Run it

```bash
pnpm install
pnpm run build:feed   # regenerate README.md from the template
pnpm run typecheck    # tsc over the feed scripts and tests
pnpm test             # vitest unit tests for the selection/render logic
```

CI (`.github/workflows/ci.yml`) runs `typecheck` and `test` on every push and PR to `main`.
The daily `update-profile` workflow runs `build:feed` and commits the refreshed `README.md`.
