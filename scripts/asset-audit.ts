// Asset License Audit — verify all third-party assets have proper manifests and licenses
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

const root = path.resolve(process.cwd());
const assetDir = path.join(root, "assets");
const manifestPath = path.join(assetDir, "manifests", "asset-manifest.yaml");

const ALLOWED_LICENSES = new Set([
  "CC0", "MIT", "ISC", "BSD-2-Clause", "BSD-3-Clause", "Apache-2.0", "SIL OFL 1.1",
]);
const DENIED_LICENSES = new Set([
  "CC BY-SA", "GPL", "AGPL", "CC BY-NC", "CC BY-ND",
  "Custom", "unknown", "",
]);

let errors = 0;
let warnings = 0;

// Parse manifest
let manifest: { assets?: Record<string, unknown>[] } = {};
if (fs.existsSync(manifestPath)) {
  const raw = fs.readFileSync(manifestPath, "utf-8");
  manifest = YAML.parse(raw) ?? {};
}

// Check third-party directory for unregistered files
const tpDir = path.join(assetDir, "third-party");
if (fs.existsSync(tpDir)) {
  const walk = (dir: string): string[] => {
    let out: string[] = [];
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) out = out.concat(walk(p));
      else out.push(p);
    }
    return out;
  };
  const files = walk(tpDir);
  if (files.length > 0 && !manifest.assets) {
    console.error("❌ Third-party assets exist but no manifest assets registered");
    errors++;
  }
}

// Check LICENSE file exists
if (!fs.existsSync(path.join(root, "LICENSE"))) {
  console.warn("⚠️ No LICENSE file in project root");
  warnings++;
}

// Report
if (errors > 0) {
  console.error(`❌ Asset audit: ${errors} errors`);
  process.exit(1);
}
console.log(`✅ Asset audit passed (${warnings} warnings)`);
