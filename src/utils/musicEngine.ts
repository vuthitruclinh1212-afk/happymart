import { FavoriteSong } from '../types';
import { getAudioFile, normalizeAudioUrl } from './audioStorage';

/**
 * Supermarket Music Synthesizer & High-Fidelity Audio Engine
 * Plays local uploaded MP3 files, online audio streams, or procedural Lo-Fi / pastel background music.
 */

export interface MusicPlayerState {
  isPlaying: boolean;
  song: FavoriteSong | null;
  isLoading: boolean;
  error: string | null;
  currentTime: number;
  duration: number;
  volume: number;
}

let activeAudioElement: HTMLAudioElement | null = null;
let currentBlobUrl: string | null = null;
let synthAudioContext: AudioContext | null = null;
let synthTimerId: any = null;
let currentPlayingSong: FavoriteSong | null = null;
let musicVolume: number = 0.5;
let isPlayingState: boolean = false;
let isLoadingState: boolean = false;
let playbackError: string | null = null;
let audioCurrentTime: number = 0;
let audioDuration: number = 0;

let onStateChangeCallback:
  | ((isPlaying: boolean, song: FavoriteSong | null, state?: MusicPlayerState) => void)
  | null = null;

export const setMusicStateListener = (
  cb: (isPlaying: boolean, song: FavoriteSong | null, state?: MusicPlayerState) => void
) => {
  onStateChangeCallback = cb;
};

const notifyChange = () => {
  if (onStateChangeCallback) {
    const state: MusicPlayerState = {
      isPlaying: isPlayingState,
      song: currentPlayingSong,
      isLoading: isLoadingState,
      error: playbackError,
      currentTime: audioCurrentTime,
      duration: audioDuration,
      volume: musicVolume,
    };
    onStateChangeCallback(isPlayingState, currentPlayingSong, state);
  }
};

export const getMusicVolume = (): number => musicVolume;

export const setMusicVolume = (vol: number) => {
  musicVolume = Math.max(0, Math.min(1, vol));
  if (activeAudioElement) {
    activeAudioElement.volume = musicVolume;
  }
  notifyChange();
};

export const isMusicPlaying = (): boolean => isPlayingState;
export const isMusicLoading = (): boolean => isLoadingState;
export const getActiveSong = (): FavoriteSong | null => currentPlayingSong;
export const getPlaybackError = (): string | null => playbackError;
export const getAudioCurrentTime = (): number => audioCurrentTime;
export const getAudioDuration = (): number => audioDuration;

export const clearPlaybackError = () => {
  playbackError = null;
  notifyChange();
};

export const seekMusic = (timeInSeconds: number) => {
  if (activeAudioElement && isFinite(timeInSeconds)) {
    activeAudioElement.currentTime = Math.max(0, Math.min(timeInSeconds, activeAudioElement.duration || 0));
    audioCurrentTime = activeAudioElement.currentTime;
    notifyChange();
  }
};

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
 * Cleanup previous audio element and blob URLs
 */
const cleanupAudioElement = () => {
  if (activeAudioElement) {
    activeAudioElement.pause();
    activeAudioElement.removeAttribute('src');
    activeAudioElement.load();
    activeAudioElement = null;
  }
  if (currentBlobUrl) {
    try {
      URL.revokeObjectURL(currentBlobUrl);
    } catch {
      // ignore
    }
    currentBlobUrl = null;
  }
};

/**
 * Play a specific favorite song.
 * Guaranteed to play the user's MP3 file or audio stream.
 * Does NOT silently replace user MP3s with synthesizer loops!
 */
export const playSong = async (song: FavoriteSong) => {
  // Reset previous playback
  cleanupAudioElement();
  stopSynthLoop();

  currentPlayingSong = song;
  playbackError = null;
  audioCurrentTime = 0;
  audioDuration = 0;

  // 1. Check if there's a stored MP3 in IndexedDB for this song
  let targetPlayUrl: string | null = null;
  try {
    const localRecord = await getAudioFile(song.id);
    if (localRecord && localRecord.blob) {
      currentBlobUrl = URL.createObjectURL(localRecord.blob);
      targetPlayUrl = currentBlobUrl;
    }
  } catch (err) {
    console.warn('Error reading from audio storage:', err);
  }

  // 2. If no local record in IndexedDB, check song.audioUrl
  if (!targetPlayUrl && song.audioUrl?.trim()) {
    targetPlayUrl = normalizeAudioUrl(song.audioUrl.trim());
  }

  // 3. If an audio target exists (user provided an MP3 file or URL), play it!
  if (targetPlayUrl) {
    isLoadingState = true;
    isPlayingState = true;
    notifyChange();

    try {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';
      audio.volume = musicVolume;
      audio.loop = true;

      audio.ontimeupdate = () => {
        audioCurrentTime = audio.currentTime || 0;
        audioDuration = audio.duration || 0;
        notifyChange();
      };

      audio.onloadedmetadata = () => {
        audioDuration = audio.duration || 0;
        isLoadingState = false;
        notifyChange();
      };

      audio.oncanplay = () => {
        isLoadingState = false;
        notifyChange();
      };

      audio.onerror = () => {
        isLoadingState = false;
        isPlayingState = false;
        playbackError =
          'Không thể phát file/link âm thanh này (có thể do lỗi định dạng hoặc máy chủ chặn truy cập). Hãy bấm tải file MP3 trực tiếp từ máy để phát 100% chuẩn xác!';
        cleanupAudioElement();
        notifyChange();
      };

      audio.src = targetPlayUrl;
      activeAudioElement = audio;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise;
      }

      isLoadingState = false;
      isPlayingState = true;
      notifyChange();
      return;
    } catch (err: any) {
      console.warn('Audio play failed:', err);
      isLoadingState = false;
      isPlayingState = false;
      playbackError =
        err?.message?.includes('interact')
          ? 'Trình duyệt yêu cầu bạn chạm vào màn hình trước khi phát âm thanh.'
          : 'Không thể phát nhạc MP3 này. Vui lòng thử tải file .mp3 trực tiếp từ thiết bị.';
      cleanupAudioElement();
      notifyChange();
      return;
    }
  }

  // 4. If this is explicitly a synthesizer BGM track (no audioUrl and no MP3 file)
  isLoadingState = false;
  isPlayingState = true;
  playbackError = null;
  notifyChange();
  startSynthLoop(song.synthType || 'lofi');
};

/**
 * Stop currently playing music
 */
export const stopMusic = () => {
  cleanupAudioElement();
  stopSynthLoop();
  isPlayingState = false;
  isLoadingState = false;
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
