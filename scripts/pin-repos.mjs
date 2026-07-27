// Fetches every public repo via gh GraphQL, scores them, and prints the six to
// pin on the profile (strongest first). GitHub has no supported mutation to set
// pins from the API, so this produces the plan and you apply it once in the
// profile UI. Selection/scoring lives in pin-lib.mjs so it stays unit tested.
import { execFileSync } from "node:child_process";
import { courseworkNames, flagshipNames } from "./feed-lib.mjs";
import { PIN_LIMIT, parseRepos, pinnableQuery, renderPinPlan, selectPins } from "./pin-lib.mjs";

const LOGIN = process.env.PROFILE_LOGIN || "ThomasHartDev";

function fetchRepos() {
  const out = execFileSync("gh", ["api", "graphql", "-f", `query=${pinnableQuery(LOGIN)}`], {
    encoding: "utf8",
  });
  return parseRepos(JSON.parse(out));
}

function main() {
  const repos = fetchRepos();
  const pins = selectPins(repos, {
    boost: flagshipNames(),
    exclude: courseworkNames(),
    limit: PIN_LIMIT,
  });
  console.log(`scored ${repos.length} repos, pinning ${pins.length}:`);
  console.log(renderPinPlan(pins));
}

main();
