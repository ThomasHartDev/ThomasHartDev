# Manual test — README shows first-thing on the profile

**Covered by automation:** banner render, SMIL animation, self-updating feed, footer swap (all verified live on the repo README page).

**Manual leg (GitHub-side, can't be forced):** GitHub surfacing this README at the top of the profile Overview. The repo-level "special repository" flag flips immediately, but the profile-level surfacing runs on a separate async path that lags when the repo is created by CLI push (as this one was) rather than GitHub's web "special repo" flow. It resolves on its own, usually within the hour.

## Steps

1. **Action → expected:** Open `https://github.com/ThomasHartDev` in a logged-out browser (or incognito).
   → A bordered README card appears at the top of the Overview column, above **Pinned**, showing the animated "Thomas Hart" banner.

2. **Action → expected:** Run the state check below.
   → All conditions print `true` / the file exists. If they do and the card still isn't showing, it's pure GitHub indexing lag — wait and refresh.

```bash
gh api repos/ThomasHartDev/ThomasHartDev --jq '"fork="+(.fork|tostring)+" default="+.default_branch+" visibility="+.visibility'
gh api repos/ThomasHartDev/ThomasHartDev/contents/README.md?ref=main --jq '.name,.size'
```

3. **If it still hasn't appeared after ~1 hour** (rare): make any trivial commit to `README.md` on `main`, or in the GitHub web UI open the repo and it re-triggers detection. As a last resort, GitHub's own "create a special repository" flow (New repo → name it `ThomasHartDev`) flips the profile flag synchronously.

**Pass/fail:** ____ (Thomas confirms the card is visible to logged-out visitors)
