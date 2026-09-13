/** 音频（TASK-O004）：WebAudio 合成音效，无二进制资源，可全局关闭 */
let ctx: AudioContext | null = null;
let enabled = true;
let volume = 0.6;

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

export function setAudioEnabled(v: boolean): void {
  enabled = v;
}
export function setVolume(v: number): void {
  volume = Math.max(0, Math.min(1, v / 100));
}

function tone(freq: number, duration: number, type: OscillatorType, when = 0): void {
  if (!enabled || volume <= 0) return;
  const c = ensureCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume * 0.12, c.currentTime + when);
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + when + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(c.currentTime + when);
  osc.stop(c.currentTime + when + duration + 0.05);
}

// ---- BGM（O004）：环境合成垫底乐，循环播放，随主音量静音 ----
let bgm: { oscs: OscillatorNode[]; gain: GainNode; lfo: OscillatorNode } | null = null;

export function startBGM(): void {
  if (!enabled || volume <= 0 || bgm) return;
  const c = ensureCtx();
  if (!c) return;
  const gain = c.createGain();
  gain.gain.value = 0;
  gain.gain.linearRampToValueAtTime(volume * 0.05, c.currentTime + 3);
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 800;
  const lfo = c.createOscillator();
  const lfoGain = c.createGain();
  lfo.frequency.value = 0.08;
  lfoGain.gain.value = volume * 0.02;
  lfo.connect(lfoGain).connect(gain.gain);
  const oscs = [110, 164.81, 220].map((f, i) => {
    const o = c.createOscillator();
    o.type = i === 2 ? "triangle" : "sine";
    o.frequency.value = f;
    o.connect(filter);
    o.start();
    return o;
  });
  filter.connect(gain).connect(c.destination);
  lfo.start();
  bgm = { oscs, gain, lfo };
}

export function stopBGM(): void {
  if (!bgm) return;
  try { bgm.oscs.forEach((o) => o.stop()); bgm.lfo.stop(); } catch { /* already stopped */ }
  bgm = null;
}

export function refreshBGM(): void {
  if (!enabled || volume <= 0) stopBGM();
  else if (!bgm) startBGM();
}

export const sfx = {
  choice: (): void => tone(520, 0.08, "sine"),
  success: (): void => {
    tone(523, 0.12, "sine");
    tone(659, 0.12, "sine", 0.1);
    tone(784, 0.18, "sine", 0.2);
  },
  warning: (): void => {
    tone(330, 0.14, "square");
    tone(277, 0.2, "square", 0.12);
  },
  ending: (): void => {
    tone(392, 0.2, "sine");
    tone(494, 0.2, "sine", 0.18);
    tone(587, 0.34, "sine", 0.36);
  },
};
