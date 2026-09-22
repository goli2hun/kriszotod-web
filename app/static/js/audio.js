const STORAGE_KEY = 'otodolo-sound';

let audioContext = null;
let soundEnabled = localStorage.getItem(STORAGE_KEY) !== 'off';

export function isSoundEnabled() {
  return soundEnabled;
}

export function unlockAudio() {
  ensureContext();
}

export function toggleSound() {
  soundEnabled = !soundEnabled;
  localStorage.setItem(STORAGE_KEY, soundEnabled ? 'on' : 'off');

  if (soundEnabled) ensureContext();
  return soundEnabled;
}

export function playClick() {
  tone({ startFrequency: 620, endFrequency: 510, duration: 0.045, volume: 0.018, type: 'sine' });
}

export function playPlace(player) {
  const primary = player === 1
    ? { startFrequency: 390, endFrequency: 255 }
    : { startFrequency: 520, endFrequency: 320 };

  tone({ ...primary, duration: 0.11, volume: 0.034, type: 'sine' });
  tone({
    startFrequency: player === 1 ? 760 : 880,
    endFrequency: player === 1 ? 580 : 660,
    duration: 0.055,
    volume: 0.012,
    type: 'triangle',
    delay: 0.018
  });
}

export function playError() {
  tone({ startFrequency: 155, endFrequency: 125, duration: 0.075, volume: 0.024, type: 'square' });
  tone({ startFrequency: 135, endFrequency: 105, duration: 0.075, volume: 0.018, type: 'square', delay: 0.085 });
}

export function playWin() {
  const notes = [
    [523.25, 0],
    [659.25, 0.09],
    [783.99, 0.18],
    [1046.5, 0.29]
  ];

  for (const [frequency, delay] of notes) {
    tone({
      startFrequency: frequency,
      endFrequency: frequency * 1.015,
      duration: 0.22,
      volume: 0.038,
      type: 'triangle',
      delay
    });
  }

  tone({
    startFrequency: 261.63,
    endFrequency: 196,
    duration: 0.5,
    volume: 0.018,
    type: 'sine',
    delay: 0.04
  });
}

function ensureContext() {
  if (!soundEnabled) return null;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioContext) audioContext = new AudioContextClass();
  if (audioContext.state === 'suspended') audioContext.resume();

  return audioContext;
}

function tone({
  startFrequency,
  endFrequency,
  duration,
  volume,
  type,
  delay = 0
}) {
  const ctx = ensureContext();
  if (!ctx) return;

  const startAt = ctx.currentTime + delay;
  const endAt = startAt + duration;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(startFrequency, startAt);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), endAt);

  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), startAt + Math.min(0.012, duration / 3));
  gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(startAt);
  oscillator.stop(endAt + 0.015);
}
