// Runs before `npm run build`. Hostinger replaces next.config.mjs with its own
// (no static export), so put ours back: it only re-exports next.base.config.mjs.
import { writeFileSync } from "node:fs";

writeFileSync(
  "next.config.mjs",
  '// Do not edit: see next.base.config.mjs and scripts/prebuild.mjs.\nexport { default } from "./next.base.config.mjs";\n',
);
console.log("next.config.mjs -> next.base.config.mjs (static export to out/)");
