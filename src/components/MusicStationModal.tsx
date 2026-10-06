import React, { useState } from 'react';
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
} from '../utils/musicEngine';

interface MusicStationModalProps {
  isOpen: boolean;
  onClose: () => void;
  songs: FavoriteSong[];
  onAddSong: (song: Omit<FavoriteSong, 'id'>) => void;
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

export const MusicStationModal: React.FC<MusicStationModalProps> = ({
  isOpen,
  onClose,
  songs,
  onAddSong,
  onEditSong,
  onToggleFavoriteSong,
  onDeleteSong,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'favorites'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const [volume, setVolume] = useState<number>(() => getMusicVolume());

  // New song form
  const [newTitle, setNewTitle] = useState<string>('');
  const [newArtist, setNewArtist] = useState<string>('');
  const [newGenre, setNewGenre] = useState<string>('Lo-Fi Chill');
  const [newAudioUrl, setNewAudioUrl] = useState<string>('');
  const [newSynthType, setNewSynthType] = useState<string>('lofi');
  const [newIcon, setNewIcon] = useState<string>('🎵');

  // Edit song form state
  const [editTitle, setEditTitle] = useState<string>('');
  const [editArtist, setEditArtist] = useState<string>('');
  const [editGenre, setEditGenre] = useState<string>('');
  const [editAudioUrl, setEditAudioUrl] = useState<string>('');
  const [editSynthType, setEditSynthType] = useState<string>('lofi');
  const [editIcon, setEditIcon] = useState<string>('🎵');

  if (!isOpen) return null;

  const currentPlaying = getActiveSong();
  const isPlaying = isMusicPlaying();

  const handlePlayToggle = (song: FavoriteSong) => {
    playSoftPop();
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
    setShowAddForm(true);
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
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSongId || !editTitle.trim() || !editArtist.trim()) return;

    if (onEditSong) {
      onEditSong(editingSongId, {
        title: editTitle.trim(),
        artist: editArtist.trim(),
        genre: editGenre.trim() || 'Cozy Mart',
        audioUrl: editAudioUrl.trim() || undefined,
        synthType: editSynthType as any,
        moodIcon: editIcon || '🎵',
      });
    }

    playCashRegister();
    setEditingSongId(null);
  };

  const handleCreateSongSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newArtist.trim()) {
      alert('Vui lòng nhập tên bài hát và nghệ sĩ!');
      return;
    }

    playCashRegister();
    onAddSong({
      title: newTitle.trim(),
      artist: newArtist.trim(),
      genre: newGenre.trim() || 'Cozy Mart',
      audioUrl: newAudioUrl.trim() || undefined,
      isFavorite: true,
      moodIcon: newIcon || '🎵',
      duration: '3:00',
      synthType: (newSynthType as any) || 'lofi',
      createdAt: Date.now(),
    });

    setNewTitle('');
    setNewArtist('');
    setNewAudioUrl('');
    setShowAddForm(false);
  };

  const filteredSongs = songs.filter((s) => {
    if (filterMode === 'favorites' && !s.isFavorite) return false;
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
      <div className="bg-[#FFFDF9] w-full max-w-xl rounded-3xl border-2 border-pink-200 shadow-2xl p-5 sm:p-7 relative overflow-hidden max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            playSoftPop();
            onClose();
          }}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 bg-white rounded-full border border-gray-200 hover:bg-gray-100 transition-colors shadow-2xs z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-400 to-indigo-400 text-white flex items-center justify-center text-2xl shadow-sm shrink-0">
            📻
          </div>
          <div>
            <span className="text-[11px] font-black text-pink-700 tracking-wider uppercase bg-pink-100 px-2 py-0.5 rounded-full">
              Quầy Nhạc Siêu Thị Dopamine
            </span>
            <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight mt-0.5 flex items-center gap-2">
              Bài Hát Yêu Thích & Lo-Fi BGM 🎶
            </h2>
          </div>
        </div>

        {/* Volume & Player Controls Bar */}
        <div className="p-3.5 bg-gradient-to-r from-purple-50 via-pink-50 to-amber-50 rounded-2xl border border-pink-200/80 mb-4 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${
                isPlaying
                  ? 'bg-gradient-to-tr from-pink-500 to-purple-600 text-white animate-spin-slow shadow-xs'
                  : 'bg-white text-gray-400 border'
              }`}
            >
              <Disc3 className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-purple-700 font-extrabold uppercase block">
                {isPlaying ? 'ĐANG PHÁT NHẠC NỀN:' : 'QUẦY NHẠC ĐANG TẠM DỪNG'}
              </span>
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

            {isPlaying && (
              <button
                type="button"
                onClick={stopMusic}
                className="px-3 py-1.5 bg-rose-500 text-white rounded-xl font-bold text-xs hover:bg-rose-600 transition-colors shadow-2xs shrink-0"
              >
                Tắt Nhạc ⏸️
              </button>
            )}
          </div>
        </div>

        {/* Toolbar: Filter buttons, search, and Add song button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 mb-3 shrink-0 text-xs">
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
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold flex items-center gap-1 shadow-2xs transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm Bài Hát</span>
            </button>
          </div>
        </div>

        {/* Quick Presets row */}
        <div className="mb-3 px-1 flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] shrink-0">
          <span className="font-extrabold text-gray-400 shrink-0">Gợi ý nhanh:</span>
          {PRESET_IDEAS.map((pre, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyPreset(pre)}
              className="px-2 py-0.5 rounded-lg bg-pink-50 hover:bg-pink-100 border border-pink-200/80 text-pink-700 font-bold shrink-0 transition-colors flex items-center gap-1"
              title="Điền nhanh bài hát mẫu này vào biểu mẫu"
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
            className="p-4 bg-white rounded-2xl border-2 border-emerald-200 shadow-sm mb-4 space-y-3 text-xs animate-fadeIn shrink-0"
          >
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-black text-emerald-800 text-xs flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                THÊM BÀI HÁT YÊU THÍCH VÀO QUẦY NHẠC
              </span>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Tên bài hát *:</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Cà Phê Một Mình, Haru Haru..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-xl font-semibold focus:outline-none focus:border-pink-400"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Nghệ sĩ / Ca sĩ *:</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Chillies, Vũ, Đen Vâu, Ghibli..."
                  value={newArtist}
                  onChange={(e) => setNewArtist(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-xl font-semibold focus:outline-none focus:border-pink-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Thể loại:</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Lo-Fi Chill, Acoustic, R&B..."
                  value={newGenre}
                  onChange={(e) => setNewGenre(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-xl font-semibold focus:outline-none focus:border-pink-400"
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
                        newIcon === emoji ? 'bg-pink-100 border-pink-400 scale-110 shadow-2xs' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Âm hưởng Synthesizer nền (khi nghe thư giãn):
                </label>
                <select
                  value={newSynthType}
                  onChange={(e) => setNewSynthType(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-xl font-semibold focus:outline-none focus:border-pink-400 bg-white"
                >
                  {SYNTH_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.icon} {opt.label} ({opt.desc})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Đường dẫn nhạc online (tùy chọn URL MP3):
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/audio.mp3 (hoặc để trống)"
                  value={newAudioUrl}
                  onChange={(e) => setNewAudioUrl(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-xl font-semibold focus:outline-none focus:border-pink-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black shadow-2xs"
              >
                Lưu Vào Danh Sách ✨
              </button>
            </div>
          </form>
        )}

        {/* Songs List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {filteredSongs.length === 0 ? (
            <div className="p-8 text-center bg-gray-50/70 rounded-2xl border border-dashed border-gray-200 text-gray-500 text-xs">
              <Music className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="font-bold text-gray-700">Chưa tìm thấy bài hát nào</p>
              <p className="text-[11px] mt-1 text-gray-400">
                Hãy bấm <strong>"Thêm Bài Hát Mới"</strong> để đưa các bản nhạc yêu thích của bạn vào danh sách!
              </p>
            </div>
          ) : (
            filteredSongs.map((song) => {
              const isThisPlaying = isPlaying && currentPlaying?.id === song.id;
              const isEditingThis = editingSongId === song.id;

              if (isEditingThis) {
                return (
                  <form
                    key={song.id}
                    onSubmit={handleSaveEdit}
                    className="p-3.5 rounded-2xl border-2 border-purple-300 bg-purple-50/70 shadow-sm space-y-2.5 text-xs animate-fadeIn"
                  >
                    <div className="flex items-center justify-between border-b border-purple-200 pb-1.5 font-bold text-purple-900">
                      <span className="flex items-center gap-1">
                        <Edit2 className="w-3.5 h-3.5" /> Chỉnh sửa bài hát
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

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={editGenre}
                        onChange={(e) => setEditGenre(e.target.value)}
                        placeholder="Thể loại"
                        className="px-2.5 py-1.5 border border-purple-200 rounded-xl bg-white font-bold"
                      />
                      <select
                        value={editSynthType}
                        onChange={(e) => setEditSynthType(e.target.value)}
                        className="px-2.5 py-1.5 border border-purple-200 rounded-xl bg-white font-bold"
                      >
                        {SYNTH_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.icon} {opt.label}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center gap-1 overflow-x-auto">
                        {MOOD_ICONS.slice(0, 5).map((emoji) => (
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

                    <input
                      type="url"
                      value={editAudioUrl}
                      onChange={(e) => setEditAudioUrl(e.target.value)}
                      placeholder="URL audio (MP3, tùy chọn)"
                      className="w-full px-2.5 py-1.5 border border-purple-200 rounded-xl bg-white text-xs"
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
                        <Check className="w-3.5 h-3.5" /> Lưu lại
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
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                        isThisPlaying
                          ? 'bg-pink-500 text-white shadow-xs'
                          : 'bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200'
                      }`}
                      title={isThisPlaying ? 'Tạm dừng' : 'Phát bài này'}
                    >
                      {isThisPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base shrink-0">{song.moodIcon || '🎵'}</span>
                        <h4 className="font-black text-gray-900 truncate text-xs sm:text-sm">
                          {song.title}
                        </h4>
                        {isThisPlaying && (
                          <span className="text-[10px] bg-pink-100 text-pink-700 font-extrabold px-1.5 py-0.2 rounded-md shrink-0 animate-pulse">
                            Đang phát
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5">
                        <span className="font-semibold text-gray-700">{song.artist}</span>
                        <span>·</span>
                        <span className="px-1.5 py-0.2 bg-gray-100 rounded-md font-medium text-gray-600 text-[10px]">
                          {song.genre}
                        </span>
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
                      title="Sửa thông tin bài hát"
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
  );
};
