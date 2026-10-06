import React, { useState } from 'react';
import { Jar, Wallet, MoodId } from '../types';
import { MOODS } from '../utils/storage';
import { playScannerBeep, playCashRegister, playSoftPop } from '../utils/audio';
import { triggerConfetti } from '../utils/confetti';
import { ScanBarcode, Sparkles, Clock, AlertCircle } from 'lucide-react';

interface ScannerCheckoutProps {
  jars: Jar[];
  wallets: Wallet[];
  hourlyWage: number;
  initialJarId?: string;
  initialSubCategory?: string;
  onAddTransaction: (tx: {
    amount: number;
    jarId: string;
    subCategory: string;
    walletId: string;
    mood: MoodId;
    note: string;
    date: string;
  }) => void;
}

export const ScannerCheckout: React.FC<ScannerCheckoutProps> = ({
  jars,
  wallets,
  hourlyWage,
  initialJarId,
  initialSubCategory,
  onAddTransaction,
}) => {
  const [amountStr, setAmountStr] = useState<string>('');
  const [jarId, setJarId] = useState<string>(initialJarId || 'nec');
  const [subCategory, setSubCategory] = useState<string>(initialSubCategory || 'Ăn sáng');
  const [walletId, setWalletId] = useState<string>(wallets[0]?.id || 'cash');
  const [mood, setMood] = useState<MoodId>('love');
  const [note, setNote] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [lastScanAlert, setLastScanAlert] = useState<{ hours: string; amount: number } | null>(null);

  // Sync subcategory when jar changes
  const currentJar = jars.find((j) => j.id === jarId) || jars[0];
  const currentWallet = wallets.find((w) => w.id === walletId) || wallets[0];

  const amountNum = Number(amountStr) || 0;
  const workHours = (amountNum / (hourlyWage || 1)).toFixed(1);
  const workHoursNum = Number(workHours);
  const dayEquivalent = (workHoursNum / 8).toFixed(1);

  const quickAdds = [20000, 50000, 100000, 200000, 500000];

  const handleQuickAdd = (val: number) => {
    playSoftPop();
    const current = Number(amountStr) || 0;
    setAmountStr(String(current + val));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountNum || amountNum <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ!');
      return;
    }

    // Check wallet balance warning
    if (currentWallet && currentWallet.balance < amountNum) {
      const confirmSpend = window.confirm(
        `Số dư ${currentWallet.name} hiện tại là ${currentWallet.balance.toLocaleString('vi-VN')} đ (thấp hơn ${amountNum.toLocaleString('vi-VN')} đ). Bạn vẫn muốn quét thanh toán chứ?`
      );
      if (!confirmSpend) return;
    }

    // Play scanner beep
    setIsScanning(true);
    playScannerBeep();

    setTimeout(() => {
      playCashRegister();
      if (mood === 'love') {
        triggerConfetti();
      }

      onAddTransaction({
        amount: amountNum,
        jarId,
        subCategory: subCategory || (currentJar?.subs[0] ?? 'Khác'),
        walletId,
        mood,
        note,
        date,
      });

      setLastScanAlert({
        hours: workHours,
        amount: amountNum,
      });

      // Reset
      setAmountStr('');
      setNote('');
      setIsScanning(false);
    }, 180);
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Scanner Visual Container */}
      <div className="bg-white rounded-3xl border-2 border-emerald-200/90 shadow-md p-6 relative overflow-hidden">
        {/* Scanner Laser Simulation */}
        <div className="relative border-2 border-dashed border-emerald-300 rounded-2xl p-4 bg-emerald-50/40 text-center mb-6">
          <div className="flex items-center justify-center gap-3">
            <span className="text-4xl animate-bounce">🛍️</span>
            <div>
              <h2 className="text-lg font-black text-emerald-950 flex items-center gap-1.5 justify-center">
                <span>QUẦY QUÉT MÃ TÍNH TIỀN</span>
                <ScanBarcode className="w-5 h-5 text-emerald-600" />
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                Mỗi món đồ bạn mua đều được trả bằng mồ hôi và thời gian lao động!
              </p>
            </div>
          </div>

          {/* Barcode Laser line */}
          <div className="mt-3 relative h-1.5 bg-emerald-100 rounded-full overflow-hidden">
            <div className={`h-full bg-rose-500 rounded-full ${isScanning ? 'animate-pulse' : 'scanner-beam'}`} />
          </div>
        </div>

        {/* Success Alert Banner if just scanned */}
        {lastScanAlert && (
          <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between text-xs text-emerald-900 animate-fadeIn">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Bíp! Đã quét thành công:</strong> -{lastScanAlert.amount.toLocaleString('vi-VN')} đ (~{lastScanAlert.hours}h lao động)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setLastScanAlert(null)}
              className="text-emerald-700 hover:text-emerald-900 font-bold px-2"
            >
              ✕
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount input & Quick Chips */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-gray-700 tracking-wider">
                SỐ TIỀN CHI (VNĐ) *
              </label>
              {amountNum > 0 && (
                <button
                  type="button"
                  onClick={() => setAmountStr('')}
                  className="text-[11px] text-gray-400 hover:text-gray-600 font-medium"
                >
                  Xóa số
                </button>
              )}
            </div>

            <div className="relative">
              <input
                type="number"
                min="0"
                step="1000"
                placeholder="VD: 55000"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full text-2xl sm:text-3xl font-black p-3.5 bg-amber-50/70 border-2 border-amber-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-800 placeholder-gray-300 tracking-tight transition-all"
                required
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-amber-700">
                VNĐ
              </span>
            </div>

            {/* Quick add buttons */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {quickAdds.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAdd(val)}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-amber-100/70 hover:bg-amber-200/80 text-amber-900 border border-amber-200 transition-colors"
                >
                  +{val >= 1000000 ? `${val / 1000000}Tr` : `${val / 1000}k`}
                </button>
              ))}
            </div>

            {/* REAL-TIME WORK HOURS CONVERSION BANNER */}
            {amountNum > 0 && (
              <div className="mt-3 p-3 bg-gradient-to-r from-purple-50 via-pink-50 to-amber-50 rounded-2xl border border-purple-200/80 text-xs">
                <div className="flex items-center gap-2 text-purple-900 font-bold">
                  <Clock className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>
                    Món này đổi bằng:{' '}
                    <span className="text-base font-black text-purple-700 bg-white px-2 py-0.5 rounded-lg border border-purple-200">
                      {workHours} GIỜ
                    </span>{' '}
                    lao động cày cuốc! 💻
                  </span>
                </div>
                <div className="text-[11px] text-purple-700/80 mt-1 pl-6">
                  (Tương đương khoảng <strong className="font-bold">{dayEquivalent}</strong> ngày làm việc chuẩn 8 tiếng với mức lương {hourlyWage.toLocaleString('vi-VN')} đ/giờ)
                </div>
              </div>
            )}
          </div>

          {/* Jars & Subcategory */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                CHỌN HŨ CHI TIÊU *
              </label>
              <select
                value={jarId}
                onChange={(e) => {
                  const newJarId = e.target.value;
                  setJarId(newJarId);
                  const selected = jars.find((j) => j.id === newJarId);
                  if (selected && selected.subs.length > 0) {
                    setSubCategory(selected.subs[0]);
                  }
                }}
                className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300"
              >
                {jars.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.icon} {j.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                DANH MỤC CON CHI TIẾT
              </label>
              <select
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300"
              >
                {currentJar.subs.map((s, idx) => (
                  <option key={idx} value={s}>
                    🏷️ {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Wallets & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                NGUỒN TIỀN CHI TRẢ (VÍ)
              </label>
              <select
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.icon} {w.name} ({w.balance.toLocaleString('vi-VN')} đ)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                NGÀY THANH TOÁN
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>
          </div>

          {/* Mood Tracker */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              CẢM XÚC CỦA BẠN VỀ KHOẢN CHI NÀY? 💖
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {MOODS.map((m) => {
                const isSelected = mood === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      playSoftPop();
                      setMood(m.id);
                    }}
                    className={`p-2.5 rounded-2xl border text-center transition-all ${
                      isSelected
                        ? `${m.color} scale-102 shadow-xs font-black ring-2 ring-pink-300`
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200'
                    }`}
                  >
                    <span className="text-2xl block">{m.icon}</span>
                    <span className="text-[11px] font-bold block mt-1 leading-tight">
                      {m.label}
                    </span>
                    <span className="text-[9px] text-gray-400 block mt-0.5 leading-tight">
                      {m.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              GHI CHÚ / KỶ NIỆM (TÙY CHỌN)
            </label>
            <input
              type="text"
              placeholder="VD: Đi siêu thị mua rau quả tươi, Ăn mừng đỗ kỳ thi..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>

          {/* Scanner Button with Supermarket Sound */}
          <button
            type="submit"
            disabled={isScanning}
            className={`w-full py-4 text-white font-black rounded-2xl text-base shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer ${
              isScanning
                ? 'bg-emerald-600 animate-pulse'
                : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200'
            }`}
          >
            <ScanBarcode className="w-5 h-5" />
            <span>{isScanning ? 'ĐANG QUÉT MÃ...' : 'BÍP! QUÉT MÃ THANH TOÁN NGAY 🛒'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
