// Âm thanh bíp/ting nhẹ bằng Web Audio API — không dùng file mp3 ngoài.
let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, delay: number, dur: number, type: OscillatorType = "sine", vol = 0.08) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

export type SoundKind = "buy" | "sell" | "quest" | "bad" | "level" | "click" | "travel";

export function playSound(kind: SoundKind, enabled: boolean) {
  if (!enabled) return;
  switch (kind) {
    case "buy":
      tone(660, 0, 0.12);
      tone(880, 0.08, 0.15);
      break;
    case "sell":
      tone(880, 0, 0.1);
      tone(1174, 0.07, 0.12);
      tone(1568, 0.14, 0.18);
      break;
    case "quest":
      tone(523, 0, 0.12);
      tone(659, 0.09, 0.12);
      tone(784, 0.18, 0.2);
      break;
    case "bad":
      tone(220, 0, 0.2, "triangle", 0.07);
      tone(180, 0.12, 0.25, "triangle", 0.07);
      break;
    case "level":
      tone(523, 0, 0.12);
      tone(659, 0.1, 0.12);
      tone(784, 0.2, 0.12);
      tone(1046, 0.3, 0.25);
      break;
    case "travel":
      tone(440, 0, 0.1, "triangle");
      tone(554, 0.1, 0.14, "triangle");
      break;
    case "click":
      tone(1200, 0, 0.05, "sine", 0.04);
      break;
  }
}
