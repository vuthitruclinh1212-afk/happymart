import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Music,
  Play,
  Pause,
  Heart,
  Plus,
  Trash2,
  Volume2,
  VolumeX,
  Radio,
  Sparkles,
  Disc3,
  Search,
  Filter,
  Edit2,
  Check,
  Upload,
  AlertCircle,
  FileAudio,
  Globe,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { FavoriteSong } from '../types';
import { playSoftPop, playCashRegister } from '../utils/audio';
import {
  playSong,
  stopMusic,
  isMusicPlaying,
  getActiveSong,
  setMusicVolume,
  getMusicVolume,
  setMusicStateListener,
  getPlaybackError,
  getAudioCurrentTime,
  getAudioDuration,
  seekMusic,
  clearPlaybackError,
  MusicPlayerState,
} from '../utils/musicEngine';
import {
  saveAudioFile,
  normalizeAudioUrl,
  deleteAudioFile,
} from '../utils/audioStorage';

interface MusicStationModalProps {
  isOpen: boolean;
  onClose: () => void;
  songs: FavoriteSong[];
  onAddSong: (song: Omit<FavoriteSong, 'id'> & { id?: string }) => void;
  onEditSong?: (id: string, song: Partial<FavoriteSong>) => void;
  onToggleFavoriteSong: (id: string) => void;
  onDeleteSong: (id: string) => void;
}

const SYNTH_OPTIONS = [
  { id: 'lofi', label: 'Lo-Fi Chill Mart', icon: '🥑', desc: 'Hợp âm điện ấm áp, thư thái' },
  { id: 'cafe', label: 'Cozy Cafe Piano', icon: '☕', desc: 'Giai điệu piano jazz êm ái' },
  { id: 'chime', label: 'Pastel Chimes', icon: '🧋', desc: 'Chuông ngân tươi sáng ngọt ngào' },
  { id: 'bell', label: 'Crystal Bakery Bell', icon: '🥐', desc: 'Tiếng chuông tiệm bánh nhẹ nhàng' },
  { id: 'ambient', label: 'Midnight Ambient', icon: '🌙', desc: 'Giai điệu vũ trụ bồng bềnh' },
];

const PRESET_IDEAS = [
  { title: 'Cà Phê Sáng Chill', artist: 'Happy Mart Acoustic', genre: 'Acoustic Calm', icon: '☕', synth: 'cafe' },
  { title: 'Sài Gòn Mưa Rơi Lo-Fi', artist: 'Dopamine Beatmaker', genre: 'Lo-Fi Chill', icon: '🥑', synth: 'lofi' },
  { title: 'Trà Sữa Trân Châu Vui Vẻ', artist: 'Pastel Pop Studio', genre: 'Pastel Pop', icon: '🧋', synth: 'chime' },
  { title: 'Tiệm Bánh Paris Buổi Sáng', artist: 'Croissant Symphony', genre: 'Bakery Bell', icon: '🥐', synth: 'bell' },
  { title: 'Đi Chợ Đêm Konbini', artist: 'Midnight Grocer', genre: 'Ambient Dream', icon: '🌙', synth: 'ambient' },
];

const MOOD_ICONS = ['🥑', '☕', '🧋', '🥐', '🌙', '🎧', '🍓', '🎵', '🌸', '📻', '✨'];

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const MusicStationModal: React.FC<MusicStationModalProps> = ({
  isOpen,
  onClose,
  songs,
  onAddSong,
  onEditSong,
  onToggleFavoriteSong,
  onDeleteSong,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'favorites' | 'mp3' | 'bgm'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const [volume, setVolume] = useState<number>(() => getMusicVolume());

  // Player state from engine
  const [playerState, setPlayerState] = useState<MusicPlayerState>({
    isPlaying: isMusicPlaying(),
    song: getActiveSong(),
    isLoading: false,
    error: getPlaybackError(),
    currentTime: getAudioCurrentTime(),
    duration: getAudioDuration(),
    volume: getMusicVolume(),
  });

  // Source mode for new song: 'upload' (MP3 file) | 'url' (Web MP3) | 'synth' (BGM generator)
  const [audioSourceTab, setAudioSourceTab] = useState<'upload' | 'url' | 'synth'>('upload');

  // New song form fields
  const [newTitle, setNewTitle] = useState<string>('');
  const [newArtist, setNewArtist] = useState<string>('');
  const [newGenre, setNewGenre] = useState<string>('V-Pop / Acoustic');
  const [newAudioUrl, setNewAudioUrl] = useState<string>('');
  const [newSynthType, setNewSynthType] = useState<string>('lofi');
  const [newIcon, setNewIcon] = useState<string>('🎵');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState<boolean>(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Edit song form state
  const [editTitle, setEditTitle] = useState<string>('');
  const [editArtist, setEditArtist] = useState<string>('');
  const [editGenre, setEditGenre] = useState<string>('');
  const [editAudioUrl, setEditAudioUrl] = useState<string>('');
  const [editSynthType, setEditSynthType] = useState<string>('lofi');
  const [editIcon, setEditIcon] = useState<string>('🎵');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editFileName, setEditFileName] = useState<string>('');

  useEffect(() => {
    setMusicStateListener((_playing, _song, state) => {
      if (state) {
        setPlayerState({ ...state });
      } else {
        setPlayerState((prev) => ({
          ...prev,
          isPlaying: isMusicPlaying(),
          song: getActiveSong(),
          error: getPlaybackError(),
        }));
      }
    });
  }, []);

  // Cleanup preview audio on unmount or form close
  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      if (filePreviewUrl) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [filePreviewUrl]);

  if (!isOpen) return null;

  const currentPlaying = playerState.song;
  const isPlaying = playerState.isPlaying;

  const handlePlayToggle = (song: FavoriteSong) => {
    playSoftPop();
    // Stop in-form preview if any
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      setIsPreviewPlaying(false);
    }
    if (isPlaying && currentPlaying?.id === song.id) {
      stopMusic();
    } else {
      playSong(song);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    setMusicVolume(newVol);
  };

  const handleApplyPreset = (preset: typeof PRESET_IDEAS[0]) => {
    playSoftPop();
    setNewTitle(preset.title);
    setNewArtist(preset.artist);
    setNewGenre(preset.genre);
    setNewIcon(preset.icon);
    setNewSynthType(preset.synth);
    setAudioSourceTab('synth');
    setSelectedFile(null);
    setNewAudioUrl('');
    setShowAddForm(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    playSoftPop();
    setSelectedFile(file);

    // Auto fill title if empty
    if (!newTitle.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setNewTitle(cleanName);
    }
    if (!newArtist.trim()) {
      setNewArtist('Bài hát cá nhân');
    }

    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    const blobUrl = URL.createObjectURL(file);
    setFilePreviewUrl(blobUrl);

    // Stop current preview if playing
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      setIsPreviewPlaying(false);
    }
  };

  const handleTogglePreview = () => {
    playSoftPop();
    const testUrl = filePreviewUrl || (newAudioUrl.trim() ? normalizeAudioUrl(newAudioUrl.trim()) : null);
    if (!testUrl) return;

    if (isPreviewPlaying && previewAudioRef.current) {
      previewAudioRef.current.pause();
      setIsPreviewPlaying(false);
      return;
    }

    // Stop background music engine while previewing
    if (isPlaying) {
      stopMusic();
    }

    if (!previewAudioRef.current) {
      previewAudioRef.current = new Audio();
    }
    previewAudioRef.current.src = testUrl;
    previewAudioRef.current.volume = volume;
    previewAudioRef.current.onended = () => setIsPreviewPlaying(false);
    previewAudioRef.current.onerror = () => {
      setIsPreviewPlaying(false);
      alert('Không thể phát thử link/file này. Hãy chắc chắn link cho phép phát âm thanh trực tiếp!');
    };

    previewAudioRef.current
      .play()
      .then(() => setIsPreviewPlaying(true))
      .catch((err) => {
        console.warn('Preview error:', err);
        setIsPreviewPlaying(false);
      });
  };

  const handleStartEdit = (song: FavoriteSong) => {
    playSoftPop();
    setEditingSongId(song.id);
    setEditTitle(song.title);
    setEditArtist(song.artist);
    setEditGenre(song.genre);
    setEditAudioUrl(song.audioUrl || '');
    setEditSynthType(song.synthType || 'lofi');
    setEditIcon(song.moodIcon || '🎵');
    setEditFile(null);
    setEditFileName(song.fileName || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSongId || !editTitle.trim() || !editArtist.trim()) return;

    // If a new replacement file was picked in edit mode, save to IndexedDB
    let hasLocal = undefined;
    let fileName = undefined;
    let audioSourceType: 'file' | 'url' | 'synth' = editAudioUrl.trim() ? 'url' : 'synth';

    if (editFile) {
      await saveAudioFile(editingSongId, editFile, editFile.name);
      hasLocal = true;
      fileName = editFile.name;
      audioSourceType = 'file';
    }

    if (onEditSong) {
      onEditSong(editingSongId, {
        title: editTitle.trim(),
        artist: editArtist.trim(),
        genre: editGenre.trim() || 'Cozy Mart',
        audioUrl: editAudioUrl.trim() ? normalizeAudioUrl(editAudioUrl.trim()) : undefined,
        synthType: editSynthType as any,
        moodIcon: editIcon || '🎵',
        audioSourceType,
        ...(hasLocal !== undefined && { hasLocalAudioFile: hasLocal }),
        ...(fileName !== undefined && { fileName }),
      });
    }

    playCashRegister();
    setEditingSongId(null);
  };

  const handleCreateSongSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newArtist.trim()) {
      alert('Vui lòng nhập tên bài hát và nghệ sĩ!');
      return;
    }

    // Stop preview if running
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      setIsPreviewPlaying(false);
    }

    const newSongId = `song-${Date.now()}`;
    let finalAudioUrl: string | undefined = undefined;
    let hasLocalAudioFile = false;
    let fileName: string | undefined = undefined;
    let audioSourceType: 'file' | 'url' | 'synth' = 'synth';

    if (audioSourceTab === 'upload' && selectedFile) {
      // Save full file to IndexedDB for permanent persistent playback!
      await saveAudioFile(newSongId, selectedFile, selectedFile.name);
      hasLocalAudioFile = true;
      fileName = selectedFile.name;
      audioSourceType = 'file';
    } else if (audioSourceTab === 'url' && newAudioUrl.trim()) {
      finalAudioUrl = normalizeAudioUrl(newAudioUrl.trim());
      audioSourceType = 'url';
    } else {
      audioSourceType = 'synth';
    }

    playCashRegister();

    const createdSong: FavoriteSong = {
      id: newSongId,
      title: newTitle.trim(),
      artist: newArtist.trim(),
      genre: newGenre.trim() || (audioSourceType === 'synth' ? 'Lo-Fi Chill' : 'Nhạc Có Lời'),
      audioUrl: finalAudioUrl,
      isFavorite: true,
      moodIcon: newIcon || '🎵',
      duration: '3:00',
      synthType: (newSynthType as any) || 'lofi',
      createdAt: Date.now(),
      audioSourceType,
      fileName,
      hasLocalAudioFile,
    };

    onAddSong(createdSong);

    // Auto-play the newly added song immediately so user hears it right away!
    setTimeout(() => {
      playSong(createdSong);
    }, 150);

    // Reset form
    setNewTitle('');
    setNewArtist('');
    setNewAudioUrl('');
    setSelectedFile(null);
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
      setFilePreviewUrl(null);
    }
    setShowAddForm(false);
  };

  const filteredSongs = songs.filter((s) => {
    if (filterMode === 'favorites' && !s.isFavorite) return false;
    if (filterMode === 'mp3' && s.audioSourceType === 'synth' && !s.audioUrl && !s.hasLocalAudioFile) return false;
    if (filterMode === 'bgm' && (s.audioSourceType === 'file' || s.audioUrl || s.hasLocalAudioFile)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        s.genre.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#FFFDF9] w-full max-w-xl rounded-3xl border-2 border-pink-200 shadow-2xl p-4 sm:p-6 relative max-h-[92vh] flex flex-col overflow-hidden">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            playSoftPop();
            if (previewAudioRef.current) {
              previewAudioRef.current.pause();
              setIsPreviewPlaying(false);
            }
            onClose();
          }}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 bg-white rounded-full border border-gray-200 hover:bg-gray-100 transition-colors shadow-2xs z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-3 shrink-0 pr-10">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-indigo-500 text-white flex items-center justify-center text-2xl shadow-sm shrink-0">
            📻
          </div>
          <div>
            <span className="text-[11px] font-black text-pink-700 tracking-wider uppercase bg-pink-100 px-2 py-0.5 rounded-full">
              Quầy Nhạc Siêu Thị Dopamine
            </span>
            <h2 className="text-base sm:text-xl font-black text-gray-900 tracking-tight mt-0.5 flex items-center gap-2">
              Bài Hát MP3 Có Lời & Lo-Fi BGM 🎶
            </h2>
          </div>
        </div>

        {/* Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3.5">
          {/* Volume & Player Controls Bar */}
          <div className="p-3 bg-gradient-to-r from-purple-50 via-pink-50 to-amber-50 rounded-2xl border border-pink-200/80 flex flex-col gap-2.5 text-xs">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                    isPlaying
                      ? 'bg-gradient-to-tr from-pink-500 to-purple-600 text-white animate-spin-slow shadow-xs'
                      : 'bg-white text-gray-400 border border-pink-200'
                  }`}
                >
                  <Disc3 className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-purple-700 font-extrabold uppercase block">
                      {isPlaying ? 'ĐANG PHÁT:' : 'ĐANG TẠM DỪNG'}
                    </span>
                    {currentPlaying && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-extrabold ${
                        currentPlaying.hasLocalAudioFile || currentPlaying.audioSourceType === 'file'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : currentPlaying.audioUrl
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {currentPlaying.hasLocalAudioFile || currentPlaying.audioSourceType === 'file'
                          ? '📁 File MP3 cá nhân'
                          : currentPlaying.audioUrl
                          ? '🌐 Link MP3 trực tuyến'
                          : '🥑 Nhạc nền BGM Lo-Fi'}
                      </span>
                    )}
                  </div>
                  <div className="font-black text-gray-900 truncate text-xs sm:text-sm">
                    {currentPlaying ? `${currentPlaying.title} · ${currentPlaying.artist}` : 'Chọn một bài hát để bắt đầu'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                {/* Volume slider */}
                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-pink-200 shadow-2xs">
                  <Volume2 className="w-3.5 h-3.5 text-gray-500" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => handleVolumeChange(Number(e.target.value))}
                    className="w-20 accent-pink-500 cursor-pointer h-1.5 bg-gray-200 rounded-lg"
                  />
                  <span className="font-bold text-[10px] text-gray-600 font-mono w-7 text-right">
                    {Math.round(volume * 100)}%
                  </span>
                </div>

                {isPlaying ? (
                  <button
                    type="button"
                    onClick={stopMusic}
                    className="px-3 py-1.5 bg-rose-500 text-white rounded-xl font-bold text-xs hover:bg-rose-600 transition-colors shadow-2xs shrink-0 flex items-center gap-1"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>Tắt Nhạc</span>
                  </button>
                ) : (
                  currentPlaying && (
                    <button
                      type="button"
                      onClick={() => playSong(currentPlaying)}
                      className="px-3 py-1.5 bg-pink-500 text-white rounded-xl font-bold text-xs hover:bg-pink-600 transition-colors shadow-2xs shrink-0 flex items-center gap-1"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Phát Lại</span>
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Progress bar (when playing MP3 with duration) */}
            {playerState.duration > 0 && (
              <div className="space-y-1 pt-1 border-t border-pink-100">
                <div className="flex justify-between text-[10px] text-gray-500 font-mono font-semibold px-0.5">
                  <span>{formatTime(playerState.currentTime)}</span>
                  <span>{formatTime(playerState.duration)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={playerState.duration || 100}
                  step="0.5"
                  value={playerState.currentTime || 0}
                  onChange={(e) => seekMusic(Number(e.target.value))}
                  className="w-full accent-pink-600 cursor-pointer h-1.5 bg-pink-200 rounded-lg"
                />
              </div>
            )}

            {/* Error Banner if MP3 link failed */}
            {playerState.error && (
              <div className="bg-rose-50 border border-rose-300 rounded-xl p-2.5 text-[11px] text-rose-800 flex items-start gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <strong className="block font-black">Thông báo phát nhạc:</strong>
                  <span>{playerState.error}</span>
                </div>
                <button
                  type="button"
                  onClick={clearPlaybackError}
                  className="text-rose-600 hover:text-rose-900 font-bold underline shrink-0"
                >
                  Đóng
                </button>
              </div>
            )}
          </div>

          {/* Toolbar: Filter buttons, search, and Add song button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  playSoftPop();
                  setFilterMode('all');
                }}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  filterMode === 'all'
                    ? 'bg-pink-500 text-white shadow-2xs'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border'
                }`}
              >
                Tất cả ({songs.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  playSoftPop();
                  setFilterMode('mp3');
                }}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 ${
                  filterMode === 'mp3'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border'
                }`}
              >
                <FileAudio className="w-3.5 h-3.5" />
                <span>File MP3 / Có Lời ({songs.filter((s) => s.audioSourceType === 'file' || s.audioUrl || s.hasLocalAudioFile).length})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  playSoftPop();
                  setFilterMode('favorites');
                }}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 ${
                  filterMode === 'favorites'
                    ? 'bg-rose-500 text-white shadow-2xs'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border'
                }`}
              >
                <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
                <span>Yêu thích ({songs.filter((s) => s.isFavorite).length})</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Search Input */}
              <div className="relative flex-1 sm:w-44">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm bài hát, ca sĩ..."
                  className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-pink-400"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  playSoftPop();
                  setShowAddForm(!showAddForm);
                }}
                className={`px-3 py-1.5 text-white rounded-xl font-bold flex items-center gap-1 shadow-2xs transition-all shrink-0 ${
                  showAddForm ? 'bg-gray-700 hover:bg-gray-800' : 'bg-emerald-500 hover:bg-emerald-600'
                }`}
              >
                <Plus className={`w-3.5 h-3.5 transition-transform ${showAddForm ? 'rotate-45' : ''}`} />
                <span>{showAddForm ? 'Đóng Biểu Mẫu' : 'Thêm Bài Hát MP3'}</span>
              </button>
            </div>
          </div>

          {/* Quick Presets row */}
          <div className="px-1 flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
            <span className="font-extrabold text-gray-400 shrink-0">Gợi ý BGM:</span>
            {PRESET_IDEAS.map((pre, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(pre)}
                className="px-2 py-0.5 rounded-lg bg-pink-50 hover:bg-pink-100 border border-pink-200/80 text-pink-700 font-bold shrink-0 transition-colors flex items-center gap-1"
                title="Điền nhanh nhạc nền Lo-Fi này"
              >
                <span>{pre.icon}</span>
                <span>{pre.title}</span>
              </button>
            ))}
          </div>

          {/* Add Song Form Inline */}
          {showAddForm && (
            <form
              onSubmit={handleCreateSongSubmit}
              className="p-4 bg-gradient-to-br from-emerald-50/80 via-teal-50/50 to-white rounded-2xl border-2 border-emerald-400 shadow-lg space-y-3.5 text-xs animate-fadeIn"
            >
              <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2">
                <span className="font-black text-emerald-950 text-xs sm:text-sm flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  THÊM BÀI HÁT MP3 CÓ LỜI HOẶC NHẠC NỀN BGM
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Source Mode Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-emerald-200">
                <button
                  type="button"
                  onClick={() => setAudioSourceTab('upload')}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-black transition-all flex items-center justify-center gap-1.5 text-xs ${
                    audioSourceTab === 'upload'
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>📁 Tải Lên File MP3 Từ Máy (Khuyên Dùng)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAudioSourceTab('url')}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-black transition-all flex items-center justify-center gap-1.5 text-xs ${
                    audioSourceTab === 'url'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>🌐 Dán Link URL MP3</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAudioSourceTab('synth')}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-black transition-all flex items-center justify-center gap-1.5 text-xs ${
                    audioSourceTab === 'synth'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>🥑 BGM Lo-Fi Tự Động</span>
                </button>
              </div>

              {/* Tab 1: Upload MP3 File */}
              {audioSourceTab === 'upload' && (
                <div className="bg-white p-3 rounded-2xl border-2 border-dashed border-emerald-300 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <label className="block font-black text-emerald-950 text-xs">
                        🎵 Chọn file MP3 có lời từ máy tính hoặc điện thoại của bạn:
                      </label>
                      <span className="text-[11px] text-gray-500 block">
                        File sẽ được lưu vĩnh viễn trên trình duyệt của bạn và phát chuẩn xác 100% âm thanh & giọng hát gốc!
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <label className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-98 text-white rounded-xl font-black cursor-pointer shadow-sm transition-all text-xs">
                      <Upload className="w-4 h-4" />
                      <span>{selectedFile ? 'Đổi File MP3 Khác...' : 'Bấm Vào Đây Để Chọn File MP3...'}</span>
                      <input
                        type="file"
                        accept="audio/mp3,audio/mpeg,audio/*,.mp3,.m4a,.wav"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>

                    {selectedFile && (
                      <button
                        type="button"
                        onClick={handleTogglePreview}
                        className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-black flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                          isPreviewPlaying
                            ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse'
                            : 'bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300'
                        }`}
                      >
                        {isPreviewPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        <span>{isPreviewPlaying ? 'Dừng Nghe Thử' : '▶️ Nghe Thử File Này'}</span>
                      </button>
                    )}
                  </div>

                  {selectedFile ? (
                    <div className="p-2 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 font-bold flex items-center gap-2 text-xs">
                      <FileAudio className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="truncate flex-1">
                        Đã nạp file: <strong>{selectedFile.name}</strong> ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                      <span className="text-[10px] bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full font-black shrink-0">
                        Sẵn Sàng Phát 💯
                      </span>
                    </div>
                  ) : (
                    <p className="text-[11px] text-gray-400 italic">
                      Hỗ trợ mọi bài hát định dạng .mp3, .m4a, .wav lưu trên máy.
                    </p>
                  )}
                </div>
              )}

              {/* Tab 2: URL Link */}
              {audioSourceTab === 'url' && (
                <div className="bg-white p-3 rounded-2xl border-2 border-blue-200 space-y-2">
                  <label className="block font-black text-blue-950 text-xs">
                    🌐 Dán link file âm thanh MP3 trực tuyến:
                  </label>
                  <p className="text-[11px] text-gray-500">
                    Hỗ trợ link trực tiếp (.mp3), link chia sẻ Google Drive (chế độ công khai), hoặc link Dropbox.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://example.com/bai-hat.mp3 hoặc link Google Drive"
                      value={newAudioUrl}
                      onChange={(e) => setNewAudioUrl(e.target.value)}
                      className="flex-1 px-3 py-2 bg-blue-50/50 border border-blue-300 rounded-xl font-bold focus:outline-none focus:border-blue-500"
                    />
                    {newAudioUrl.trim() && (
                      <button
                        type="button"
                        onClick={handleTogglePreview}
                        className={`px-3 py-2 rounded-xl font-bold transition-all text-xs flex items-center gap-1 shrink-0 ${
                          isPreviewPlaying
                            ? 'bg-rose-500 text-white animate-pulse'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {isPreviewPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        <span>{isPreviewPlaying ? 'Dừng' : 'Thử Link'}</span>
                      </button>
                    )}
                  </div>
                  <div className="text-[10px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                    💡 <strong>Mẹo:</strong> Nếu link online bị chặn (do máy chủ không cho phép phát ngoài trang), bạn chỉ cần tải file về máy và chuyển qua tab <strong>"Tải Lên File MP3 Từ Máy"</strong> là sẽ phát 100% trơn tru!
                  </div>
                </div>
              )}

              {/* Tab 3: Synthesizer BGM */}
              {audioSourceTab === 'synth' && (
                <div className="bg-white p-3 rounded-2xl border-2 border-purple-200 space-y-2">
                  <label className="block font-black text-purple-950 text-xs">
                    🥑 Giai Điệu Nhạc Nền BGM Lo-Fi (Không Lời):
                  </label>
                  <p className="text-[11px] text-gray-500">
                    Giai điệu thư thái, ấm áp tự động tạo bởi bộ hòa âm Web Audio API khi không cần chèn lời bài hát.
                  </p>
                  <select
                    value={newSynthType}
                    onChange={(e) => setNewSynthType(e.target.value)}
                    className="w-full px-3 py-2 border border-purple-200 rounded-xl font-bold bg-purple-50 text-purple-900 focus:outline-none"
                  >
                    {SYNTH_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.icon} {opt.label} - {opt.desc}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Title & Artist fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Tên bài hát *:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Cà Phê Một Mình, Nơi Này Có Anh..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Nghệ sĩ / Ca sĩ *:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Chillies, Sơn Tùng, Vũ, Đen..."
                    value={newArtist}
                    onChange={(e) => setNewArtist(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              {/* Genre & Mood Icon */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Thể loại:</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: V-Pop, Ballad, Acoustic, R&B..."
                    value={newGenre}
                    onChange={(e) => setNewGenre(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-semibold focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Biểu tượng bài hát:</label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {MOOD_ICONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setNewIcon(emoji)}
                        className={`text-base p-1 rounded-lg border transition-all ${
                          newIcon === emoji ? 'bg-pink-100 border-pink-400 scale-110 shadow-2xs' : 'bg-white border-gray-200'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-emerald-200/80 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <span className="text-[11px] text-gray-600 font-medium">
                  {selectedFile
                    ? `🎵 File MP3 (${selectedFile.name}) đã được gắn chuẩn xác!`
                    : newAudioUrl
                    ? '🌐 Sẽ phát trực tiếp từ đường link MP3 đã nhập.'
                    : '🥑 Sẽ sử dụng nhạc nền BGM Lo-Fi thư giãn.'}
                </span>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (previewAudioRef.current) {
                        previewAudioRef.current.pause();
                        setIsPreviewPlaying(false);
                      }
                      setShowAddForm(false);
                    }}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="flex-1 sm:flex-none px-6 py-2.5 bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-black text-xs shadow-md shadow-emerald-200 flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <Check className="w-4 h-4" />
                    <span>Lưu & Phát Ngay 🎶</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Songs List */}
          <div className="space-y-2 pr-1">
            {filteredSongs.length === 0 ? (
              <div className="p-8 text-center bg-gray-50/70 rounded-2xl border border-dashed border-gray-200 text-gray-500 text-xs">
                <Music className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="font-bold text-gray-700">Chưa tìm thấy bài hát nào</p>
                <p className="text-[11px] mt-1 text-gray-400">
                  Hãy bấm <strong>"Thêm Bài Hát MP3"</strong> để tải nhạc từ máy lên hoặc dán link nghe ngay!
                </p>
              </div>
            ) : (
              filteredSongs.map((song) => {
                const isThisPlaying = isPlaying && currentPlaying?.id === song.id;
                const isEditingThis = editingSongId === song.id;
                const isMp3Track = song.hasLocalAudioFile || song.audioSourceType === 'file' || !!song.audioUrl;

                if (isEditingThis) {
                  return (
                    <form
                      key={song.id}
                      onSubmit={handleSaveEdit}
                      className="p-3.5 rounded-2xl border-2 border-purple-300 bg-purple-50/70 shadow-sm space-y-2.5 text-xs animate-fadeIn"
                    >
                      <div className="flex items-center justify-between border-b border-purple-200 pb-1.5 font-bold text-purple-900">
                        <span className="flex items-center gap-1">
                          <Edit2 className="w-3.5 h-3.5" /> Chỉnh sửa bài hát: {song.title}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingSongId(null)}
                          className="text-gray-400 hover:text-gray-700"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          required
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="Tên bài hát"
                          className="px-2.5 py-1.5 border border-purple-200 rounded-xl bg-white font-bold"
                        />
                        <input
                          type="text"
                          required
                          value={editArtist}
                          onChange={(e) => setEditArtist(e.target.value)}
                          placeholder="Nghệ sĩ"
                          className="px-2.5 py-1.5 border border-purple-200 rounded-xl bg-white font-bold"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={editGenre}
                          onChange={(e) => setEditGenre(e.target.value)}
                          placeholder="Thể loại"
                          className="px-2.5 py-1.5 border border-purple-200 rounded-xl bg-white font-bold"
                        />
                        <div className="flex items-center gap-1 overflow-x-auto">
                          {MOOD_ICONS.slice(0, 6).map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => setEditIcon(emoji)}
                              className={`p-1 rounded-lg border text-sm ${
                                editIcon === emoji ? 'bg-purple-200 border-purple-400' : 'bg-white'
                              }`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* File replacement in edit mode */}
                      <div className="p-2 bg-white rounded-xl border border-purple-200 space-y-1.5">
                        <label className="block font-bold text-purple-950 text-[11px]">
                          Đổi file MP3 từ máy (nếu muốn thay thế bài hiện tại):
                        </label>
                        <div className="flex items-center gap-2">
                          <label className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold cursor-pointer text-[11px]">
                            <span>Chọn file .mp3 mới</span>
                            <input
                              type="file"
                              accept="audio/*,.mp3,.m4a,.wav"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) {
                                  setEditFile(f);
                                  setEditFileName(f.name);
                                }
                              }}
                              className="hidden"
                            />
                          </label>
                          <span className="text-[11px] text-gray-600 truncate">
                            {editFileName ? `📁 ${editFileName}` : 'Chưa đổi file'}
                          </span>
                        </div>
                      </div>

                      <input
                        type="url"
                        value={editAudioUrl}
                        onChange={(e) => setEditAudioUrl(e.target.value)}
                        placeholder="Hoặc URL audio trực tuyến (tùy chọn)"
                        className="w-full px-2.5 py-1.5 border border-purple-200 rounded-xl bg-white text-xs font-semibold"
                      />

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingSongId(null)}
                          className="px-3 py-1 bg-white border border-gray-200 rounded-xl font-bold"
                        >
                          Hủy
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Lưu Lại
                        </button>
                      </div>
                    </form>
                  );
                }

                return (
                  <div
                    key={song.id}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 text-xs ${
                      isThisPlaying
                        ? 'bg-gradient-to-r from-pink-50 to-purple-50 border-pink-400 ring-2 ring-pink-200 shadow-sm'
                        : 'bg-white hover:bg-gray-50/80 border-gray-200/90 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Play/Pause Button */}
                      <button
                        type="button"
                        onClick={() => handlePlayToggle(song)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                          isThisPlaying
                            ? 'bg-pink-500 text-white shadow-xs'
                            : 'bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200'
                        }`}
                        title={isThisPlaying ? 'Tạm dừng' : 'Phát bài này'}
                      >
                        {isThisPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-base shrink-0">{song.moodIcon || '🎵'}</span>
                          <h4 className="font-black text-gray-900 truncate text-xs sm:text-sm">
                            {song.title}
                          </h4>
                          {isThisPlaying && (
                            <span className="text-[10px] bg-pink-100 text-pink-700 font-extrabold px-1.5 py-0.2 rounded-md shrink-0 animate-pulse">
                              Đang phát
                            </span>
                          )}
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-black shrink-0 ${
                              song.hasLocalAudioFile || song.audioSourceType === 'file'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : song.audioUrl
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {song.hasLocalAudioFile || song.audioSourceType === 'file'
                              ? '📁 File MP3'
                              : song.audioUrl
                              ? '🌐 Link MP3'
                              : '🥑 BGM Lo-Fi'}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5">
                          <span className="font-semibold text-gray-700 truncate">{song.artist}</span>
                          <span>·</span>
                          <span className="px-1.5 py-0.2 bg-gray-100 rounded-md font-medium text-gray-600 text-[10px]">
                            {song.genre}
                          </span>
                          {song.fileName && (
                            <span className="text-[10px] text-emerald-700 truncate font-mono">
                              ({song.fileName})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                      {/* Favorite Heart Button */}
                      <button
                        type="button"
                        onClick={() => {
                          playSoftPop();
                          onToggleFavoriteSong(song.id);
                        }}
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-gray-400 hover:text-rose-500 transition-colors"
                        title={song.isFavorite ? 'Bỏ thích' : 'Thả tim bài này'}
                      >
                        <Heart
                          className={`w-4 h-4 transition-transform ${
                            song.isFavorite ? 'fill-rose-500 text-rose-500 scale-110' : ''
                          }`}
                        />
                      </button>

                      {/* Edit button */}
                      <button
                        type="button"
                        onClick={() => handleStartEdit(song)}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                        title="Sửa bài hát / Đổi file MP3"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Bạn có chắc muốn xóa bài hát "${song.title}" khỏi danh sách?`)) {
                            onDeleteSong(song.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Xóa bài hát"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
