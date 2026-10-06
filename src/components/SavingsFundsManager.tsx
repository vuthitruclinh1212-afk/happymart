import React, { useState } from 'react';
import { SavingsFund, Wallet } from '../types';
import {
  Shield,
  Plus,
  Sparkles,
  Edit2,
  Trash2,
  CheckCircle2,
  Coins,
  Clock,
  Calendar,
  X,
  TrendingUp,
  PiggyBank,
  ArrowRight,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { playCashRegister, playSoftPop, playFanfare } from '../utils/audio';
import { triggerConfetti } from '../utils/confetti';

interface SavingsFundsManagerProps {
  savingsFunds: SavingsFund[];
  wallets: Wallet[];
  hourlyWage: number;
  onAddSavingsFund: (fund: Omit<SavingsFund, 'id' | 'createdAt'>) => void;
  onUpdateSavingsFund: (fund: SavingsFund) => void;
  onDeleteSavingsFund: (id: string) => void;
  onDepositSavingsFund: (fundId: string, amount: number) => void;
}

const POPULAR_ICONS = ['📱', '🛡️', '💻', '🛵', '✈️', '🏠', '💍', '🏖️', '🎒', '🚗', '✨'];

export const SavingsFundsManager: React.FC<SavingsFundsManagerProps> = ({
  savingsFunds,
  wallets,
  hourlyWage,
  onAddSavingsFund,
  onUpdateSavingsFund,
  onDeleteSavingsFund,
  onDepositSavingsFund,
}) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingFund, setEditingFund] = useState<SavingsFund | null>(null);

  // Form state
  const [name, setName] = useState<string>('');
  const [icon, setIcon] = useState<string>('📱');
  const [targetAmountStr, setTargetAmountStr] = useState<string>('18000000');
  const [targetMonthsStr, setTargetMonthsStr] = useState<string>('6');
  const [currentSavedStr, setCurrentSavedStr] = useState<string>('0');
  const [walletId, setWalletId] = useState<string>(wallets[0]?.id || 'bank');
  const [note, setNote] = useState<string>('');

  // Quick Deposit modal state
  const [depositFund, setDepositFund] = useState<SavingsFund | null>(null);
  const [depositAmountStr, setDepositAmountStr] = useState<string>('1000000');
  const [formError, setFormError] = useState<string | null>(null);
  const [depositError, setDepositError] = useState<string | null>(null);
  const [showFaqGuide, setShowFaqGuide] = useState<boolean>(true);

  // Real-time automatic calculation
  const targetAmountNum = Math.max(0, Number(targetAmountStr) || 0);
  const targetMonthsNum = Math.max(1, Number(targetMonthsStr) || 1);
  const calculatedMonthly = Math.ceil(targetAmountNum / targetMonthsNum);
  const monthlyWorkHours = Number((calculatedMonthly / (hourlyWage || 1)).toFixed(1));

  // Overall totals
  const totalMonthlySavings = savingsFunds
    .filter((f) => !f.isCompleted)
    .reduce((sum, f) => sum + f.monthlyAmount, 0);

  const totalCurrentSaved = savingsFunds.reduce((sum, f) => sum + f.currentSaved, 0);
  const totalTargetGoal = savingsFunds.reduce((sum, f) => sum + f.targetAmount, 0);
  const overallProgressPct =
    totalTargetGoal > 0 ? Math.min(100, Math.round((totalCurrentSaved / totalTargetGoal) * 100)) : 0;
  const totalWorkHoursMonthly = (totalMonthlySavings / (hourlyWage || 1)).toFixed(1);

  // Wallet separation calculations
  const totalWalletBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
  const totalAvailableToSpend = Math.max(0, totalWalletBalance - totalCurrentSaved);

  const handleOpenAdd = () => {
    playSoftPop();
    setEditingFund(null);
    setName('');
    setIcon('📱');
    setTargetAmountStr('20000000');
    setTargetMonthsStr('6');
    setCurrentSavedStr('0');
    setWalletId(wallets[0]?.id || 'bank');
    setNote('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (fund: SavingsFund) => {
    playSoftPop();
    setEditingFund(fund);
    setName(fund.name);
    setIcon(fund.icon || '📱');
    setTargetAmountStr(String(fund.targetAmount));
    setTargetMonthsStr(String(fund.targetMonths));
    setCurrentSavedStr(String(fund.currentSaved));
    setWalletId(fund.walletId || wallets[0]?.id || 'bank');
    setNote(fund.note || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Vui lòng nhập tên quỹ tiết kiệm mục tiêu!');
      return;
    }
    if (targetAmountNum <= 0) {
      setFormError('Vui lòng nhập giá trị mục tiêu lớn hơn 0!');
      return;
    }

    const currentSavedNum = Math.max(0, Number(currentSavedStr) || 0);

    if (editingFund) {
      onUpdateSavingsFund({
        ...editingFund,
        name: name.trim(),
        icon,
        targetAmount: targetAmountNum,
        targetMonths: targetMonthsNum,
        monthlyAmount: calculatedMonthly,
        currentSaved: currentSavedNum,
        walletId,
        note: note.trim(),
        isCompleted: currentSavedNum >= targetAmountNum,
      });
      playCashRegister();
    } else {
      onAddSavingsFund({
        name: name.trim(),
        icon,
        targetAmount: targetAmountNum,
        targetMonths: targetMonthsNum,
        monthlyAmount: calculatedMonthly,
        currentSaved: currentSavedNum,
        walletId,
        note: note.trim(),
        isCompleted: currentSavedNum >= targetAmountNum,
      });
      playFanfare();
      triggerConfetti();
    }

    setFormError(null);
    setIsModalOpen(false);
  };

  const handleConfirmDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositFund) return;
    const depVal = Number(depositAmountStr);
    if (!depVal || depVal <= 0) {
      setDepositError('Vui lòng nhập số tiền tích lũy hợp lệ!');
      return;
    }
    onDepositSavingsFund(depositFund.id, depVal);
    playCashRegister();
    triggerConfetti();
    setDepositError(null);
    setDepositFund(null);
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 via-indigo-50/60 to-pink-50 p-5 sm:p-6 rounded-3xl border-2 border-purple-200/90 shadow-sm space-y-5 animate-fadeIn">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center text-2xl shadow-md shrink-0">
            🛡️
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-purple-950 tracking-tight">
                CÁC QUỸ TIẾT KIỆM MỤC TIÊU (TỰ ĐỘNG TRÍCH HÀNG THÁNG)
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-purple-200/80 text-purple-900 text-[10px] font-black uppercase tracking-wider">
                Mặc định hàng tháng
              </span>
            </div>
            <p className="text-xs text-purple-800/80 font-medium mt-0.5">
              Mỗi mục nhỏ (như mua điện thoại, quỹ khẩn cấp) được chia thành quỹ riêng với thời gian cụ thể. Hệ thống tự động tính số tiền cần trích mỗi tháng và mặc định tính vào chi tiêu định kỳ mà không cần nhập thủ công!
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="self-start sm:self-auto px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black rounded-2xl text-xs flex items-center gap-1.5 shadow-md shadow-purple-200 transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Mục Tiết Kiệm Mới ✨</span>
        </button>
      </div>

      {/* Auto-Deduction & Overall Status Metric Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Metric 1: Monthly Auto-Deduction */}
        <div className="bg-white/95 backdrop-blur-xs p-4 rounded-2xl border border-purple-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-purple-700 font-bold mb-1">
            <span>TỰ ĐỘNG TRÍCH MỖI THÁNG 📅</span>
            <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md font-bold">
              Không cần quét mã
            </span>
          </div>
          <div className="text-2xl font-black text-purple-900 tracking-tight">
            {totalMonthlySavings.toLocaleString('vi-VN')}{' '}
            <span className="text-sm font-semibold text-purple-700">đ/tháng</span>
          </div>
          <div className="text-[11px] text-gray-500 font-medium mt-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-purple-500" />
            <span>Tương đương ~{totalWorkHoursMonthly} giờ làm việc mỗi tháng</span>
          </div>
        </div>

        {/* Metric 2: Total Accumulated Savings */}
        <div className="bg-white/95 backdrop-blur-xs p-4 rounded-2xl border border-indigo-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-indigo-700 font-bold mb-1">
            <span>TỔNG ĐÃ TÍCH LŨY HIỆN TẠI 💰</span>
            <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md font-bold">
              {overallProgressPct}%
            </span>
          </div>
          <div className="text-2xl font-black text-indigo-900 tracking-tight">
            {totalCurrentSaved.toLocaleString('vi-VN')}{' '}
            <span className="text-sm font-normal text-gray-400">
              / {totalTargetGoal.toLocaleString('vi-VN')} đ
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mt-1.5 border border-indigo-100">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all duration-500"
              style={{ width: `${overallProgressPct}%` }}
            />
          </div>
        </div>

        {/* Metric 3: Number of Active Funds */}
        <div className="bg-white/95 backdrop-blur-xs p-4 rounded-2xl border border-pink-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-pink-700 font-bold mb-1">
            <span>SỐ MỤC TIẾT KIỆM ĐANG CHẠY 🎯</span>
            <Sparkles className="w-4 h-4 text-pink-500" />
          </div>
          <div className="text-2xl font-black text-pink-900 tracking-tight">
            {savingsFunds.length}{' '}
            <span className="text-sm font-semibold text-pink-700">quỹ riêng biệt</span>
          </div>
          <div className="text-[11px] text-gray-500 font-medium mt-1">
            {savingsFunds.filter((f) => f.isCompleted).length} quỹ đã hoàn thành mục tiêu 🎉
          </div>
        </div>
      </div>

      {/* Financial Transparency FAQ & Ring-fencing Visualizer */}
      <div className="bg-white/95 backdrop-blur-xs rounded-3xl border-2 border-purple-200 shadow-sm p-4 sm:p-5 space-y-3.5">
        <div
          onClick={() => {
            playSoftPop();
            setShowFaqGuide(!showFaqGuide);
          }}
          className="flex items-center justify-between cursor-pointer select-none group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
              💡
            </div>
            <div>
              <h4 className="font-black text-xs sm:text-sm text-purple-950 group-hover:text-purple-700 transition-colors flex items-center gap-1.5">
                MINH BẠCH TÀI CHÍNH: TIỀN TIẾT KIỆM CÓ PHẢI LÀ KHOẢN CHI & CÁCH PHÂN BIỆT THÁNG SAU
              </h4>
              <p className="text-[11px] text-gray-500 font-medium">
                Cơ chế tách số dư (Ring-fencing) giúp bạn vừa đạt mục tiêu vừa thoải mái chi tiêu an toàn
              </p>
            </div>
          </div>
          <button
            type="button"
            className="p-1.5 text-gray-400 group-hover:text-purple-600 rounded-xl hover:bg-purple-50 transition-colors"
          >
            {showFaqGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showFaqGuide && (
          <div className="pt-2 border-t border-purple-100 space-y-3.5 text-xs animate-fadeIn">
            {/* 3 Core Questions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Question 1 */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-pink-50/90 via-purple-50/50 to-white border border-pink-200/80 space-y-1.5">
                <span className="font-black text-pink-900 block text-xs flex items-center gap-1.5">
                  ❓ Quỹ tiết kiệm có phải là 1 khoản chi không?
                </span>
                <p className="text-[11px] text-gray-700 leading-relaxed font-medium">
                  <strong>KHÔNG PHẢI chi tiêu tiêu hao (Expense)!</strong> Mua sắm hay ăn uống là tiền <em>mất đi vĩnh viễn</em>. Còn tiền quỹ tiết kiệm (mua điện thoại, quỹ khẩn cấp) <strong>VẪN LÀ 100% TÀI SẢN CỦA BẠN</strong>, chỉ là chuyển trạng thái từ <em>"tiền tiêu tự do"</em> sang <em>"tiền đã khóa dự trữ (Ring-fencing)"</em> để bảo vệ mục tiêu.
                </p>
              </div>

              {/* Question 2 */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-50/90 via-indigo-50/50 to-white border border-purple-200/80 space-y-1.5">
                <span className="font-black text-purple-900 block text-xs flex items-center gap-1.5">
                  🏦 Trong tài khoản có hiện số tiền này không?
                </span>
                <p className="text-[11px] text-gray-700 leading-relaxed font-medium">
                  <strong>CÓ HIỆN NGUYÊN VẸN 100%!</strong> Toàn bộ số tiền tích lũy vẫn nằm trong tổng số dư các ví tiền / tài khoản ngân hàng của bạn. Hệ thống không hề trừ tiền hay làm biến mất tài sản của bạn.
                </p>
              </div>

              {/* Question 3 */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-teal-50/90 via-emerald-50/50 to-white border border-teal-200/80 space-y-1.5">
                <span className="font-black text-teal-950 block text-xs flex items-center gap-1.5">
                  📅 Tháng sau làm sao biết phần nào được tiêu, phần nào tiết kiệm?
                </span>
                <p className="text-[11px] text-gray-700 leading-relaxed font-medium">
                  Hệ thống tự động tách số dư làm 2 phần: <strong className="text-purple-800">🛡️ Tiền Khóa Tiết Kiệm</strong> (hệ thống giữ riêng, không cho quẹt lẹm) và <strong className="text-teal-800">🟢 Tiền Khả Dụng</strong> (số tiền bạn được phép tự do quẹt thẻ trong tháng sau).
                </p>
              </div>
            </div>

            {/* Interactive Tri-Balance Real-time Status Bar */}
            <div className="p-3.5 bg-gradient-to-r from-purple-100/90 via-pink-100/60 to-emerald-100/80 rounded-2xl border border-purple-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚖️</span>
                <div>
                  <span className="font-extrabold text-purple-950 block">
                    ĐỐI SOÁT TÀI SẢN THỜI GIAN THỰC CỦA BẠN:
                  </span>
                  <span className="text-[11px] text-gray-600">
                    Tổng số dư ví ({totalWalletBalance.toLocaleString('vi-VN')} đ) = Đang khóa tiết kiệm ({totalCurrentSaved.toLocaleString('vi-VN')} đ) + Khả dụng được tiêu ({totalAvailableToSpend.toLocaleString('vi-VN')} đ)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="px-3 py-1.5 bg-white rounded-xl border border-purple-200 text-center shadow-2xs">
                  <span className="text-[10px] text-purple-700 font-bold block">ĐANG KHÓA TIẾT KIỆM</span>
                  <strong className="text-xs font-black text-purple-900">{totalCurrentSaved.toLocaleString('vi-VN')} đ</strong>
                </div>
                <span className="text-gray-400 font-bold">+</span>
                <div className="px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-center shadow-2xs">
                  <span className="text-[10px] text-emerald-100 font-bold block">KHẢ DỤNG ĐỂ TIÊU</span>
                  <strong className="text-xs font-black text-white">{totalAvailableToSpend.toLocaleString('vi-VN')} đ</strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Grid of Dedicated Savings Funds */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {savingsFunds.map((fund) => {
          const progress =
            fund.targetAmount > 0
              ? Math.min(100, Math.round((fund.currentSaved / fund.targetAmount) * 100))
              : 0;
          const remainingAmount = Math.max(0, fund.targetAmount - fund.currentSaved);
          const remainingMonths =
            fund.monthlyAmount > 0 ? Math.ceil(remainingAmount / fund.monthlyAmount) : 0;
          const fundHours = (fund.monthlyAmount / (hourlyWage || 1)).toFixed(1);
          const targetWallet = wallets.find((w) => w.id === fund.walletId);

          return (
            <div
              key={fund.id}
              className={`p-4 sm:p-5 rounded-2xl border-2 transition-all bg-white relative overflow-hidden group shadow-2xs ${
                fund.isCompleted
                  ? 'border-emerald-300 ring-2 ring-emerald-100 bg-emerald-50/20'
                  : 'border-purple-200 hover:border-purple-300 hover:shadow-xs'
              }`}
            >
              {/* Header of Fund Card */}
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-purple-100/80 border border-purple-200 flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition-transform">
                    {fund.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-black text-sm sm:text-base text-gray-900 truncate">
                        {fund.name}
                      </h4>
                      {fund.isCompleted && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Đã đủ tiền 🎉
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500 font-semibold flex items-center gap-2 mt-0.5">
                      <span>Thời gian: <strong className="text-purple-900">{fund.targetMonths} tháng</strong></span>
                      <span>·</span>
                      <span>Nơi giữ: {targetWallet?.icon} {targetWallet?.name || 'Ngân hàng'}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(fund)}
                    className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-colors"
                    title="Chỉnh sửa quỹ này"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Xác nhận xóa quỹ tiết kiệm "${fund.name}"?`)) {
                        onDeleteSavingsFund(fund.id);
                        playSoftPop();
                      }
                    }}
                    className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    title="Xóa quỹ"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Automatic Monthly Allocation Highlight Badge */}
              <div className="bg-purple-50/90 border border-purple-200 rounded-xl p-2.5 my-2 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] font-bold text-purple-600 block uppercase">
                    Mỗi tháng tự động trích:
                  </span>
                  <div className="font-black text-purple-950 text-sm sm:text-base tracking-tight">
                    {fund.monthlyAmount.toLocaleString('vi-VN')}{' '}
                    <span className="text-xs font-normal text-purple-700">đ / tháng</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-purple-600 font-medium block">
                    Quy đổi công sức:
                  </span>
                  <span className="font-extrabold text-purple-900 text-xs">
                    ⏱️ ~{fundHours} giờ làm việc
                  </span>
                </div>
              </div>

              {/* Progress Bar & Current Status */}
              <div className="space-y-1.5 mt-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-700">
                    Đã có: <strong className="text-purple-950 font-black">{fund.currentSaved.toLocaleString('vi-VN')} đ</strong>
                  </span>
                  <span className="text-gray-500 font-medium">
                    Mục tiêu: <strong className="text-gray-800">{fund.targetAmount.toLocaleString('vi-VN')} đ</strong> ({progress}%)
                  </span>
                </div>

                <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden p-0.5 border border-purple-100">
                  <div
                    className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${
                      fund.isCompleted
                        ? 'from-emerald-500 to-teal-500'
                        : 'from-purple-500 via-indigo-500 to-pink-500'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-[11px] text-gray-500 pt-0.5">
                  <span>
                    {fund.isCompleted ? (
                      <span className="text-emerald-700 font-bold">✨ Mục tiêu đã sẵn sàng để mua sắm!</span>
                    ) : (
                      <span>
                        Còn thiếu: <strong className="text-rose-600">{remainingAmount.toLocaleString('vi-VN')} đ</strong> (~{remainingMonths} tháng)
                      </span>
                    )}
                  </span>

                  {/* Quick deposit button */}
                  <button
                    type="button"
                    onClick={() => {
                      playSoftPop();
                      setDepositFund(fund);
                      setDepositAmountStr(String(fund.monthlyAmount));
                    }}
                    className="text-xs font-extrabold text-purple-700 hover:text-purple-950 flex items-center gap-1 hover:underline"
                  >
                    <Coins className="w-3.5 h-3.5 text-purple-600" />
                    <span>Nạp thêm 💰</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Thêm / Sửa Quỹ Tiết Kiệm (Với Bộ Tự Động Tính Toán Real-time) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border-2 border-purple-200 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{icon}</span>
                <h3 className="text-base sm:text-lg font-black text-gray-900">
                  {editingFund ? 'Chỉnh Sửa Quỹ Tiết Kiệm' : 'Thiết Lập Quỹ Tiết Kiệm Mới ✨'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold">
                  ⚠️ {formError}
                </div>
              )}

              {/* Fund Name */}
              <div>
                <label className="block font-black text-gray-700 mb-1">
                  TÊN QUỸ TIẾT KIỆM (MỤC NHỎ) *
                </label>
                <input
                  type="text"
                  placeholder="VD: Mua điện thoại iPhone 16, Quỹ khẩn cấp 6 tháng, Mua laptop..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                  required
                />
              </div>

              {/* Icon Picker */}
              <div>
                <label className="block font-bold text-gray-600 mb-1">
                  BIỂU TƯỢNG (ICON):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_ICONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setIcon(ic)}
                      className={`text-xl p-2 rounded-xl border transition-all ${
                        icon === ic
                          ? 'bg-purple-100 border-purple-400 scale-110 shadow-2xs'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Price (Giá của mục tiêu) & Duration (Số tháng) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-black text-gray-700 mb-1">
                    GIÁ CỦA MÓN ĐỒ / MỤC TIÊU (VNĐ) *
                  </label>
                  <input
                    type="number"
                    placeholder="VD: 18000000"
                    value={targetAmountStr}
                    onChange={(e) => setTargetAmountStr(e.target.value)}
                    className="w-full p-3 bg-purple-50/60 border border-purple-300 rounded-xl text-sm font-black text-purple-950 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                    required
                  />
                  <span className="text-[10px] text-gray-400 block mt-0.5">
                    {targetAmountNum.toLocaleString('vi-VN')} đ
                  </span>
                </div>

                <div>
                  <label className="block font-black text-gray-700 mb-1">
                    THỜI GIAN TIẾT KIỆM (SỐ THÁNG) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    placeholder="VD: 6 (tháng)"
                    value={targetMonthsStr}
                    onChange={(e) => setTargetMonthsStr(e.target.value)}
                    className="w-full p-3 bg-purple-50/60 border border-purple-300 rounded-xl text-sm font-black text-purple-950 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                    required
                  />
                  <span className="text-[10px] text-gray-400 block mt-0.5">
                    Ví dụ: 6 tháng, 12 tháng...
                  </span>
                </div>
              </div>

              {/* BỘ TỰ ĐỘNG TÍNH TOÁN REAL-TIME (TÍNH THEO ĐÚNG ĐỀ BÀI) */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-100/90 via-indigo-100/80 to-pink-100/70 border-2 border-purple-300 text-purple-950 space-y-2">
                <div className="flex items-center gap-2 font-black text-xs text-purple-900">
                  <Sparkles className="w-4 h-4 text-purple-600 animate-spin" />
                  <span>HỆ THỐNG TỰ ĐỘNG TÍNH TOÁN HÀNG THÁNG:</span>
                </div>

                <div className="bg-white/90 p-3 rounded-xl border border-purple-200 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-gray-600 block">
                      Mỗi tháng bạn cần trích:
                    </span>
                    <strong className="text-lg font-black text-purple-700 tabular-nums">
                      {calculatedMonthly.toLocaleString('vi-VN')} đ / tháng
                    </strong>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-gray-500 block">Quy đổi thời gian làm:</span>
                    <strong className="text-xs font-bold text-gray-800">
                      ⏱️ ~{monthlyWorkHours} giờ/tháng
                    </strong>
                  </div>
                </div>

                <div className="text-[11px] text-purple-900/90 font-medium leading-relaxed">
                  💡 <strong>Công thức:</strong> {targetAmountNum.toLocaleString('vi-VN')} đ ÷ {targetMonthsNum} tháng = <strong>{calculatedMonthly.toLocaleString('vi-VN')} đ/tháng</strong>. Mặc định khoản này sẽ tự động trừ vào ngân sách định kỳ để tích lũy, <strong>không cần phải ghi nhận thủ công</strong> từng tháng!
                </div>
              </div>

              {/* Current saved & Wallet destination */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-600 mb-1">
                    ĐÃ TÍCH LŨY SẴN HIỆN CÓ (NẾU CÓ):
                  </label>
                  <input
                    type="number"
                    value={currentSavedStr}
                    onChange={(e) => setCurrentSavedStr(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-bold text-gray-800 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-600 mb-1">
                    NƠI CẤT GIỮ TIỀN (VÍ):
                  </label>
                  <select
                    value={walletId}
                    onChange={(e) => setWalletId(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-bold text-gray-800 focus:bg-white"
                  >
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.icon} {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block font-bold text-gray-600 mb-1">GHI CHÚ / KẾ HOẠCH:</label>
                <input
                  type="text"
                  placeholder="VD: Trích lương ngày mùng 5 hàng tháng chuyển vào tài khoản tiết kiệm..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-medium text-gray-800 focus:bg-white"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white font-black rounded-xl shadow-md transition-all active:scale-95"
                >
                  {editingFund ? 'Cập Nhật Quỹ' : 'Lưu & Kích Hoạt Tự Động ✨'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Deposit Modal */}
      {depositFund && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-purple-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{depositFund.icon}</span>
                <h4 className="font-black text-sm text-gray-900">
                  Nạp Thêm Tiền Vào Quỹ
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setDepositFund(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Nạp thêm tiền tích lũy cho mục <strong>{depositFund.name}</strong> (Mục tiêu: {depositFund.targetAmount.toLocaleString('vi-VN')} đ).
            </p>

            <form onSubmit={handleConfirmDeposit} className="space-y-3 text-xs">
              {depositError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold">
                  ⚠️ {depositError}
                </div>
              )}
              <div>
                <label className="block font-bold text-gray-700 mb-1">SỐ TIỀN MUỐN NẠP THÊM (VNĐ):</label>
                <input
                  type="number"
                  value={depositAmountStr}
                  onChange={(e) => setDepositAmountStr(e.target.value)}
                  className="w-full p-2.5 bg-purple-50/70 border border-purple-300 rounded-xl font-black text-purple-950 text-base"
                  required
                />
              </div>

              <div className="flex flex-wrap gap-1">
                {[500000, 1000000, 2000000, 3000000, 5000000].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setDepositAmountStr(String(v))}
                    className="px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold rounded-lg text-[10px]"
                  >
                    +{v >= 1000000 ? `${v / 1000000}Tr` : `${v / 1000}k`}
                  </button>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setDepositFund(null)}
                  className="px-3 py-1.5 text-gray-600 font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-600 text-white font-black rounded-xl hover:bg-purple-700"
                >
                  Xác Nhận Nạp 💰
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
