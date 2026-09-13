// 通用工具：确定性随机、数值、ID
export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

let uidCounter = 0;
export function uid(prefix: string): string {
  uidCounter = (uidCounter + 1) % 1_000_000;
  return `${prefix}_${Date.now().toString(36)}_${uidCounter.toString(36)}`;
}

export function deepClone<T>(v: T): T {
  return structuredClone(v);
}

export function weightedPick<T extends { weight: number }>(
  items: T[],
  rng: () => number,
): T | undefined {
  if (items.length === 0) return undefined;
  const total = items.reduce((s, i) => s + Math.max(0, i.weight), 0);
  if (total <= 0) return items[rng() * items.length | 0];
  let roll = rng() * total;
  for (const item of items) {
    roll -= Math.max(0, item.weight);
    if (roll <= 0) return item;
  }
  return items[items.length - 1]!;
}

export function todayISO(): string {
  return new Date().toISOString();
}

export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const v = vars[key];
    return v === undefined ? `{{${key}}}` : String(v);
  });
}
