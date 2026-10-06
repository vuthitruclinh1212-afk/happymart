import React, { useState } from 'react';
import {
  X,
  User as UserIcon,
  LogOut,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Mail,
  Calendar,
  Layers,
  ArrowRight,
  LogIn,
} from 'lucide-react';
import {
  FirebaseUser,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  auth,
  googleProvider,
} from '../firebase';
import { UserProfile } from '../types';
import { playCashRegister, playSoftPop } from '../utils/audio';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: FirebaseUser | null;
  userProfile: UserProfile;
  onUpdateProfile: (updatedProfile: Partial<UserProfile>) => void;
  onSyncCloud?: () => Promise<void> | void;
}

const AVATAR_OPTIONS = ['🥑', '🥐', '🍓', '☕', '🧋', '🍱', '🍰', '🍣', '🌸', '🧸', '🐱', '🐼'];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  userProfile,
  onUpdateProfile,
  onSyncCloud,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>(userProfile.name);
  const [selectedAvatar, setSelectedAvatar] = useState<string>(userProfile.avatar);
  const [authMethod, setAuthMethod] = useState<'google' | 'email'>('google');
  const [emailInput, setEmailInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [isSignUpMode, setIsSignUpMode] = useState<boolean>(false);
  const [syncSuccess, setSyncSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      playSoftPop();
      await signInWithPopup(auth, googleProvider);
      playCashRegister();
      onClose();
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      // Clean error presentation
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMessage('Cửa sổ đăng nhập đã đóng trước khi hoàn tất.');
      } else {
        setErrorMessage(err.message || 'Không thể đăng nhập. Vui lòng thử lại!');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !passwordInput.trim()) {
      setErrorMessage('Vui lòng nhập đầy đủ địa chỉ email và mật khẩu!');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      playSoftPop();
      if (isSignUpMode) {
        await createUserWithEmailAndPassword(auth, emailInput.trim(), passwordInput);
      } else {
        await signInWithEmailAndPassword(auth, emailInput.trim(), passwordInput);
      }
      playCashRegister();
      onClose();
    } catch (err: any) {
      console.error('Email Auth Error:', err);
      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential'
      ) {
        setErrorMessage('Tài khoản hoặc mật khẩu không chính xác. Nếu chưa có tài khoản, hãy chọn Đăng Ký Mới!');
      } else if (err.code === 'auth/email-already-in-use') {
        setErrorMessage('Email này đã được đăng ký trước đó. Vui lòng chuyển sang tab Đăng Nhập!');
      } else if (err.code === 'auth/weak-password') {
        setErrorMessage('Mật khẩu cần có ít nhất 6 ký tự để bảo mật an toàn.');
      } else if (err.code === 'auth/invalid-email') {
        setErrorMessage('Định dạng email không hợp lệ (Ví dụ: ten@gmail.com).');
      } else {
        setErrorMessage(err.message || 'Không thể đăng nhập. Vui lòng thử lại!');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerSync = async () => {
    if (!onSyncCloud) return;
    setIsLoading(true);
    try {
      playSoftPop();
      await onSyncCloud();
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000);
    } catch (err) {
      console.error('Manual sync failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      playSoftPop();
      await firebaseSignOut(auth);
      onClose();
    } catch (err: any) {
      console.error('Sign-Out Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    playSoftPop();
    onUpdateProfile({
      name: editName.trim(),
      avatar: selectedAvatar,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#FFFDF9] w-full max-w-lg rounded-3xl border-2 border-pink-200 shadow-2xl p-5 sm:p-7 relative overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            playSoftPop();
            onClose();
          }}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 bg-white rounded-full border border-gray-200 hover:bg-gray-100 transition-colors shadow-2xs"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-400 to-amber-300 text-white flex items-center justify-center text-2xl shadow-sm shrink-0">
            {currentUser ? userProfile.avatar || '🥑' : '🛒'}
          </div>
          <div>
            <span className="text-[11px] font-black text-pink-700 tracking-wider uppercase bg-pink-100 px-2 py-0.5 rounded-full">
              Hệ Thống Phân Tách Người Dùng
            </span>
            <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight mt-0.5">
              {currentUser ? 'Hồ Sơ & Thẻ Thành Viên' : 'Tạo Tài Khoản / Đăng Nhập'}
            </h2>
          </div>
        </div>

        {/* NOT LOGGED IN STATE */}
        {!currentUser ? (
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-br from-pink-50 via-purple-50 to-amber-50 rounded-2xl border border-pink-200/80 text-xs text-gray-700 leading-relaxed">
              <div className="font-black text-pink-900 mb-1 flex items-center gap-1.5 text-sm">
                <Sparkles className="w-4 h-4 text-pink-600" />
                Chia sẻ app cho nhiều người dùng độc lập!
              </div>
              <p>
                Mỗi người khi tạo tài khoản sẽ có một <strong>kho lưu trữ dữ liệu hoàn toàn riêng biệt</strong>. Chi tiêu, hóa đơn và 6 hũ của bạn được bảo mật tuyệt đối, không bị lẫn lộn với người khác.
              </p>
            </div>

            {/* Value props bullets */}
            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Tách biệt 100% ngân sách 6 hũ và các nguồn ví tiền</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Lịch sử hóa đơn siêu thị & tâm lý chi tiêu cá nhân</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Đồng bộ hóa đám mây tức thì trên điện thoại và máy tính</span>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold">
                ⚠️ {errorMessage}
              </div>
            )}

            {/* Auth Method Selector */}
            <div className="flex rounded-2xl bg-gray-100 p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  playSoftPop();
                  setAuthMethod('google');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2 rounded-xl transition-all ${
                  authMethod === 'google'
                    ? 'bg-white text-gray-900 shadow-2xs font-black'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Google (1 Chạm) ⚡
              </button>
              <button
                type="button"
                onClick={() => {
                  playSoftPop();
                  setAuthMethod('email');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2 rounded-xl transition-all ${
                  authMethod === 'email'
                    ? 'bg-white text-gray-900 shadow-2xs font-black'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Email & Mật Khẩu ✉️
              </button>
            </div>

            {authMethod === 'google' ? (
              /* Google Login Button */
              <div className="pt-1 space-y-2">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 bg-white hover:bg-gray-50 border-2 border-gray-300 rounded-2xl font-black text-gray-800 text-sm flex items-center justify-center gap-3 shadow-sm hover:border-gray-400 hover:shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {/* Google SVG Logo */}
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>
                    {isLoading ? 'Đang kết nối...' : 'Đăng Nhập Nhanh với Google'}
                  </span>
                </button>
                <p className="text-[11px] text-gray-400 text-center">
                  Tự động đồng bộ cùng 1 tài khoản trên mọi thiết bị đăng nhập bằng Gmail này!
                </p>
              </div>
            ) : (
              /* Email & Password Form */
              <form onSubmit={handleEmailAuth} className="space-y-3 pt-1">
                <div>
                  <label className="block font-bold text-gray-700 text-xs mb-1">
                    Địa chỉ Email của bạn:
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="ví dụ: nguyena@gmail.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs text-gray-800 focus:outline-none focus:border-pink-400"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 text-xs mb-1">
                    Mật khẩu:
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Tối thiểu 6 ký tự..."
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs text-gray-800 focus:outline-none focus:border-pink-400"
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      playSoftPop();
                      setIsSignUpMode(!isSignUpMode);
                      setErrorMessage(null);
                    }}
                    className="text-pink-600 font-bold hover:underline"
                  >
                    {isSignUpMode
                      ? 'Đã có tài khoản? Bấm để Đăng Nhập'
                      : 'Chưa có tài khoản? Bấm để Đăng Ký'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-gradient-to-r from-pink-500 via-purple-500 to-pink-600 hover:opacity-95 text-white font-black rounded-2xl text-xs shadow-md shadow-pink-200 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isLoading
                    ? 'Đang xử lý...'
                    : isSignUpMode
                    ? 'Tạo Tài Khoản & Kích Hoạt 🌟'
                    : 'Đăng Nhập Tài Khoản 🚀'}
                </button>
              </form>
            )}
          </div>
        ) : (
          /* LOGGED IN MEMBER CARD STATE */
          <div className="space-y-4">
            {/* Supermarket VIP Member Card Design */}
            <div className="p-4 sm:p-5 bg-gradient-to-tr from-purple-600 via-pink-600 to-rose-500 rounded-3xl text-white shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-15 text-7xl pointer-events-none select-none">
                💳
              </div>

              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2.5 py-0.5 rounded-full border border-white/30 backdrop-blur-xs">
                  THẺ THÀNH VIÊN CHÍNH THỨC
                </span>
                <span className="text-xs font-mono font-bold text-pink-100">
                  {userProfile.memberId}
                </span>
              </div>

              <div className="flex items-center gap-3 my-2">
                <div className="text-3xl p-2 bg-white/20 rounded-2xl backdrop-blur-xs border border-white/20">
                  {userProfile.avatar}
                </div>
                <div>
                  <h3 className="font-black text-lg text-white leading-snug">
                    {userProfile.name}
                  </h3>
                  <div className="text-xs text-pink-100 flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    <span>{currentUser.email}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[11px] text-pink-100 mt-2">
                <span>Tham gia: {userProfile.joinedDate}</span>
                <span className="font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Đồng bộ đa thiết bị cùng email
                </span>
              </div>
            </div>

            {/* Cloud Sync Quick Action Button */}
            {onSyncCloud && (
              <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 flex items-center justify-between gap-2 text-xs">
                <div className="text-purple-900 font-semibold">
                  <span>Dữ liệu được liên kết theo email: <strong>{currentUser.email}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={handleTriggerSync}
                  disabled={isLoading}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-2xs shrink-0 disabled:opacity-50"
                >
                  <span>{syncSuccess ? '✅ Đã đồng bộ!' : 'Đồng Bộ Ngay 🔄'}</span>
                </button>
              </div>
            )}

            {/* Customization form */}
            <form onSubmit={handleSaveProfile} className="space-y-3 pt-2 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Biệt danh hiển thị trong siêu thị:
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-gray-800 focus:outline-none focus:border-pink-400"
                  placeholder="Nhập tên của bạn..."
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Chọn Avatar Dopamine yêu thích:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {AVATAR_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        playSoftPop();
                        setSelectedAvatar(emoji);
                      }}
                      className={`text-xl p-1.5 rounded-xl border transition-all ${
                        selectedAvatar === emoji
                          ? 'bg-pink-100 border-pink-400 scale-110 shadow-xs'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-black text-xs shadow-xs transition-colors"
                >
                  Cập Nhật Hồ Sơ ✨
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isLoading}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-rose-50 hover:text-rose-600 text-gray-700 rounded-xl font-bold text-xs border border-gray-200 transition-colors flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng Xuất</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
