import { loadContentDir } from "../packages/content-schema/src/index.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { index } = await loadContentDir(path.join(root, "content"));
for (const [id, c] of index.characters) console.log(id, "(", (c as {name?:string}).name, ")", (c as {campaign?:string}).campaign);
console.log("---skills sample---");
let n = 0;
for (const id of index.skills.keys()) { process.stdout.write(id + " "); if (++n > 15) break; }
console.log();
