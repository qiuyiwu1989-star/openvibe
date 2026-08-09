import { STAGE_ONE_REPOSITORIES } from "./seeds.js";

const format = process.argv.includes("--json") ? "json" : "lines";

if (format === "json") {
  process.stdout.write(`${JSON.stringify(STAGE_ONE_REPOSITORIES, null, 2)}\n`);
} else {
  process.stdout.write(
    `${STAGE_ONE_REPOSITORIES.map(({ owner, name }) => `${owner}/${name}`).join("\n")}\n`,
  );
}
