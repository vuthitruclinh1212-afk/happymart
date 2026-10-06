import React from 'react';
import { Volume2, VolumeX, Settings, Sparkles, Clock, UserCheck, LogIn, User as UserIcon, Music } from 'lucide-react';
import { UserRank, UserProfile } from '../types';
import { FirebaseUser } from '../firebase';
import { playSoftPop } from '../utils/audio';

interface HeaderProps {
  hourlyWage: number;
  setHourlyWage: (wage: number) => void;
  userRank: UserRank;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  onOpenSettings: () => void;
  totalTransactionsCount: number;
  currentUser: FirebaseUser | null;
  userProfile: UserProfile;
  onOpenAuth: () => void;
  onOpenMusicStation: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  hourlyWage,
  setHourlyWage,
  userRank,
  isMuted,
  setIsMuted,
  onOpenSettings,
  totalTransactionsCount,
  currentUser,
  userProfile,
  onOpenAuth,
  onOpenMusicStation,
}) => {
  return (
    <header className="bg-white/90 backdrop-blur-md border border-pink-200/80 rounded-3xl p-4 sm:p-5 shadow-sm transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Brand Zone: Clean, playful supermarket wordmark */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-pink-200 via-rose-100 to-amber-100 flex items-center justify-center text-2xl shadow-inner border border-pink-200 shrink-0">
            🛒
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl sm:text-2xl tracking-tight bg-gradient-to-r from-pink-500 via-purple-500 to-emerald-500 bg-clip-text text-transparent">
                HAPPY MART FIN
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 text-[11px] font-bold">
                v2.0 Pastel
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium">
              Siêu thị tài chính dopamine · 6 hũ đa tầng & quy đổi giờ cày cuốc ✨
            </p>
          </div>
        </div>

        {/* Action & Stats Zone */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 text-xs">
          {/* User Account Pill / Button */}
          <button
            type="button"
            onClick={() => {
              playSoftPop();
              onOpenAuth();
            }}
            className={`px-3 py-1.5 rounded-2xl border font-bold flex items-center gap-1.5 transition-all shadow-2xs hover:scale-105 active:scale-95 ${
              currentUser
                ? 'bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100'
                : 'bg-gradient-to-r from-pink-500 to-purple-600 text-white border-pink-400 hover:opacity-95 shadow-pink-200'
            }`}
            title={currentUser ? 'Xem thẻ thành viên & tài khoản' : 'Tạo tài khoản hoặc đăng nhập để tách biệt dữ liệu'}
          >
            {currentUser ? (
              <>
                <span className="text-sm">{userProfile.avatar || '🥑'}</span>
                <span className="font-extrabold truncate max-w-28 sm:max-w-36">
                  {userProfile.name}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Đã đồng bộ hóa dữ liệu cá nhân" />
              </>
            ) : (
              <>
                <LogIn className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">Đăng Nhập / Tạo Tài Khoản</span>
              </>
            )}
          </button>

          {/* User Rank Title */}
          <div 
            title={userRank.description}
            className={`px-3 py-1.5 rounded-2xl border font-bold flex items-center gap-1.5 shadow-sm ${userRank.bg} cursor-help transition-transform hover:scale-105`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="whitespace-nowrap">{userRank.title}</span>
            <span className="text-[10px] opacity-70">({totalTransactionsCount} đơn)</span>
          </div>

          {/* Wage per Hour pill/input */}
          <div 
            className="flex items-center gap-1 bg-amber-50/90 border border-amber-200 px-3 py-1.5 rounded-2xl text-amber-900 font-medium shadow-xs"
            title="Mức lương của bạn tính theo 1 giờ làm việc. Mọi khoản chi sẽ tự động quy đổi thành số giờ tương ứng!"
          >
            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="text-xs font-semibold whitespace-nowrap">1h =</span>
            <input
              type="number"
              min={1000}
              step={5000}
              value={hourlyWage}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val >= 0) setHourlyWage(val);
              }}
              className="w-16 px-1.5 py-0.5 bg-white border border-amber-300 rounded-lg font-bold text-center text-amber-900 focus:outline-none focus:ring-1 focus:ring-amber-400 text-xs"
            />
            <span className="font-bold text-[11px] text-amber-700">đ</span>
          </div>

          {/* Sound Toggle Button */}
          <button
            type="button"
            onClick={() => {
              playSoftPop();
              setIsMuted(!isMuted);
            }}
            title={isMuted ? 'Bật âm thanh Bíp siêu thị' : 'Tắt âm thanh'}
            className={`w-9 h-9 rounded-2xl border flex items-center justify-center transition-all ${
              isMuted
                ? 'bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 shadow-xs'
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Music Station modal button */}
          <button
            type="button"
            onClick={() => {
              playSoftPop();
              onOpenMusicStation();
            }}
            title="Quầy Nhạc Siêu Thị & Bài Hát Yêu Thích 📻"
            className="w-9 h-9 rounded-2xl bg-pink-50 text-pink-700 border border-pink-200 hover:bg-pink-100 flex items-center justify-center transition-all shadow-xs"
          >
            <Music className="w-4 h-4" />
          </button>

          {/* Settings / Wallets modal button */}
          <button
            type="button"
            onClick={() => {
              playSoftPop();
              onOpenSettings();
            }}
            title="Cài đặt ngân sách, ví tiền & dữ liệu"
            className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 flex items-center justify-center transition-all shadow-xs"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

