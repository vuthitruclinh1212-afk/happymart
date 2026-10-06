/**
 * Web Audio API synthesizer for supermarket sound effects:
 * - High-pitched checkout barcode scanner "BEEP!"
 * - Cash register "Cha-ching!" coin sound
 * - Soft tactile button pop
 * - Upbeat achievement chime fanfare
 */

let isAudioMuted = false;

export const setAudioMuted = (muted: boolean) => {
  isAudioMuted = muted;
  try {
    localStorage.setItem('hm_muted', String(muted));
  } catch {
    // Ignore storage errors
  }
};

export const getAudioMuted = (): boolean => {
  try {
    return localStorage.getItem('hm_muted') === 'true';
  } catch {
    return false;
  }
};

isAudioMuted = getAudioMuted();

const getAudioContext = (): AudioContext | null => {
  if (isAudioMuted) return null;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    return new AudioCtx();
  } catch {
    return null;
  }
};

// 1. Crisp Supermarket Barcode Scanner "BEEP!"
export const playScannerBeep = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Classic POS scanner pitch (1850Hz ~ 2100Hz)
    osc.frequency.setValueAtTime(1950, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(2150, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) {
    console.debug('Audio playback error', e);
  }
};

// 2. Playful Cash Register / Coins "Cha-ching!"
export const playCashRegister = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const notes = [987.77, 1318.51, 1567.98]; // B5, E6, G6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.07);

      gain.gain.setValueAtTime(0.08, ctx.currentTime + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.07 + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.07);
      osc.stop(ctx.currentTime + idx * 0.07 + 0.2);
    });
  } catch (e) {
    console.debug('Audio error', e);
  }
};

// 3. Soft tactile UI pop
export const playSoftPop = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.07, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch (e) {
    console.debug('Audio error', e);
  }
};

// 4. Achievement Unlock Fanfare
export const playFanfare = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const arpeggio = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    arpeggio.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const startTime = ctx.currentTime + idx * 0.1;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.1, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.35);
    });
  } catch (e) {
    console.debug('Audio error', e);
  }
};
