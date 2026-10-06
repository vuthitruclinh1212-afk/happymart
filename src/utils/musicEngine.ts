import { FavoriteSong } from '../types';

/**
 * Supermarket Music Synthesizer & Audio Stream Engine
 * Plays audio files or generates procedural cozy Lo-Fi / pastel background music using Web Audio API.
 */

let activeAudioElement: HTMLAudioElement | null = null;
let synthAudioContext: AudioContext | null = null;
let synthTimerId: any = null;
let currentPlayingSong: FavoriteSong | null = null;
let musicVolume: number = 0.4;
let isPlayingState: boolean = false;
let onStateChangeCallback: ((isPlaying: boolean, song: FavoriteSong | null) => void) | null = null;

export const setMusicStateListener = (cb: (isPlaying: boolean, song: FavoriteSong | null) => void) => {
  onStateChangeCallback = cb;
};

const notifyChange = () => {
  if (onStateChangeCallback) {
    onStateChangeCallback(isPlayingState, currentPlayingSong);
  }
};

export const getMusicVolume = (): number => musicVolume;

export const setMusicVolume = (vol: number) => {
  musicVolume = Math.max(0, Math.min(1, vol));
  if (activeAudioElement) {
    activeAudioElement.volume = musicVolume;
  }
};

export const isMusicPlaying = (): boolean => isPlayingState;
export const getActiveSong = (): FavoriteSong | null => currentPlayingSong;

const getSynthContext = (): AudioContext | null => {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!synthAudioContext || synthAudioContext.state === 'closed') {
      synthAudioContext = new AudioCtx();
    }
    if (synthAudioContext.state === 'suspended') {
      synthAudioContext.resume();
    }
    return synthAudioContext;
  } catch {
    return null;
  }
};

// Procedural Supermarket Lo-Fi Chords & Melodies
const CHORD_PROGRESSIONS: Record<string, number[][]> = {
  lofi: [
    [261.63, 329.63, 392.0, 493.88], // Cmaj7
    [220.0, 261.63, 329.63, 392.0],  // Am7
    [293.66, 349.23, 440.0, 523.25], // Dm7
    [196.0, 246.94, 293.66, 349.23], // G7
  ],
  cafe: [
    [349.23, 440.0, 523.25, 659.25], // Fmaj7
    [329.63, 392.0, 493.88, 587.33], // Em7
    [293.66, 349.23, 440.0, 523.25], // Dm7
    [261.63, 329.63, 392.0, 523.25], // Cmaj7
  ],
  chime: [
    [523.25, 659.25, 783.99, 987.77], // C5 pentatonic
    [587.33, 698.46, 880.0, 1046.5],
    [659.25, 783.99, 987.77, 1174.66],
    [523.25, 783.99, 1046.5, 1318.51],
  ],
  bell: [
    [440.0, 554.37, 659.25, 830.61], // A maj7
    [369.99, 440.0, 554.37, 739.99], // F#m7
    [293.66, 369.99, 440.0, 587.33], // Dmaj7
    [329.63, 415.3, 493.88, 659.25],  // E7
  ],
  ambient: [
    [220.0, 277.18, 329.63, 440.0],
    [293.66, 369.99, 440.0, 587.33],
    [329.63, 392.0, 493.88, 659.25],
    [261.63, 329.63, 392.0, 523.25],
  ],
};

let stepIndex = 0;

function playSynthStep(synthType: string = 'lofi') {
  const ctx = getSynthContext();
  if (!ctx || !isPlayingState) return;

  try {
    const progression = CHORD_PROGRESSIONS[synthType] || CHORD_PROGRESSIONS.lofi;
    const chord = progression[stepIndex % progression.length];
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(musicVolume * 0.15, now);
    masterGain.connect(ctx.destination);

    // Play soft warm chord tones
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = synthType === 'chime' || synthType === 'bell' ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.3 / chord.length, now + 0.1 + idx * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(now + idx * 0.04);
      osc.stop(now + 1.8);
    });

    stepIndex++;
  } catch (err) {
    console.debug('Synth step error:', err);
  }
}

function startSynthLoop(synthType: string = 'lofi') {
  stopSynthLoop();
  stepIndex = 0;
  playSynthStep(synthType);
  synthTimerId = setInterval(() => {
    playSynthStep(synthType);
  }, 1900);
}

function stopSynthLoop() {
  if (synthTimerId) {
    clearInterval(synthTimerId);
    synthTimerId = null;
  }
}

/**
 * Play a specific favorite song
 */
export const playSong = async (song: FavoriteSong) => {
  stopMusic();

  currentPlayingSong = song;
  isPlayingState = true;
  notifyChange();

  // If song has a valid audio URL, attempt to stream/play it
  const url = song.audioUrl?.trim();
  if (url && (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:'))) {
    try {
      const audio = new Audio(url);
      audio.volume = musicVolume;
      audio.loop = true;

      audio.onerror = () => {
        console.warn('External audio URL failed, falling back to cozy supermarket synth generator.');
        startSynthLoop(song.synthType || 'lofi');
      };

      await audio.play();
      activeAudioElement = audio;
      return;
    } catch (err) {
      console.warn('Audio play failed, falling back to procedural synthesizer:', err);
    }
  }

  // Fallback / Procedural Supermarket Synth Loop
  startSynthLoop(song.synthType || 'lofi');
};

/**
 * Stop currently playing music
 */
export const stopMusic = () => {
  if (activeAudioElement) {
    activeAudioElement.pause();
    activeAudioElement.src = '';
    activeAudioElement = null;
  }
  stopSynthLoop();
  isPlayingState = false;
  notifyChange();
};

/**
 * Toggle playback
 */
export const togglePlaySong = (song: FavoriteSong) => {
  if (isPlayingState && currentPlayingSong?.id === song.id) {
    stopMusic();
  } else {
    playSong(song);
  }
};
