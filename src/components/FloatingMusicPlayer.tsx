import React, { useState, useEffect } from 'react';
import {
  Music,
  Play,
  Pause,
  SkipForward,
  Heart,
  Volume2,
  ChevronDown,
  ChevronUp,
  Disc3,
  Radio,
  FileAudio,
  AlertCircle,
} from 'lucide-react';
import { FavoriteSong } from '../types';
import { playSoftPop } from '../utils/audio';
import {
  isMusicPlaying,
  getActiveSong,
  playSong,
  stopMusic,
  setMusicStateListener,
  getAudioCurrentTime,
  getAudioDuration,
  getPlaybackError,
  seekMusic,
  MusicPlayerState,
} from '../utils/musicEngine';

interface FloatingMusicPlayerProps {
  songs: FavoriteSong[];
  onOpenStation: () => void;
  onToggleFavoriteSong: (id: string) => void;
}

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const FloatingMusicPlayer: React.FC<FloatingMusicPlayerProps> = ({
  songs,
  onOpenStation,
  onToggleFavoriteSong,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(() => isMusicPlaying());
  const [currentSong, setCurrentSong] = useState<FavoriteSong | null>(() => getActiveSong() || songs[0] || null);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(() => getAudioCurrentTime());
  const [duration, setDuration] = useState<number>(() => getAudioDuration());
  const [error, setError] = useState<string | null>(() => getPlaybackError());

  useEffect(() => {
    setMusicStateListener((playing, song, state?: MusicPlayerState) => {
      setIsPlaying(playing);
      if (song) setCurrentSong(song);
      if (state) {
        setCurrentTime(state.currentTime);
        setDuration(state.duration);
        setError(state.error);
      }
    });
  }, []);

  if (songs.length === 0) return null;

  const displaySong = currentSong || songs[0];
  const isMp3 = displaySong.hasLocalAudioFile || displaySong.audioSourceType === 'file' || !!displaySong.audioUrl;

  const handlePlayToggle = () => {
    playSoftPop();
    if (isPlaying) {
      stopMusic();
    } else {
      playSong(displaySong);
    }
  };

  const handleNextTrack = () => {
    playSoftPop();
    if (songs.length === 0) return;
    const currentIndex = songs.findIndex((s) => s.id === displaySong?.id);
    const nextIndex = (currentIndex + 1) % songs.length;
    const nextSong = songs[nextIndex];
    playSong(nextSong);
  };

  return (
    <aside aria-label="Quầy phát nhạc siêu thị" className="fixed bottom-4 right-4 z-40 animate-fadeIn">
      {isMinimized ? (
        /* Minimized Disc Pill */
        <button
          type="button"
          onClick={() => {
            playSoftPop();
            setIsMinimized(false);
          }}
          className={`p-3 rounded-full shadow-lg border-2 transition-all flex items-center justify-center ${
            isPlaying
              ? 'bg-gradient-to-tr from-pink-500 to-purple-600 text-white border-pink-300 ring-2 ring-pink-200 animate-spin-slow'
              : 'bg-white text-gray-700 border-pink-200 hover:bg-pink-50'
          }`}
          title="Mở Quầy Nhạc Siêu Thị"
        >
          <Disc3 className="w-5 h-5" />
        </button>
      ) : (
        /* Expanded Floating Player */
        <div className="bg-white/95 backdrop-blur-md p-2.5 sm:p-3 rounded-3xl border-2 border-pink-200 shadow-xl flex flex-col gap-1.5 text-xs max-w-[90vw] sm:max-w-sm">
          <div className="flex items-center gap-2.5">
            {/* Vinyl Disc Icon */}
            <button
              type="button"
              onClick={onOpenStation}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0 transition-all ${
                isPlaying
                  ? 'bg-gradient-to-tr from-pink-500 to-purple-600 text-white animate-spin-slow shadow-xs'
                  : 'bg-pink-100 text-pink-700'
              }`}
              title="Xem danh sách bài hát yêu thích"
            >
              {displaySong.moodIcon || '🥑'}
            </button>

            {/* Song Info */}
            <div
              onClick={onOpenStation}
              className="min-w-0 cursor-pointer flex-1 select-none pr-1"
              title="Bấm để mở Quầy Nhạc Siêu Thị"
            >
              <div className="flex items-center gap-1.5">
                <span className="font-black text-gray-900 truncate block text-xs">
                  {displaySong.title}
                </span>
                {displaySong.isFavorite && (
                  <Heart className="w-2.5 h-2.5 fill-rose-500 text-rose-500 shrink-0" />
                )}
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-black shrink-0 ${
                    isMp3
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-purple-100 text-purple-800'
                  }`}
                >
                  {isMp3 ? 'MP3' : 'BGM'}
                </span>
              </div>
              <span className="text-[10px] text-gray-500 truncate block font-medium">
                {displaySong.artist} · <span className="text-purple-600 font-semibold">{displaySong.genre}</span>
              </span>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Play/Pause */}
              <button
                type="button"
                onClick={handlePlayToggle}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                  isPlaying
                    ? 'bg-pink-500 text-white shadow-2xs'
                    : 'bg-gray-100 hover:bg-pink-100 text-gray-700'
                }`}
                title={isPlaying ? 'Tạm dừng' : 'Phát nhạc'}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
              </button>

              {/* Next Track */}
              <button
                type="button"
                onClick={handleNextTrack}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                title="Bài tiếp theo"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>

              {/* Favorite toggle */}
              <button
                type="button"
                onClick={() => {
                  playSoftPop();
                  onToggleFavoriteSong(displaySong.id);
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                title="Thả tim"
              >
                <Heart
                  className={`w-3.5 h-3.5 ${
                    displaySong.isFavorite ? 'fill-rose-500 text-rose-500' : ''
                  }`}
                />
              </button>

              {/* Minimize */}
              <button
                type="button"
                onClick={() => {
                  playSoftPop();
                  setIsMinimized(true);
                }}
                className="p-1 text-gray-300 hover:text-gray-600 rounded-md"
                title="Thu nhỏ"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Progress bar if playing MP3 with duration */}
          {duration > 0 && isPlaying && (
            <div className="pt-0.5 px-0.5 space-y-0.5">
              <div className="flex justify-between text-[9px] text-gray-400 font-mono">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
              <input
                type="range"
                min="0"
                max={duration}
                step="0.5"
                value={currentTime}
                onChange={(e) => seekMusic(Number(e.target.value))}
                className="w-full accent-pink-500 cursor-pointer h-1 bg-pink-100 rounded-lg"
              />
            </div>
          )}

          {/* Warning indicator if playback error */}
          {error && (
            <div
              onClick={onOpenStation}
              className="text-[10px] text-rose-700 bg-rose-50 p-1.5 rounded-lg border border-rose-200 cursor-pointer flex items-center gap-1 font-semibold truncate"
              title={error}
            >
              <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
              <span className="truncate">Lỗi tải link nhạc. Bấm để đổi bài/tải file MP3</span>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
