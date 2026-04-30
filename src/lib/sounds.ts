let _ctx: AudioContext | null = null;
let _muted = false;

function ctx(): AudioContext | null {
  if (_muted) return null;
  if (typeof window === "undefined") return null;
  if (!_ctx) {
    _ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
  }
  if (_ctx.state === "suspended") _ctx.resume();
  return _ctx;
}

export function isMuted() { return _muted; }
export function setMuted(v: boolean) { _muted = v; }

function tone(
  freq: number,
  startOffset: number,
  duration: number,
  volume = 0.25,
  type: OscillatorType = "sine"
) {
  const c = ctx();
  if (!c) return;
  const osc  = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = type;
  osc.frequency.value = freq;
  const t = c.currentTime + startOffset;
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.start(t);
  osc.stop(t + duration);
}

export function playCorrect() {
  // Ascending C-E-G-C arpeggio
  [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.35, 0.28));
}

export function playWrong() {
  tone(220, 0, 0.18, 0.12, "sawtooth");
}

export function playHint() {
  tone(1100, 0, 0.22, 0.15);
  tone(880,  0.12, 0.22, 0.12);
}

export function playTick() {
  tone(660, 0, 0.07, 0.08, "square");
}

export function playRoundEnd() {
  [523, 659, 784, 1047, 1047].forEach((f, i) => tone(f, i * 0.12, 0.4, 0.22));
}

export function playGameEnd() {
  [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) =>
    tone(f, i * 0.13, 0.5, 0.2)
  );
}
