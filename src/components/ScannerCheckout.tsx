import React, { useState, useEffect } from 'react';
import { Jar, Wallet, MoodId } from '../types';
import { MOODS, getLocalDateString } from '../utils/storage';
import { playScannerBeep, playCashRegister, playSoftPop, playFanfare } from '../utils/audio';
import { triggerConfetti } from '../utils/confetti';
import {
  ScanBarcode,
  Sparkles,
  Clock,
  AlertCircle,
  ShoppingBag,
  ArrowDownToLine,
  Coins,
  CheckCircle2,
  Wallet as WalletIcon,
  TrendingUp,
  ArrowLeftRight,
  ArrowRight,
} from 'lucide-react';

interface ScannerCheckoutProps {
  jars: Jar[];
  wallets: Wallet[];
  hourlyWage: number;
  initialJarId?: string;
  initialSubCategory?: string;
  initialWalletId?: string;
  initialTargetWalletId?: string;
  initialMode?: 'expense' | 'income' | 'transfer';
  onModeChange?: (mode: 'expense' | 'income' | 'transfer') => void;
  onAddTransaction: (tx: {
    amount: number;
    jarId: string;
    subCategory: string;
    walletId: string;
    targetWalletId?: string;
    mood: MoodId;
    note: string;
    date: string;
    type?: 'expense' | 'income' | 'transfer';
    source?: string;
  }) => void;
}

const INCOME_PRESETS = [
  { label: '💼 Lương tháng / Thu nhập chính', name: 'Tiền lương định kỳ', defaultJar: 'ffa' },
  { label: '🎁 Thưởng / Hoa hồng (Bonus)', name: 'Tiền thưởng dự án', defaultJar: 'ffa' },
  { label: '💻 Freelance / Làm thêm ngoài giờ', name: 'Thu nhập Freelance', defaultJar: 'ffa' },
  { label: '📦 Bán đồ cũ / Thanh lý đồ đạc', name: 'Thanh lý đồ cũ', defaultJar: 'nec' },
  { label: '🧧 Lì xì / Quà biếu / Được tặng', name: 'Quà biếu / Lì xì', defaultJar: 'play' },
  { label: '📈 Lãi tiết kiệm / Cổ tức đầu tư', name: 'Lãi tiết kiệm & Cổ tức', defaultJar: 'ffa' },
  { label: '🔄 Hoàn tiền / Đòi nợ thành công', name: 'Thu hồi nợ / Hoàn tiền', defaultJar: 'nec' },
  { label: '✨ Thu nhập phụ khác', name: 'Thu nhập khác', defaultJar: 'ffa' },
];

const TRANSFER_PRESETS = [
  { label: '🛡️ Trích quỹ tiết kiệm mục tiêu', name: 'Tiết kiệm mục tiêu định kỳ', note: 'Chuyển tiền vào tài khoản tiết kiệm có kỷ luật' },
  { label: '💵 Rút tiền mặt chi tiêu', name: 'Rút tiền mặt chi tiêu', note: 'Rút tiền mặt từ ngân hàng để chi tiêu hàng ngày' },
  { label: '💳 Nạp tiền vào tài khoản ngân hàng', name: 'Nạp tiền thẻ / tài khoản', note: 'Nạp tiền để tiện quẹt thẻ hoặc thanh toán online' },
  { label: '📱 Nạp ví điện tử MoMo', name: 'Nạp ví điện tử MoMo', note: 'Chuyển tiền sang ví điện tử để mua sắm' },
  { label: '📈 Chuyển tiền đầu tư tích sản', name: 'Đầu tư tích sản', note: 'Chuyển tiền vào tài khoản chứng khoán / vàng tích sản' },
  { label: '🔁 Điều hòa dòng tiền túi trái sang túi phải', name: 'Điều chuyển nội bộ', note: 'Cân đối dòng tiền giữa các ví' },
];

const INCOME_MOODS: { id: MoodId; icon: string; label: string; desc: string; color: string }[] = [
  {
    id: 'love' as MoodId,
    icon: '🥳',
    label: 'Rất Phấn Khởi',
    desc: 'Tiền về tài khoản, tâm trạng bừng sáng!',
    color: 'bg-emerald-100 text-emerald-950 border-emerald-400',
  },
  {
    id: 'okay' as MoodId,
    icon: '🥰',
    label: 'Tự Hào',
    desc: 'Xứng đáng cho mồ hôi công sức lao động.',
    color: 'bg-teal-100 text-teal-950 border-teal-400',
  },
  {
    id: 'hesitant' as MoodId,
    icon: '😌',
    label: 'An Tâm',
    desc: 'Gia tăng nguồn vốn dự phòng an toàn.',
    color: 'bg-cyan-100 text-cyan-950 border-cyan-400',
  },
  {
    id: 'regret' as MoodId,
    icon: '✨',
    label: 'Động Lực',
    desc: 'Khích lệ tinh thần tiếp tục phấn đấu.',
    color: 'bg-indigo-100 text-indigo-950 border-indigo-400',
  },
];

const TRANSFER_MOODS: { id: MoodId; icon: string; label: string; desc: string; color: string }[] = [
  {
    id: 'love' as MoodId,
    icon: '🛡️',
    label: 'Kỷ Luật Cao',
    desc: 'Chuyển tiền tiết kiệm đúng cam kết!',
    color: 'bg-purple-100 text-purple-950 border-purple-400',
  },
  {
    id: 'okay' as MoodId,
    icon: '😌',
    label: 'An Toàn',
    desc: 'Bảo toàn tài sản, không mất một đồng!',
    color: 'bg-indigo-100 text-indigo-950 border-indigo-400',
  },
  {
    id: 'hesitant' as MoodId,
    icon: '⚖️',
    label: 'Cân Đối',
    desc: 'Điều hòa số dư giữa các tài khoản hợp lý.',
    color: 'bg-blue-100 text-blue-950 border-blue-400',
  },
  {
    id: 'regret' as MoodId,
    icon: '✨',
    label: 'Chủ Động',
    desc: 'Quản trị dòng tiền một cách thông minh.',
    color: 'bg-teal-100 text-teal-950 border-teal-400',
  },
];

export const ScannerCheckout: React.FC<ScannerCheckoutProps> = ({
  jars,
  wallets,
  hourlyWage,
  initialJarId,
  initialSubCategory,
  initialWalletId,
  initialTargetWalletId,
  initialMode = 'expense',
  onModeChange,
  onAddTransaction,
}) => {
  const [mode, setMode] = useState<'expense' | 'income' | 'transfer'>(initialMode);
  const [amountStr, setAmountStr] = useState<string>('');
  const [jarId, setJarId] = useState<string>(initialJarId || 'nec');
  const [subCategory, setSubCategory] = useState<string>(initialSubCategory || 'Ăn sáng');
  const [walletId, setWalletId] = useState<string>(initialWalletId || wallets[0]?.id || 'cash');
  const [targetWalletId, setTargetWalletId] = useState<string>(() => {
    if (initialTargetWalletId && initialTargetWalletId !== (initialWalletId || wallets[0]?.id)) {
      return initialTargetWalletId;
    }
    const other = wallets.find((w) => w.id !== (initialWalletId || wallets[0]?.id));
    return other ? other.id : (wallets[1]?.id || wallets[0]?.id || 'bank');
  });
  const [mood, setMood] = useState<MoodId>('love');
  const [note, setNote] = useState<string>('');
  const [date, setDate] = useState<string>(() => getLocalDateString());
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [lastScanAlert, setLastScanAlert] = useState<{
    hours: string;
    amount: number;
    type: 'expense' | 'income' | 'transfer';
    walletName: string;
  } | null>(null);

  // Sync mode if initialMode prop updates
  useEffect(() => {
    if (initialMode) setMode(initialMode);
  }, [initialMode]);

  // Sync walletId if initialWalletId prop updates
  useEffect(() => {
    if (initialWalletId) setWalletId(initialWalletId);
  }, [initialWalletId]);

  // Sync targetWalletId if initialTargetWalletId prop updates
  useEffect(() => {
    if (initialTargetWalletId) setTargetWalletId(initialTargetWalletId);
  }, [initialTargetWalletId]);

  // Sync jarId & subCategory if props update
  useEffect(() => {
    if (initialJarId) setJarId(initialJarId);
  }, [initialJarId]);

  useEffect(() => {
    if (initialSubCategory) setSubCategory(initialSubCategory);
  }, [initialSubCategory]);

  // Sync subcategory when jar changes in expense mode
  const currentJar = jars.find((j) => j.id === jarId) || jars[0];
  const currentWallet = wallets.find((w) => w.id === walletId) || wallets[0];
  const currentTargetWallet = wallets.find((w) => w.id === targetWalletId) || wallets[1] || wallets[0];

  const amountNum = Number(amountStr) || 0;
  const workHours = (amountNum / (hourlyWage || 1)).toFixed(1);
  const workHoursNum = Number(workHours);
  const dayEquivalent = (workHoursNum / 8).toFixed(1);

  const quickAddsExpense = [20000, 50000, 100000, 200000, 500000];
  const quickAddsIncome = [500000, 1000000, 2000000, 5000000, 10000000, 20000000];
  const quickAddsTransfer = [100000, 200000, 500000, 1000000, 2000000, 5000000];

  const handleModeSwitch = (newMode: 'expense' | 'income' | 'transfer') => {
    playSoftPop();
    setMode(newMode);
    if (onModeChange) onModeChange(newMode);

    if (newMode === 'income') {
      // Default to FFA jar or general
      setJarId('ffa');
      setSubCategory('Tiền lương định kỳ');
    } else if (newMode === 'transfer') {
      setJarId('ltss');
      setSubCategory('Tiết kiệm mục tiêu định kỳ');
      if (walletId === targetWalletId) {
        const other = wallets.find((w) => w.id !== walletId);
        if (other) setTargetWalletId(other.id);
      }
    } else {
      setJarId(initialJarId || 'nec');
      setSubCategory(initialSubCategory || 'Ăn sáng');
    }
  };

  const handleSwapWallets = () => {
    playSoftPop();
    const temp = walletId;
    setWalletId(targetWalletId);
    setTargetWalletId(temp);
  };

  const handleQuickAdd = (val: number) => {
    playSoftPop();
    const current = Number(amountStr) || 0;
    setAmountStr(String(current + val));
  };

  const handleSelectIncomePreset = (preset: typeof INCOME_PRESETS[0]) => {
    playSoftPop();
    setSubCategory(preset.name);
    if (preset.defaultJar && jars.some((j) => j.id === preset.defaultJar)) {
      setJarId(preset.defaultJar);
    }
  };

  const handleSelectTransferPreset = (preset: typeof TRANSFER_PRESETS[0]) => {
    playSoftPop();
    setSubCategory(preset.name);
    if (preset.note && !note) {
      setNote(preset.note);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountNum || amountNum <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ lớn hơn 0!');
      return;
    }

    if (mode === 'transfer') {
      // TRANSFER MODE (CHUYỂN TIỀN TÚI TRÁI SANG TÚI PHẢI)
      if (walletId === targetWalletId) {
        alert('Vui lòng chọn 2 ví khác nhau để thực hiện chuyển tiền!');
        return;
      }

      if (currentWallet && currentWallet.balance < amountNum) {
        const confirmSpend = window.confirm(
          `Số dư ${currentWallet.name} hiện tại là ${currentWallet.balance.toLocaleString('vi-VN')} đ (thấp hơn số tiền muốn chuyển ${amountNum.toLocaleString('vi-VN')} đ). Bạn vẫn muốn thực hiện chuyển tiền chứ?`
        );
        if (!confirmSpend) return;
      }

      setIsScanning(true);
      playCashRegister();
      playFanfare();
      triggerConfetti();

      setTimeout(() => {
        onAddTransaction({
          amount: amountNum,
          jarId: jarId || 'ltss',
          subCategory: subCategory || `Chuyển: ${currentWallet?.name} ➔ ${currentTargetWallet?.name}`,
          walletId,
          targetWalletId,
          mood,
          note: note.trim() || `Chuyển tiền: ${currentWallet?.name} sang ${currentTargetWallet?.name}`,
          date,
          type: 'transfer',
          source: `${currentWallet?.name} ➔ ${currentTargetWallet?.name}`,
        });

        setLastScanAlert({
          hours: '0',
          amount: amountNum,
          type: 'transfer',
          walletName: `${currentWallet?.name} ➔ ${currentTargetWallet?.name}`,
        });

        // Reset
        setAmountStr('');
        setNote('');
        setIsScanning(false);
      }, 200);
      return;
    }

    if (mode === 'expense') {
      // Check wallet balance warning
      if (currentWallet && currentWallet.balance < amountNum) {
        const confirmSpend = window.confirm(
          `Số dư ${currentWallet.name} hiện tại là ${currentWallet.balance.toLocaleString('vi-VN')} đ (thấp hơn ${amountNum.toLocaleString('vi-VN')} đ). Bạn vẫn muốn quét thanh toán chứ?`
        );
        if (!confirmSpend) return;
      }

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
          type: 'expense',
          source: currentWallet?.name,
        });

        setLastScanAlert({
          hours: workHours,
          amount: amountNum,
          type: 'expense',
          walletName: currentWallet?.name || 'Ví',
        });

        // Reset
        setAmountStr('');
        setNote('');
        setIsScanning(false);
      }, 180);
    } else {
      // INCOME MODE
      setIsScanning(true);
      playCashRegister();
      playFanfare();
      triggerConfetti();

      setTimeout(() => {
        onAddTransaction({
          amount: amountNum,
          jarId: jarId || 'ffa',
          subCategory: subCategory || 'Thu nhập cá nhân',
          walletId,
          mood,
          note: note.trim() || `Thu nhập nạp vào ${currentWallet?.name}`,
          date,
          type: 'income',
          source: currentWallet?.name,
        });

        setLastScanAlert({
          hours: workHours,
          amount: amountNum,
          type: 'income',
          walletName: currentWallet?.name || 'Ví',
        });

        // Reset
        setAmountStr('');
        setNote('');
        setIsScanning(false);
      }, 200);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-5 animate-fadeIn">
      {/* Top Segmented Switcher: Chi Tiêu vs Thu Nhập vs Chuyển Tiền */}
      <div className="grid grid-cols-1 sm:grid-cols-3 p-1.5 bg-gray-100 rounded-3xl font-black text-xs sm:text-sm shadow-inner gap-1">
        <button
          type="button"
          onClick={() => handleModeSwitch('expense')}
          className={`py-2.5 px-3 rounded-2xl transition-all flex items-center justify-center gap-1.5 ${
            mode === 'expense'
              ? 'bg-white text-rose-700 shadow-md border border-rose-100 scale-101'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4 text-rose-500" />
          <span>Quét Chi Tiêu 🛒</span>
        </button>

        <button
          type="button"
          onClick={() => handleModeSwitch('income')}
          className={`py-2.5 px-3 rounded-2xl transition-all flex items-center justify-center gap-1.5 ${
            mode === 'income'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-200 scale-101'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <ArrowDownToLine className="w-4 h-4 text-emerald-200" />
          <span>Ghi Thu Nhập 💰</span>
        </button>

        <button
          type="button"
          onClick={() => handleModeSwitch('transfer')}
          className={`py-2.5 px-3 rounded-2xl transition-all flex items-center justify-center gap-1.5 ${
            mode === 'transfer'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-200 scale-101'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4 text-purple-200" />
          <span>Chuyển Tiền Ví 🔄</span>
        </button>
      </div>

      {/* Main Form Container */}
      <div
        className={`bg-white rounded-3xl border-2 shadow-md p-6 relative overflow-hidden transition-all ${
          mode === 'income'
            ? 'border-emerald-300 ring-2 ring-emerald-100'
            : mode === 'transfer'
            ? 'border-purple-300 ring-2 ring-purple-100'
            : 'border-emerald-200/90'
        }`}
      >
        {/* Visual Banner Header */}
        <div
          className={`relative border-2 border-dashed rounded-2xl p-4 text-center mb-6 transition-colors ${
            mode === 'income'
              ? 'border-emerald-400 bg-emerald-50/70 text-emerald-950'
              : mode === 'transfer'
              ? 'border-purple-400 bg-purple-50/70 text-purple-950'
              : 'border-emerald-300 bg-emerald-50/40 text-emerald-950'
          }`}
        >
          <div className="flex items-center justify-center gap-3">
            <span className="text-4xl animate-bounce">
              {mode === 'income' ? '💵' : mode === 'transfer' ? '🔄' : '🛍️'}
            </span>
            <div>
              <h2 className="text-lg font-black flex items-center gap-1.5 justify-center">
                <span>
                  {mode === 'income'
                    ? 'QUẦY GHI NHẬN THU NHẬP & NẠP VÍ'
                    : mode === 'transfer'
                    ? 'QUẦY CHUYỂN TIỀN QUA LẠI GIỮA CÁC VÍ'
                    : 'QUẦY QUÉT MÃ TÍNH TIỀN CHI TIÊU'}
                </span>
                {mode === 'income' ? (
                  <Coins className="w-5 h-5 text-emerald-600" />
                ) : mode === 'transfer' ? (
                  <ArrowLeftRight className="w-5 h-5 text-purple-600" />
                ) : (
                  <ScanBarcode className="w-5 h-5 text-emerald-600" />
                )}
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                {mode === 'income'
                  ? 'Ting ting! Nạp tiền về tài khoản, tăng số dư các ví và ghi chép dòng tiền dương ✨'
                  : mode === 'transfer'
                  ? 'Chuyển tiền từ túi trái sang túi phải (VD: MB Bank sang Techcombank). Bảo toàn tài sản an toàn ✨'
                  : 'Mỗi món đồ bạn mua đều được trả bằng mồ hôi và thời gian lao động!'}
              </p>
            </div>
          </div>

          {/* Laser line simulation */}
          <div className="mt-3 relative h-1.5 bg-emerald-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                mode === 'income'
                  ? 'bg-gradient-to-r from-emerald-500 via-amber-400 to-teal-400'
                  : mode === 'transfer'
                  ? 'bg-gradient-to-r from-purple-500 via-indigo-400 to-pink-500'
                  : 'bg-rose-500'
              } ${isScanning ? 'animate-pulse' : 'scanner-beam'}`}
            />
          </div>
        </div>

        {/* Success Alert Banner if just completed */}
        {lastScanAlert && (
          <div
            className={`mb-5 p-3.5 border rounded-2xl flex items-center justify-between text-xs animate-fadeIn ${
              lastScanAlert.type === 'income'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : lastScanAlert.type === 'transfer'
                ? 'bg-purple-50 border-purple-300 text-purple-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
              <span>
                <strong>
                  {lastScanAlert.type === 'income'
                    ? '🎉 Ting ting! Đã nạp thành công:'
                    : lastScanAlert.type === 'transfer'
                    ? '🔄 Ting ting! Đã chuyển tiền thành công:'
                    : 'Bíp! Đã quét thành công:'}
                </strong>{' '}
                {lastScanAlert.type === 'transfer' ? '⇄ ' : lastScanAlert.type === 'income' ? '+' : '-'}
                {lastScanAlert.amount.toLocaleString('vi-VN')} đ{' '}
                {lastScanAlert.type === 'transfer'
                  ? `(${lastScanAlert.walletName})`
                  : `${lastScanAlert.type === 'income' ? 'vào ví' : 'từ ví'} ${lastScanAlert.walletName} (~${lastScanAlert.hours}h lao động)`}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setLastScanAlert(null)}
              className="font-bold px-2 hover:opacity-75"
            >
              ✕
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount input & Quick Chips */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-black text-gray-700 tracking-wider">
                {mode === 'income'
                  ? 'SỐ TIỀN THU NHẬP VỀ TÀI KHOẢN (VNĐ) *'
                  : mode === 'transfer'
                  ? 'SỐ TIỀN CHUYỂN QUA LẠI GIỮA CÁC VÍ (VNĐ) *'
                  : 'SỐ TIỀN CHI (VNĐ) *'}
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
                placeholder={
                  mode === 'income'
                    ? 'VD: 10000000'
                    : mode === 'transfer'
                    ? 'VD: 500000'
                    : 'VD: 55000'
                }
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className={`w-full text-2xl sm:text-3xl font-black p-3.5 border-2 rounded-2xl focus:outline-none focus:ring-2 text-gray-800 placeholder-gray-300 tracking-tight transition-all ${
                  mode === 'income'
                    ? 'bg-emerald-50/60 border-emerald-400 focus:ring-emerald-400'
                    : mode === 'transfer'
                    ? 'bg-purple-50/60 border-purple-400 focus:ring-purple-400'
                    : 'bg-amber-50/70 border-amber-300 focus:ring-amber-400'
                }`}
                required
              />
              <span
                className={`absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black ${
                  mode === 'income'
                    ? 'text-emerald-700'
                    : mode === 'transfer'
                    ? 'text-purple-700'
                    : 'text-amber-700'
                }`}
              >
                VNĐ
              </span>
            </div>

            {/* Quick add buttons */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {(mode === 'income'
                ? quickAddsIncome
                : mode === 'transfer'
                ? quickAddsTransfer
                : quickAddsExpense
              ).map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAdd(val)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border transition-colors ${
                    mode === 'income'
                      ? 'bg-emerald-100/70 hover:bg-emerald-200/80 text-emerald-900 border-emerald-200'
                      : mode === 'transfer'
                      ? 'bg-purple-100/70 hover:bg-purple-200/80 text-purple-900 border-purple-200'
                      : 'bg-amber-100/70 hover:bg-amber-200/80 text-amber-900 border-amber-200'
                  }`}
                >
                  +{val >= 1000000 ? `${val / 1000000}Tr` : `${val / 1000}k`}
                </button>
              ))}

              {mode === 'transfer' && currentWallet && currentWallet.balance > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    playSoftPop();
                    setAmountStr(String(currentWallet.balance));
                  }}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-xl border bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border-indigo-200 transition-colors"
                >
                  Toàn bộ số dư ví ({currentWallet.balance.toLocaleString('vi-VN')} đ)
                </button>
              )}
            </div>

            {/* REAL-TIME WORK HOURS CONVERSION BANNER (or Transfer Balance Preview) */}
            {amountNum > 0 && mode !== 'transfer' && (
              <div
                className={`mt-3 p-3 rounded-2xl border text-xs ${
                  mode === 'income'
                    ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border-emerald-200 text-emerald-900'
                    : 'bg-gradient-to-r from-purple-50 via-pink-50 to-amber-50 border-purple-200/80 text-purple-900'
                }`}
              >
                <div className="flex items-center gap-2 font-bold">
                  {mode === 'income' ? (
                    <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-purple-600 shrink-0" />
                  )}
                  <span>
                    {mode === 'income'
                      ? '🎉 Khoản thu này quy đổi bằng: '
                      : 'Món này đổi bằng: '}
                    <span
                      className={`text-base font-black px-2 py-0.5 rounded-lg border bg-white ${
                        mode === 'income'
                          ? 'text-emerald-700 border-emerald-200'
                          : 'text-purple-700 border-purple-200'
                      }`}
                    >
                      {workHours} GIỜ
                    </span>{' '}
                    {mode === 'income' ? 'công sức lao động được đền đáp!' : 'lao động cày cuốc! 💻'}
                  </span>
                </div>
                <div className="text-[11px] opacity-80 mt-1 pl-6">
                  {mode === 'income'
                    ? `(Bạn đã tạo ra giá trị tương đương ~${dayEquivalent} ngày làm việc chuẩn theo mức lương ${hourlyWage.toLocaleString('vi-VN')} đ/giờ)`
                    : `(Tương đương khoảng ${dayEquivalent} ngày làm việc chuẩn 8 tiếng với mức lương ${hourlyWage.toLocaleString('vi-VN')} đ/giờ)`}
                </div>
              </div>
            )}

            {amountNum > 0 && mode === 'transfer' && (
              <div className="mt-3 p-3 rounded-2xl border bg-gradient-to-r from-purple-50 via-indigo-50 to-teal-50 border-purple-200 text-xs text-purple-950 space-y-1.5">
                <div className="flex items-center gap-1.5 font-black text-purple-900">
                  <ArrowLeftRight className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>DÒNG TIỀN CHẠY VÒNG VÒNG (TÚI TRÁI ➔ TÚI PHẢI):</span>
                </div>
                <div className="text-[11px] flex flex-col sm:flex-row sm:items-center justify-between gap-1 bg-white/80 p-2.5 rounded-xl border border-purple-200">
                  <div>
                    📤 <strong>{currentWallet?.name}:</strong>{' '}
                    <span className="text-rose-600 font-bold">-{amountNum.toLocaleString('vi-VN')} đ</span>{' '}
                    (còn {Math.max(0, (currentWallet?.balance || 0) - amountNum).toLocaleString('vi-VN')} đ)
                  </div>
                  <div>
                    📥 <strong>{currentTargetWallet?.name}:</strong>{' '}
                    <span className="text-emerald-600 font-bold">+{amountNum.toLocaleString('vi-VN')} đ</span>{' '}
                    (thành {((currentTargetWallet?.balance || 0) + amountNum).toLocaleString('vi-VN')} đ)
                  </div>
                </div>
                <div className="text-[10px] text-purple-800 font-medium">
                  ✨ <strong>An toàn 100%:</strong> Tổng tài sản không giảm đi 1 đồng nào, tiền chỉ di chuyển từ ví này sang ví kia!
                </div>
              </div>
            )}
          </div>

          {/* WALLET SELECTION - CHUYỂN TIỀN GIỮA 2 VÍ HOẶC CHỌN 1 VÍ */}
          {mode === 'transfer' ? (
            <div className="p-4 bg-purple-50/50 rounded-2xl border-2 border-purple-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-purple-950 flex items-center gap-1.5">
                  <ArrowLeftRight className="w-4 h-4 text-purple-700" />
                  <span>CHỌN 2 VÍ ĐỂ CHUYỂN TIỀN QUA LẠI:</span>
                </label>
                <button
                  type="button"
                  onClick={handleSwapWallets}
                  className="px-2.5 py-1 bg-white hover:bg-purple-100 text-purple-700 border border-purple-300 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all shadow-2xs active:scale-95"
                  title="Đổi chiều ví chuyển và ví nhận"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>Đổi chiều ⇄</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                {/* Source Wallet (Ví Trích - Túi Trái) */}
                <div className="p-3 bg-white rounded-xl border border-rose-200 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-extrabold text-rose-800">
                    <span>📤 VÍ TRÍCH TIỀN (TÚI TRÁI - TRỪ):</span>
                    <span className="text-[10px] text-gray-500">Nguồn tiền</span>
                  </div>
                  <select
                    value={walletId}
                    onChange={(e) => setWalletId(e.target.value)}
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.icon} {w.name}
                      </option>
                    ))}
                  </select>
                  <div className="text-[10px] text-gray-500 flex justify-between">
                    <span>Hiện có: <strong>{currentWallet?.balance.toLocaleString('vi-VN')} đ</strong></span>
                    {amountNum > 0 && (
                      <span className="text-rose-600 font-bold">
                        ➔ {Math.max(0, (currentWallet?.balance || 0) - amountNum).toLocaleString('vi-VN')} đ
                      </span>
                    )}
                  </div>
                </div>

                {/* Target Wallet (Ví Nhận - Túi Phải) */}
                <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-extrabold text-emerald-800">
                    <span>📥 VÍ NHẬN TIỀN (TÚI PHẢI - CỘNG):</span>
                    <span className="text-[10px] text-gray-500">Đích đến</span>
                  </div>
                  <select
                    value={targetWalletId}
                    onChange={(e) => setTargetWalletId(e.target.value)}
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.icon} {w.name}
                      </option>
                    ))}
                  </select>
                  <div className="text-[10px] text-gray-500 flex justify-between">
                    <span>Hiện có: <strong>{currentTargetWallet?.balance.toLocaleString('vi-VN')} đ</strong></span>
                    {amountNum > 0 && (
                      <span className="text-emerald-600 font-bold">
                        ➔ {((currentTargetWallet?.balance || 0) + amountNum).toLocaleString('vi-VN')} đ
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {walletId === targetWalletId && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-700 font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Ví trích tiền và ví nhận tiền đang trùng nhau! Vui lòng chọn 2 ví khác nhau.</span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3.5 bg-gray-50/90 rounded-2xl border border-gray-200">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                  <WalletIcon className="w-3.5 h-3.5 text-purple-600" />
                  <span>
                    {mode === 'income'
                      ? 'NGUỒN TIỀN NHẬN (NẠP VÀO TÀI KHOẢN / VÍ NÀO?) *'
                      : 'NGUỒN TIỀN CHI TRẢ (TRỪ VÀO VÍ NÀO?) *'}
                  </span>
                </label>
              </div>

              <select
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
                className="w-full p-3 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.icon} {w.name} (Số dư hiện tại: {w.balance.toLocaleString('vi-VN')} đ)
                  </option>
                ))}
              </select>

              {/* Projected balance preview badge */}
              {currentWallet && amountNum > 0 && (
                <div className="mt-2 text-[11px] font-semibold text-gray-600 flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border border-gray-200">
                  <span>Số dư {currentWallet.name} dự kiến sau giao dịch:</span>
                  <strong
                    className={`font-black ${
                      mode === 'income' ? 'text-emerald-700' : 'text-gray-900'
                    }`}
                  >
                    {(mode === 'income'
                      ? currentWallet.balance + amountNum
                      : Math.max(0, currentWallet.balance - amountNum)
                    ).toLocaleString('vi-VN')}{' '}
                    đ{' '}
                    <span className="text-[10px] font-normal">
                      ({mode === 'income' ? '+' : '-'}
                      {amountNum.toLocaleString('vi-VN')} đ)
                    </span>
                  </strong>
                </div>
              )}
            </div>
          )}

          {/* TRANSFER CATEGORY PRESETS IF MODE IS TRANSFER */}
          {mode === 'transfer' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-black text-gray-700">
                  MỤC ĐÍCH CHUYỂN TIỀN *
                </label>
                <span className="text-[10px] text-gray-400 font-medium">Bấm chọn nhanh</span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 mb-2">
                {TRANSFER_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectTransferPreset(p)}
                    className={`p-2 rounded-xl text-left text-[11px] font-bold border transition-all truncate ${
                      subCategory === p.name
                        ? 'bg-purple-100/90 text-purple-950 border-purple-400 ring-1 ring-purple-300'
                        : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Hoặc tự gõ mục đích chuyển tiền (VD: Tiết kiệm MB sang Techcom, Rút tiền ATM...)"
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                required
              />
            </div>
          )}

          {/* INCOME CATEGORY PRESETS IF MODE IS INCOME */}
          {mode === 'income' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-black text-gray-700">
                  NGUỒN / HẠNG MỤC THU NHẬP *
                </label>
                <span className="text-[10px] text-gray-400 font-medium">Bấm để chọn nhanh</span>
              </div>

              {/* Preset buttons */}
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                {INCOME_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectIncomePreset(p)}
                    className={`p-2 rounded-xl text-left text-[11px] font-bold border transition-all truncate ${
                      subCategory === p.name
                        ? 'bg-emerald-100/90 text-emerald-900 border-emerald-400 ring-1 ring-emerald-300'
                        : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Hoặc tự gõ tên nguồn thu (VD: Tiền thưởng Tết, Khách hàng A...)"
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300"
                required
              />
            </div>
          )}

          {/* Jars & Subcategory IF MODE IS EXPENSE */}
          {mode === 'expense' && (
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
          )}

          {/* Jars allocation optional for income or transfer */}
          {(mode === 'income' || mode === 'transfer') && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                {mode === 'transfer'
                  ? 'GẮN VỚI HŨ MỤC TIÊU (MẶC ĐỊNH LTSS - TIẾT KIỆM DÀI HẠN):'
                  : 'LIÊN KẾT PHÂN BỔ VÀO HŨ NGÂN SÁCH (TÙY CHỌN):'}
              </label>
              <select
                value={jarId}
                onChange={(e) => setJarId(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-300"
              >
                {jars.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.icon} {j.name} ({j.description})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              NGÀY GHI NHẬN GIAO DỊCH
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
          </div>

          {/* Mood Tracker */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              {mode === 'income'
                ? 'CẢM XÚC CỦA BẠN KHI NHẬN KHOẢN TIỀN NÀY? 💖'
                : mode === 'transfer'
                ? 'CẢM XÚC CỦA BẠN KHI ĐIỀU CHUYỂN DÒNG TIỀN NÀY? 🛡️'
                : 'CẢM XÚC CỦA BẠN VỀ KHOẢN CHI NÀY? 💖'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(mode === 'income'
                ? INCOME_MOODS
                : mode === 'transfer'
                ? TRANSFER_MOODS
                : MOODS
              ).map((m) => {
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
                        ? `${m.color || 'bg-purple-100 text-purple-950 border-purple-400'} scale-102 shadow-xs font-black ring-2 ring-purple-300`
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
              placeholder={
                mode === 'income'
                  ? 'VD: Công ty chuyển lương đợt 1, Khách thanh toán dự án thiết kế...'
                  : mode === 'transfer'
                  ? 'VD: Chuyển tiền từ MB Bank sang Techcombank để tiết kiệm mỗi tháng 500k...'
                  : 'VD: Đi siêu thị mua rau quả tươi, Ăn mừng đỗ kỳ thi...'
              }
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={isScanning}
            className={`w-full py-4 text-white font-black rounded-2xl text-base shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer ${
              mode === 'income'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-200'
                : mode === 'transfer'
                ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-teal-600 hover:opacity-95 shadow-purple-200'
                : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200'
            }`}
          >
            {mode === 'income' ? (
              <>
                <Coins className="w-5 h-5" />
                <span>
                  {isScanning
                    ? 'ĐANG NẠP TIỀN VÀO TÀI KHOẢN...'
                    : 'TING TING! NẠP TIỀN VÀO VÍ NGAY 💰✨'}
                </span>
              </>
            ) : mode === 'transfer' ? (
              <>
                <ArrowLeftRight className="w-5 h-5" />
                <span>
                  {isScanning
                    ? 'ĐANG CHUYỂN TIỀN QUA LẠI GIỮA CÁC VÍ...'
                    : 'XÁC NHẬN CHUYỂN KHOẢN QUA LẠI AN TOÀN 🔄✨'}
                </span>
              </>
            ) : (
              <>
                <ScanBarcode className="w-5 h-5" />
                <span>
                  {isScanning
                    ? 'ĐANG QUÉT MÃ...'
                    : 'BÍP! QUÉT MÃ THANH TOÁN NGAY 🛒'}
                </span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
