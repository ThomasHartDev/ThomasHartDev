// Regenerates README.md from README.template.md: injects a merged
// "Recent projects" list (curated + freshly pushed). Footer is a static
// Links row only (no per-post blog list).
// Run by the update-profile workflow on a daily cron.
// No secrets: everything it reads is public. Selection/render logic lives in
// feed-lib.mjs so it can be unit tested without network.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  courseworkNames,
  flagshipNames,
  renderRecentProjects,
  selectRecent,
} from "./feed-lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const GH_HEADERS = {
  "user-agent": "profile-readme-bot",
  accept: "application/vnd.github+json",
  ...(process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
};

/** @param {string} url */
async function fetchJson(url) {
  const res = await fetch(url, { headers: GH_HEADERS });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function recentlyShipped() {
  try {
    const repos = await fetchJson(
      "https://api.github.com/users/ThomasHartDev/repos?sort=pushed&per_page=40&type=owner"
    );
    const exclude = new Set([...flagshipNames(), ...courseworkNames()]);
    return selectRecent(repos, { exclude, count: 3 });
  } catch {
    return [];
  }
}

async function main() {
  const recent = await recentlyShipped();
  const projectsBlock = renderRecentProjects({ recent });

  const template = fs.readFileSync(path.join(root, "README.template.md"), "utf8");
  const out = template.replace(
    /(<!-- RECENT_PROJECTS -->)[\s\S]*?(<!-- \/RECENT_PROJECTS -->)/,
    `$1\n${projectsBlock}\n$2`
  );

  fs.writeFileSync(path.join(root, "README.md"), out);
  console.log(`injected recent projects (${recent.length} auto)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
