import React, { useState } from 'react';
import { Badge, UserRank, UserProfile, FavoriteSong } from '../types';
import { RANKS } from '../utils/storage';
import {
  Award,
  Sparkles,
  CheckCircle2,
  Lock,
  Flame,
  Calendar,
  Clock,
  PiggyBank,
  Edit2,
  X,
  Share2,
  Filter,
  Music,
} from 'lucide-react';
import { playFanfare, playSoftPop } from '../utils/audio';
import { triggerMegaConfetti } from '../utils/confetti';

interface BadgesApronProps {
  badges: Badge[];
  userRank: UserRank;
  userProfile: UserProfile;
  setUserProfile: (profile: UserProfile) => void;
  totalTransactionsCount: number;
  songs?: FavoriteSong[];
  onOpenMusicStation?: () => void;
}

export const BadgesApron: React.FC<BadgesApronProps> = ({
  badges,
  userRank,
  userProfile,
  setUserProfile,
  totalTransactionsCount,
  songs = [],
  onOpenMusicStation,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [inspectBadge, setInspectBadge] = useState<Badge | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [tempName, setTempName] = useState<string>(userProfile.name);
  const [tempAvatar, setTempAvatar] = useState<string>(userProfile.avatar);

  const unlockedCount = badges.filter((b) => b.isUnlocked).length;
  const totalBadges = badges.length;
  const badgeProgressPct = Math.round((unlockedCount / totalBadges) * 100);

  const filteredBadges = badges.filter((b) => {
    if (selectedCategory === 'all') return true;
    return b.category === selectedCategory;
  });

  const handleBadgeClick = (b: Badge) => {
    setInspectBadge(b);
    if (b.isUnlocked) {
      playFanfare();
      triggerMegaConfetti();
    } else {
      playSoftPop();
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setUserProfile({
      ...userProfile,
      name: tempName.trim() || 'Người Dùng Tỉnh Táo',
      avatar: tempAvatar || '🥑',
    });
    setIsEditingProfile(false);
    playSoftPop();
  };

  const avatarOptions = ['🥑', '🍓', '🥐', '🧋', '🍎', '🍣', '🛒', '👑', '🌸', '✨'];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. HỒ SƠ NGƯỜI DÙNG & THẺ THÀNH VIÊN SIÊU THỊ (SUPERMARKET VIP PASS) */}
      <div className="bg-gradient-to-br from-pink-100/90 via-purple-100/70 to-emerald-50 p-6 sm:p-7 rounded-3xl border-2 border-pink-200/80 shadow-xs relative overflow-hidden">
        {/* Background Decorative Motif */}
        <div className="absolute -right-6 -bottom-6 text-9xl opacity-15 pointer-events-none select-none">
          🛒
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          {/* User info */}
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-white shadow-md border-2 border-pink-300 flex items-center justify-center text-3xl sm:text-4xl">
                {userProfile.avatar}
              </div>
              <button
                type="button"
                onClick={() => {
                  playSoftPop();
                  setIsEditingProfile(true);
                }}
                className="absolute -bottom-1 -right-1 p-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-xs text-xs"
                title="Đổi tên & avatar"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  {userProfile.name}
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/80 border border-purple-200 text-purple-700 font-bold">
                  {userProfile.memberId}
                </span>
              </div>
              <p className="text-xs text-gray-600 font-medium mt-0.5">
                Thành viên siêu thị từ {userProfile.joinedDate} · {userRank.title}
              </p>

              {/* Badges and Streak counters */}
              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                <div className="px-2.5 py-1 rounded-xl bg-orange-100 text-orange-900 font-black border border-orange-200 flex items-center gap-1 shadow-2xs">
                  <Flame className="w-3.5 h-3.5 text-orange-600 fill-orange-500 animate-pulse" />
                  <span>Chuỗi {userProfile.currentStreakDays} Ngày Ghi Chép Liên Tiếp 🔥</span>
                </div>

                <div className="px-2.5 py-1 rounded-xl bg-purple-100 text-purple-900 font-bold border border-purple-200 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-purple-600" />
                  <span>{unlockedCount}/{totalBadges} Huy hiệu ({badgeProgressPct}%)</span>
                </div>

                {songs && songs.length > 0 && onOpenMusicStation && (
                  <button
                    type="button"
                    onClick={() => {
                      playSoftPop();
                      onOpenMusicStation();
                    }}
                    className="px-2.5 py-1 rounded-xl bg-pink-100 text-pink-900 font-bold border border-pink-200 flex items-center gap-1 hover:bg-pink-200 transition-colors shadow-2xs"
                    title="Mở Quầy Nhạc Siêu Thị để nghe và thêm bài hát yêu thích"
                  >
                    <Music className="w-3.5 h-3.5 text-pink-600" />
                    <span>{songs.filter((s) => s.isFavorite).length} Bài Hát Yêu Thích 🎶</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* User Rank Title & Level Showcase */}
          <div className="flex flex-col sm:items-end justify-center gap-1.5">
            <div className={`px-4 py-2 rounded-2xl border font-black text-xs sm:text-sm shadow-xs ${userRank.bg}`}>
              🏆 {userRank.title} (Cấp {userRank.level})
            </div>
            <span className="text-[11px] text-gray-500 font-medium">
              Đã hoàn thành {totalTransactionsCount} đơn quét thu chi thành công
            </span>
          </div>
        </div>

        {/* Profile Edit Inline Modal */}
        {isEditingProfile && (
          <form
            onSubmit={handleSaveProfile}
            className="mt-5 p-4 bg-white/95 rounded-2xl border border-pink-300 space-y-3 animate-fadeIn text-xs"
          >
            <div className="flex items-center justify-between font-bold text-gray-700">
              <span>Chỉnh sửa hồ sơ thẻ siêu thị:</span>
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="text-gray-400 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-600 font-bold mb-1">TÊN CỦA BẠN:</label>
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="w-full p-2 bg-gray-50 border rounded-xl font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-600 font-bold mb-1">CHỌN AVATAR VUI VẺ:</label>
                <div className="flex flex-wrap gap-1.5">
                  {avatarOptions.map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => setTempAvatar(av)}
                      className={`text-xl p-1 rounded-lg border transition-all ${
                        tempAvatar === av ? 'bg-pink-100 border-pink-400 scale-110' : 'bg-gray-50'
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-xl font-bold"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700"
              >
                Lưu Thay Đổi
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 2. LỘ TRÌNH THĂNG TIẾN SIÊU THỊ TÀI CHÍNH */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-purple-200/90 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">👑</span>
            <div>
              <h3 className="font-extrabold text-base text-purple-900 tracking-tight">
                LỘ TRÌNH THĂNG TIẾN NGHỀ NGHIỆP SIÊU THỊ
              </h3>
              <p className="text-xs text-gray-500 font-medium">
                Quét mã thu chi đều đặn để tích lũy kinh nghiệm và nâng cấp chức danh
              </p>
            </div>
          </div>

          <div className="px-3 py-1 rounded-full bg-purple-100 text-purple-900 font-bold text-xs self-start sm:self-auto">
            Hiện tại: {userRank.title}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
          {RANKS.map((r) => {
            const isCurrent = userRank.level === r.level;
            const isPassed = totalTransactionsCount >= r.minTransactions;

            return (
              <div
                key={r.level}
                className={`p-3 rounded-2xl border text-center transition-all ${
                  isCurrent
                    ? `${r.bg} ring-2 ring-purple-400 font-black shadow-xs scale-102`
                    : isPassed
                    ? 'bg-gray-50 border-gray-200 text-gray-700'
                    : 'bg-gray-50/50 border-gray-100 text-gray-300 opacity-60'
                }`}
              >
                <div className="text-xs font-bold truncate">{r.title}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">
                  Mốc: {r.minTransactions} đơn quét
                </div>
                {isCurrent && (
                  <div className="text-[9px] bg-white/80 text-purple-800 px-2 py-0.5 rounded-full font-bold mt-1 inline-block">
                    Đang giữ chức ✨
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. CHIẾC TẠP DỀ HUY HIỆU & HỆ THỐNG THÀNH TÍCH NÂNG CẤP */}
      <div className="bg-gradient-to-b from-purple-50/50 via-pink-50/30 to-white p-5 sm:p-7 rounded-3xl border-2 border-purple-200/90 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-3xl">🎖️</span>
              <h2 className="text-lg sm:text-xl font-black text-purple-950 tracking-tight">
                BỘ SƯU TẬP HUY HIỆU & THÀNH TỰU
              </h2>
            </div>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Bấm vào bất kỳ huy hiệu nào để xem chi tiết hướng dẫn mở khóa và kích hoạt pháo hoa! 🎉
            </p>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1 p-1 bg-white rounded-2xl border border-gray-200 text-xs font-bold self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-2.5 py-1 rounded-xl transition-colors ${
                selectedCategory === 'all' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('savings')}
              className={`px-2.5 py-1 rounded-xl transition-colors ${
                selectedCategory === 'savings' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Tiết Kiệm 🐷
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('discipline')}
              className={`px-2.5 py-1 rounded-xl transition-colors ${
                selectedCategory === 'discipline' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Kỷ Luật 🌿
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('planning')}
              className={`px-2.5 py-1 rounded-xl transition-colors ${
                selectedCategory === 'planning' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Kế Hoạch 📋
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('mindful')}
              className={`px-2.5 py-1 rounded-xl transition-colors ${
                selectedCategory === 'mindful' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Tâm Lý 🥰
            </button>
          </div>
        </div>

        {/* Badges Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredBadges.map((b) => {
            const isUnlocked = b.isUnlocked;
            const progressRatio = Math.min(100, Math.round((b.progress / (b.maxProgress || 1)) * 100));

            return (
              <div
                key={b.id}
                onClick={() => handleBadgeClick(b)}
                className={`p-4 rounded-3xl border-2 transition-all cursor-pointer relative group flex flex-col justify-between select-none ${
                  isUnlocked
                    ? 'bg-white hover:bg-pink-50/40 border-pink-300 shadow-xs hover:scale-[1.02] active:scale-[0.98]'
                    : 'bg-gray-100/70 border-gray-200 text-gray-500 opacity-80 hover:opacity-100'
                }`}
              >
                <div>
                  {/* Card top */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-black/5 flex items-center justify-center text-3xl shadow-inner shrink-0 group-hover:scale-110 transition-transform">
                        {b.icon}
                      </div>
                      <div>
                        <div className="font-black text-sm text-gray-900 leading-snug">
                          {b.title}
                        </div>
                        <span
                          className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md ${
                            b.tier === 'platinum'
                              ? 'bg-purple-100 text-purple-800'
                              : b.tier === 'gold'
                              ? 'bg-amber-100 text-amber-800'
                              : b.tier === 'silver'
                              ? 'bg-slate-200 text-slate-800'
                              : 'bg-orange-100 text-orange-800'
                          }`}
                        >
                          {b.tier.toUpperCase()} TIER
                        </span>
                      </div>
                    </div>

                    {isUnlocked ? (
                      <span className="p-1 rounded-full bg-emerald-100 text-emerald-700" title="Đã mở khóa">
                        <CheckCircle2 className="w-4 h-4" />
                      </span>
                    ) : (
                      <span className="p-1 rounded-full bg-gray-200 text-gray-500" title="Chưa mở khóa">
                        <Lock className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-xs text-gray-600 font-medium line-clamp-2 mb-2 leading-relaxed">
                    {b.description}
                  </p>

                  {/* Detailed HOW TO UNLOCK instruction snippet */}
                  <div className="text-[11px] bg-purple-50/60 p-2 rounded-xl text-purple-900 font-semibold mb-3 border border-purple-100/80">
                    <span className="font-bold">Cách nhận:</span> {b.howToUnlock}
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 mb-1">
                    <span>Tiến độ: {b.progress}/{b.maxProgress}</span>
                    <span>{progressRatio}%</span>
                  </div>
                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isUnlocked ? 'bg-gradient-to-r from-pink-500 to-purple-600' : 'bg-gray-400'
                      }`}
                      style={{ width: `${progressRatio}%` }}
                    />
                  </div>

                  <div className="mt-2 text-[10px] text-right font-medium text-gray-400">
                    {isUnlocked ? `Đạt được: ${b.unlockedAt || 'Gần đây'}` : 'Chưa mở khóa'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. MODAL INSPECT BADGE (CHỨNG NHẬN THÀNH TÍCH PHÓNG TO) */}
      {inspectBadge && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-pink-200 space-y-4 animate-scaleIn text-center relative">
            <button
              type="button"
              onClick={() => setInspectBadge(null)}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-20 h-20 mx-auto rounded-3xl bg-pink-50 border-2 border-pink-300 flex items-center justify-center text-5xl shadow-sm">
              {inspectBadge.icon}
            </div>

            <div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                {inspectBadge.tier.toUpperCase()} TIER · {inspectBadge.category.toUpperCase()}
              </span>
              <h3 className="text-xl font-black text-gray-900 mt-1">
                {inspectBadge.title}
              </h3>
              <p className="text-xs text-gray-600 font-medium mt-1">
                {inspectBadge.description}
              </p>
            </div>

            {/* How to unlock details */}
            <div className="p-3.5 bg-purple-50/70 rounded-2xl border border-purple-200 text-left text-xs space-y-1.5">
              <div className="font-extrabold text-purple-900 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                HƯỚNG DẪN CỤ THỂ ĐỂ NHẬN HUY HIỆU NÀY:
              </div>
              <p className="text-purple-950 font-medium leading-relaxed">
                {inspectBadge.howToUnlock}
              </p>
              <div className="text-[11px] text-gray-500 pt-1 border-t border-purple-200">
                <strong>Yêu cầu hệ thống:</strong> {inspectBadge.requirement}
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center justify-center gap-2 text-xs font-bold">
              {inspectBadge.isUnlocked ? (
                <span className="text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Đã sở hữu ({inspectBadge.unlockedAt || 'Gần đây'})
                </span>
              ) : (
                <span className="text-gray-600 bg-gray-100 px-3 py-1 rounded-full border border-gray-200 flex items-center gap-1">
                  <Lock className="w-4 h-4 text-gray-500" />
                  Đang tiến hành ({inspectBadge.progress}/{inspectBadge.maxProgress})
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                if (inspectBadge.isUnlocked) {
                  playFanfare();
                  triggerMegaConfetti();
                }
                setInspectBadge(null);
              }}
              className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-black rounded-xl text-xs shadow-md"
            >
              {inspectBadge.isUnlocked ? 'Tung Pháo Hoa Ăn Mừng 🎉' : 'Đã Hiểu, Sẽ Cố Gắng! ✨'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
