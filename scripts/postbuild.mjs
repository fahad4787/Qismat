// Runs after `npm run build`. Confirms the static site landed in out/ and
// prints where, so a hosting build log shows it plainly.
import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const out = resolve("out");
const count = (dir) =>
  readdirSync(dir, { withFileTypes: true }).reduce(
    (n, e) => n + (e.isDirectory() ? count(resolve(dir, e.name)) : 1),
    0,
  );

if (existsSync(resolve(out, "index.html"))) {
  console.log(`Static site ready: ${out} (${count(out)} files)`);
} else {
  console.error(`No out/index.html in ${process.cwd()}`);
  console.error("Here:", readdirSync(".").join(", "));
  process.exit(1);
}
