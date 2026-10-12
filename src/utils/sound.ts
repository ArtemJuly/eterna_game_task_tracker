export function playDing(): void {
  try {
    const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextClass();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = 880;

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.8);
    oscillator.onended = () => ctx.close();
  } catch {
    // audio not available in this environment — fail silently
  }
}

// Two soft descending notes on a triangle wave — deliberately distinct from playDing's
// single sine tone, so a finished break doesn't sound like a finished pomodoro.
export function playChime(): void {
  try {
    const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextClass();
    const notes = [659.25, 523.25];

    notes.forEach((freq, i) => {
      const startAt = ctx.currentTime + i * 0.22;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = 'triangle';
      oscillator.frequency.value = freq;

      gain.gain.setValueAtTime(0, startAt);
      gain.gain.linearRampToValueAtTime(0.25, startAt + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.6);

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.start(startAt);
      oscillator.stop(startAt + 0.6);
      if (i === notes.length - 1) oscillator.onended = () => ctx.close();
    });
  } catch {
    // audio not available in this environment — fail silently
  }
}
