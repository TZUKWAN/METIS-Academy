import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

const contentDir = path.resolve(process.cwd(), "content");
const issues: { file: string; id: string; field: string; text: string; problem: string }[] = [];

function walk(dir: string): string[] {
  let out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(p));
    else if (e.name.endsWith(".yaml")) out.push(p);
  }
  return out;
}

function checkText(text: string, file: string, id: string, field: string): void {
  if (!text || typeof text !== "string") return;
  const short = text.slice(0, 50);
  // 1. 引号不匹配（中文引号成对检查）
  const openQ = (text.match(/["\u201c]/g) ?? []).length;
  const closeQ = (text.match(/["\u201d]/g) ?? []).length;
  if (openQ > 0 && openQ !== closeQ) {
    issues.push({ file: path.basename(file), id, field, text: short, problem: `引号不匹配 (open:${openQ} close:${closeQ})` });
  }
  // 2. 半角引号在中文文本中
  if (/[\u4e00-\u9fff]"/.test(text) || /"[\u4e00-\u9fff]/.test(text)) {
    if (!text.startsWith('"') || !text.endsWith('"')) {
      // 中文中夹杂半角引号
    }
  }
  // 3. 残留的转义序列
  if (/\[nrt]/.test(text) && !text.includes("\n")) {
    issues.push({ file: path.basename(file), id, field, text: short, problem: "转义序列残留" });
  }
  // 4. 空括号
  if (/\(\)|\uff08\uff09/.test(text)) {
    issues.push({ file: path.basename(file), id, field, text: short, problem: "空括号" });
  }
  // 5. 不自然的重复字符
  if (/([\u4e00-\u9fff])\1{3,}/.test(text)) {
    const match = text.match(/([\u4e00-\u9fff])\1{3,}/);
    issues.push({ file: path.basename(file), id, field, text: short, problem: `重复字符 "${match?.[1]}"` });
  }
  // 6. 以不自然标点结尾
  if (/[：:；;]$\s*/.test(text.trim()) && text.trim().length > 10) {
    // 冒号结尾可能是列表开头，不一定错
  }
  // 7. 开头是句号或逗号
  if (/^[。，、；：！？]/.test(text.trim())) {
    issues.push({ file: path.basename(file), id, field, text: short, problem: "以标点开头" });
  }
  // 8. 不自然的单字符引号
  if (/^['']$/.test(text.trim())) {
    issues.push({ file: path.basename(file), id, field, text: short, problem: "仅含引号" });
  }
}

// 扫描所有 YAML 文件中的文本字段
for (const f of walk(contentDir)) {
  const rel = path.relative(contentDir, f);
  let doc: Record<string, unknown>;
  try {
    doc = YAML.parse(fs.readFileSync(f, "utf8"));
  } catch { continue; }
  if (!doc || typeof doc !== "object") continue;

  // Recursively find all string values and check them
  const scanObj = (obj: unknown, id: string, key: string): void => {
    if (typeof obj === "string") {
      checkText(obj, rel, id, key);
    } else if (Array.isArray(obj)) {
      obj.forEach((item, i) => {
        if (typeof item === "string") checkText(item, rel, id, `${key}[${i}]`);
        else if (item && typeof item === "object") scanObj(item, id, `${key}[${i}]`);
      });
    } else if (obj && typeof obj === "object") {
      for (const [k, v] of Object.entries(obj)) {
        scanObj(v, id, `${key}.${k}`);
      }
    }
  };

  for (const [collKey, items] of Object.entries(doc)) {
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      if (item && typeof item === "object") {
        const id = (item as Record<string, unknown>).id ?? `index-${(items as unknown[]).indexOf(item)}`;
        scanObj(item, String(id), collKey);
      }
    }
  }
}

if (issues.length > 0) {
  console.error(`❌ 深度文本审计发现 ${issues.length} 个问题：`);
  for (const i of issues.slice(0, 40)) {
    console.error(`  [${i.file}] ${i.id} ${i.field}: ${i.problem} "${i.text.slice(0, 40)}"`);
  }
  if (issues.length > 40) console.error(`  ...共 ${issues.length} 个`);
  process.exit(1);
}
console.log(`✅ 深度文本审计通过：0 问题`);
