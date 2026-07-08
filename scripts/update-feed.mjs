// Regenerates README.md from README.template.md, injecting the latest blog posts
// from thomas-hart.com (public sitemap). Run by the update-profile workflow on a
// daily cron. No secrets: everything it reads is public.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const SITEMAP = "https://thomas-hart.com/sitemap.xml";
const COUNT = 3;

const GH_HEADERS = {
  "user-agent": "profile-readme-bot",
  accept: "application/vnd.github+json",
  ...(process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
};

async function fetchText(url) {
  const res = await fetch(url, { headers: { "user-agent": "profile-readme-bot" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: GH_HEADERS });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

function relDate(iso) {
  const days = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "last month" : `${months} months ago`;
}

// Most recently pushed public repos (the Action's token can't see private ones).
async function recentlyShipped() {
  try {
    const repos = await fetchJson(
      "https://api.github.com/users/ThomasHartDev/repos?sort=pushed&per_page=40&type=owner"
    );
    return repos
      .filter((r) => !r.fork && !r.archived && !r.private && r.name !== "ThomasHartDev")
      .slice(0, 2)
      .map((r) => {
        const blurb = r.description || r.language || "recently pushed";
        return `- [${r.name}](${r.html_url}) — ${blurb} &nbsp;·&nbsp; <sub>${relDate(r.pushed_at)}</sub>`;
      });
  } catch {
    return [];
  }
}

function titleFromSlug(slug) {
  return slug
    .split("-")
    .map((w) => (w.length <= 3 && /^(and|the|for|to|of|in|on|a|vs|my)$/i.test(w) ? w : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}

async function ogTitle(url) {
  try {
    const html = await fetchText(url);
    const m =
      html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (m) return m[1].replace(/\s*[|•·—-]\s*Thomas Hart.*$/i, "").trim();
  } catch {}
  return null;
}

async function main() {
  const xml = await fetchText(SITEMAP);
  const entries = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)]
    .map((m) => {
      const loc = (m[1].match(/<loc>([^<]+)<\/loc>/) || [])[1] || "";
      const lm = (m[1].match(/<lastmod>([^<]+)<\/lastmod>/) || [])[1] || "";
      return { loc, lm };
    })
    .filter((e) => /\/blog\/[^/]+$/.test(e.loc))
    .sort((a, b) => new Date(b.lm) - new Date(a.lm))
    .slice(0, COUNT);

  const items = [];
  for (const e of entries) {
    const slug = e.loc.split("/blog/")[1];
    const title = (await ogTitle(e.loc)) || titleFromSlug(slug);
    const date = new Date(e.lm).toLocaleDateString("en-US", { month: "short", year: "numeric" });
    items.push(`- [${title}](${e.loc}) &nbsp;·&nbsp; <sub>${date}</sub>`);
  }

  const block = items.join("\n");
  const shipped = await recentlyShipped();
  const shipBlock = shipped.length ? shipped.join("\n") : "- More on [thomas-hart.com](https://thomas-hart.com)";

  const template = fs.readFileSync(path.join(root, "README.template.md"), "utf8");
  const out = template
    .replace(/(<!-- LATEST_POSTS -->)[\s\S]*?(<!-- \/LATEST_POSTS -->)/, `$1\n${block}\n$2`)
    .replace(/(<!-- RECENT_SHIP -->)[\s\S]*?(<!-- \/RECENT_SHIP -->)/, `$1\n${shipBlock}\n$2`);
  fs.writeFileSync(path.join(root, "README.md"), out);
  console.log(`injected ${items.length} posts, ${shipped.length} shipped`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
