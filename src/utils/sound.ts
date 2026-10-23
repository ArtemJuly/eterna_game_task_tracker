let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!sharedCtx) {
      const AudioContextClass =
        window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      sharedCtx = new AudioContextClass();
    }
    return sharedCtx;
  } catch {
    return null;
  }
}

// Safari (more strictly than Chrome) only lets an AudioContext actually produce
// sound once it's been resumed from inside a real user gesture — a context
// created fresh from a timer callback (like a pomodoro finishing on its own)
// just stays silently suspended. Call this from click handlers so the shared
// context is unlocked well before any timer-driven sound needs to play.
export function unlockAudio(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

function playTone(ctx: AudioContext, freq: number, startAt: number, duration: number, type: OscillatorType, peakGain: number) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.value = freq;

  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(peakGain, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.start(startAt);
  oscillator.stop(startAt + duration);
}

export function playDing(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const play = () => playTone(ctx, 880, ctx.currentTime, 0.8, 'sine', 0.3);
  if (ctx.state === 'suspended') {
    ctx.resume().then(play).catch(() => {});
  } else {
    play();
  }
}

// Two soft descending notes on a triangle wave — deliberately distinct from playDing's
// single sine tone, so a finished break doesn't sound like a finished pomodoro.
export function playChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const notes = [659.25, 523.25];
  const play = () => {
    notes.forEach((freq, i) => playTone(ctx, freq, ctx.currentTime + i * 0.22, 0.6, 'triangle', 0.25));
  };
  if (ctx.state === 'suspended') {
    ctx.resume().then(play).catch(() => {});
  } else {
    play();
  }
}
