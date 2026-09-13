import { parseContentDoc, buildIndex, validateCrossRefs, type ContentIndex, type ContentIssue } from "@metis/content-schema";
import YAML from "yaml";

/** 渲染端内容加载：构建时把 content 目录下全部 YAML 内联进包（避免 renderer 读文件系统） */
const rawModules = import.meta.glob("../../../../content/**/*.yaml", { query: "?raw", import: "default", eager: true });

export interface LoadedContent {
  index: ContentIndex;
  issues: ContentIssue[];
}

let cached: LoadedContent | null = null;

export function loadContent(): LoadedContent {
  if (cached) return cached;
  const docs: { file: string; parsed: ReturnType<typeof parseContentDoc>["parsed"] }[] = [];
  const issues: ContentIssue[] = [];
  for (const [file, raw] of Object.entries(rawModules)) {
    try {
      const parsed = YAML.parse(raw as string);
      const r = parseContentDoc(file.replace(/^.*content[\\/]/, ""), parsed);
      issues.push(...r.issues);
      docs.push({ file, parsed: r.parsed });
    } catch (err) {
      issues.push({ file, collection: "file", index: 0, message: `YAML 解析失败: ${err instanceof Error ? err.message : String(err)}` });
    }
  }
  const { index, issues: idxIssues } = buildIndex(docs);
  issues.push(...idxIssues);
  issues.push(...validateCrossRefs(index));
  cached = { index, issues };
  return cached;
}
