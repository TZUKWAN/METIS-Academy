// 自动修复 YAML 内容文件中的常见格式问题
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

function walk(dir: string): string[] {
  let out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(p));
    else if (e.name.endsWith(".yaml")) out.push(p);
  }
  return out;
}

function tryParse(s: string): { ok: boolean; error?: string } {
  try { YAML.parse(s); return { ok: true }; }
  catch (e) { return { ok: false, error: String(e).split("\n")[0] }; }
}

// Fix strategies applied in order until YAML parses
function fixYaml(s: string): string {
  // 1. Replace straight double quotes inside CJK text with Chinese quotes
  //    Pattern: value starts with " but has more " inside
  const lines = s.split("\n");
  const fixed = lines.map((line) => {
    // Skip comments and empty lines
    if (line.trim().startsWith("#") || line.trim() === "") return line;
    // Find text values that start with " and have internal quotes
    // Pattern: key: "text with "inner" quotes"
    const m = line.match(/^(\s*[\w-]+\s*:\s*)"(.*)"(\s*,?\s*)$/);
    if (m) {
      const inner = m[2];
      if (inner.includes('"')) {
        // Replace internal " with alternating Chinese quotes
        let open = true;
        const fixed = inner.replace(/"/g, () => { const c = open ? "\u201c" : "\u201d"; open = !open; return c; });
        return `${m[1]}"${fixed}"${m[3]}`;
      }
    }
    return line;
  });
  return fixed.join("\n");
}

let fixedCount = 0;
let stillBad = 0;

for (const f of walk(contentDir)) {
  const raw = fs.readFileSync(f, "utf8");
  const check1 = tryParse(raw);
  if (check1.ok) continue;

  // Try fix pass 1
  let fixed = fixYaml(raw);
  let check = tryParse(fixed);
  if (check.ok) { fixedCount++; fs.writeFileSync(f, fixed); continue; }

  // Try fix pass 2: more aggressive - replace ALL straight quotes in lines with CJK
  const lines = fixed.split("\n");
  const fixed2 = lines.map((line) => {
    if (line.trim().startsWith("#") || line.trim() === "") return line;
    const qCount = (line.match(/"/g) ?? []).length;
    if (qCount >= 2 && qCount % 2 !== 0) {
      // Odd number of quotes - try removing the last one or adding a pair
      let open = true;
      return line.replace(/"/g, () => { const c = open ? "\u201c" : "\u201d"; open = !open; return c; });
    }
    return line;
  });
  const result = fixed2.join("\n");
  check = tryParse(result);
  if (check.ok) {
    fixedCount++;
    fs.writeFileSync(f, result);
  } else {
    stillBad++;
    console.log(`STILL-BAD: ${path.relative(contentDir, f)} -> ${check.error?.slice(0, 80)}`);
  }
}

console.log(`\nAuto-fixed: ${fixedCount}, still bad: ${stillBad}`);
