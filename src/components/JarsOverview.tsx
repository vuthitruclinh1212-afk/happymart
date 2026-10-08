import React, { useState, useMemo } from 'react';
import { Jar, Wallet, Transaction, SavingsFund } from '../types';
import { SavingsFundsManager } from './SavingsFundsManager';
import { getLocalDateString, normalizeDateString } from '../utils/storage';
import {
  Plus,
  Edit2,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ArrowLeftRight,
  BarChart3,
  Clock,
  ShoppingCart,
  Bell,
  BellRing,
  ShieldAlert,
  Sparkles,
  Shield,
} from 'lucide-react';
import { playSoftPop, playCashRegister } from '../utils/audio';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface JarsOverviewProps {
  jars: Jar[];
  wallets: Wallet[];
  transactions: Transaction[];
  savingsFunds?: SavingsFund[];
  rolloverSavings: number;
  setRolloverSavings: (val: number) => void;
  hourlyWage: number;
  onSelectSubcategoryForScan: (jarId: string, subCategory: string) => void;
  onNavigateToIncome?: (walletId?: string) => void;
  onNavigateToTransfer?: (sourceWalletId?: string, targetWalletId?: string) => void;
  onUpdateJarLimit: (jarId: string, newLimit: number) => void;
  onAddSubCategory: (jarId: string, subName: string) => void;
  onAddSavingsFund?: (fund: Omit<SavingsFund, 'id' | 'createdAt'>, initialTransferAmount?: number) => void;
  onUpdateSavingsFund?: (fund: SavingsFund) => void;
  onDeleteSavingsFund?: (id: string) => void;
  onDepositSavingsFund?: (fundId: string, amount: number, sourceWalletId?: string, targetWalletId?: string) => void;
  onRelocateSavingsFundWallet?: (fundId: string, fromWalletId: string, toWalletId: string, amountToMove: number) => void;
}

export const JarsOverview: React.FC<JarsOverviewProps> = ({
  jars,
  wallets,
  transactions,
  savingsFunds = [],
  rolloverSavings,
  setRolloverSavings,
  hourlyWage,
  onSelectSubcategoryForScan,
  onNavigateToIncome,
  onNavigateToTransfer,
  onUpdateJarLimit,
  onAddSubCategory,
  onAddSavingsFund,
  onUpdateSavingsFund,
  onDeleteSavingsFund,
  onDepositSavingsFund,
  onRelocateSavingsFundWallet,
}) => {
  const [editingJarId, setEditingJarId] = useState<string | null>(null);
  const [newLimitInput, setNewLimitInput] = useState<string>('');
  const [newSubInput, setNewSubInput] = useState<string>('');
  const [showRolloverEdit, setShowRolloverEdit] = useState<boolean>(false);
  const [tempRollover, setTempRollover] = useState<string>(String(rolloverSavings));

  // Push notification state
  const [pushPermission, setPushPermission] = useState<string>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });
  const [pushNoticeSent, setPushNoticeSent] = useState<boolean>(false);

  // Chart configuration state
  const [chartTimeRange, setChartTimeRange] = useState<'7d' | '14d' | '30d'>('7d');
  const [chartMode, setChartMode] = useState<'daily' | 'cumulative'>('daily');
  const [chartMetric, setChartMetric] = useState<'both' | 'expense' | 'income'>('both');

  // Total monthly auto-deduction from savings funds (MẶC ĐỊNH CHI ĐỂ TIẾT KIỆM)
  const totalMonthlySavings = useMemo(() => {
    return (savingsFunds || [])
      .filter((f) => !f.isCompleted)
      .reduce((sum, f) => sum + f.monthlyAmount, 0);
  }, [savingsFunds]);

  // Calculate spent per jar (Chỉ tính giao dịch chi tiêu thực tế, loại trừ thu nhập và chuyển ví)
  const jarSpentMap: Record<string, number> = {};
  jars.forEach((j) => (jarSpentMap[j.id] = 0));
  transactions.forEach((t) => {
    if (t.type !== 'income' && t.type !== 'transfer' && jarSpentMap[t.jarId] !== undefined) {
      jarSpentMap[t.jarId] += Number(t.amount);
    }
  });

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  // Chi tiêu tiêu hao thực tế (tiền đã thực sự rời khỏi túi cho các giao dịch quét mã/chi tiêu, không tính chuyển ví)
  const actualExpenses = useMemo(() => {
    return transactions
      .filter((t) => t.type !== 'income' && t.type !== 'transfer')
      .reduce((sum, t) => sum + Number(t.amount), 0);
  }, [transactions]);

  // Tổng số tiền hiện đang tích lũy trong các quỹ tiết kiệm con (vẫn là tài sản của bạn, được khóa lại)
  const totalSavedInFunds = useMemo(() => {
    return (savingsFunds || []).reduce((sum, f) => sum + f.currentSaved, 0);
  }, [savingsFunds]);

  // Danh sách các hũ chi tiêu (Loại bỏ LTSS ra khỏi danh sách hũ chi vì đã quản lý độc lập tại CÁC QUỸ TIẾT KIỆM MỤC TIÊU DÀI HẠN)
  const spendingJars = useMemo(() => jars.filter((j) => j.id !== 'ltss'), [jars]);
  const totalBudget = useMemo(() => spendingJars.reduce((sum, j) => sum + j.limit, 0), [spendingJars]);
  const totalSpent = useMemo(
    () => spendingJars.reduce((sum, j) => sum + (jarSpentMap[j.id] || 0), 0),
    [spendingJars, jarSpentMap]
  );
  const totalWalletBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
  
  // Tiền khả dụng để chi tiêu tự do = Tổng số dư trong các ví - Số tiền đang khóa trong quỹ tiết kiệm
  const totalAvailableToSpend = Math.max(0, totalWalletBalance - totalSavedInFunds);

  // Phân bổ quỹ tiết kiệm theo từng ví cụ thể
  const walletFundAllocations = useMemo(() => {
    const map: Record<string, { totalSaved: number; funds: SavingsFund[] }> = {};
    wallets.forEach((w) => {
      map[w.id] = { totalSaved: 0, funds: [] };
    });

    (savingsFunds || []).forEach((f) => {
      const targetId = f.walletId && map[f.walletId] ? f.walletId : wallets[0]?.id;
      if (targetId && map[targetId]) {
        map[targetId].totalSaved += f.currentSaved;
        map[targetId].funds.push(f);
      }
    });

    return map;
  }, [wallets, savingsFunds]);

  const totalWorkHoursUsed = (totalSpent / (hourlyWage || 1)).toFixed(1);
  const overallSpentPercent = totalBudget > 0 ? Math.min(Math.round((totalSpent / totalBudget) * 100), 100) : 0;

  // Process jars with 90% threshold warning detection (chỉ các hũ chi tiêu thông thường)
  const jarsWithStatus = useMemo(() => {
    return jars.map((jar) => {
      const spent = jarSpentMap[jar.id] || 0;
      const remaining = jar.limit - spent;
      const ratio = jar.limit > 0 ? spent / jar.limit : 0;
      const pct = Math.round(ratio * 100);
      const isExceeded = spent > jar.limit;
      const isWarning = ratio >= 0.9 && !isExceeded; // Between 90% and 100%
      return {
        ...jar,
        spent,
        remaining,
        ratio,
        pct,
        isWarning,
        isExceeded,
      };
    });
  }, [jars, jarSpentMap]);

  // Jars that breached 90% or 100% (loại bỏ LTSS khỏi cảnh báo vượt hạn mức chi tiêu)
  const alertedJars = useMemo(() => {
    return jarsWithStatus
      .filter((j) => j.id !== 'ltss')
      .filter((j) => j.isWarning || j.isExceeded);
  }, [jarsWithStatus]);

  // Request or toggle Web Push Notification
  const handleTogglePushNotifications = async () => {
    playSoftPop();
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setPushPermission(perm);
        if (perm === 'granted') {
          playCashRegister();
          new Notification('Happy Mart Fin 🛒✨', {
            body: alertedJars.length > 0
              ? `Cảnh báo: Hiện có ${alertedJars.length} hũ đã vượt 90% hạn mức (${alertedJars.map((j) => j.name).join(', ')})!`
              : 'Đã kích hoạt thông báo đẩy thành công! Bạn sẽ nhận được thông báo ngay khi có hũ vượt 90% hạn mức.',
          });
          setPushNoticeSent(true);
          setTimeout(() => setPushNoticeSent(false), 6000);
        }
      } catch (err) {
        console.error('Error requesting notification permission:', err);
      }
    } else {
      alert('Trình duyệt hiện tại chưa hỗ trợ Web Notification API, tuy nhiên hệ thống vẫn luôn hiển thị bảng cảnh báo trực quan chi tiết trên giao diện!');
    }
  };

  // Real-time Spending & Income AreaChart Data computed directly from transactions
  const daysCount = chartTimeRange === '7d' ? 7 : chartTimeRange === '14d' ? 14 : 30;
  
  const chartData = useMemo(() => {
    const data = [];
    const now = new Date();
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth();
    const todayDate = now.getDate();

    let cumulativeExpense = 0;
    let cumulativeIncome = 0;

    for (let i = daysCount - 1; i >= 0; i--) {
      // Local calendar day arithmetic (không bị lệch timezone UTC)
      const d = new Date(todayYear, todayMonth, todayDate - i);
      const dateStr = getLocalDateString(d);
      const dayLabel = `${d.getDate()}/${d.getMonth() + 1}`;

      // Filter all transactions on this exact local date
      const dayTxs = transactions.filter((t) => {
        if (!t.date) return false;
        return normalizeDateString(t.date) === dateStr;
      });

      // Strict segregation: transfers are internal wallet movements, never counted as expense or income
      const expenseTxs = dayTxs.filter((t) => t.type !== 'income' && t.type !== 'transfer');
      const incomeTxs = dayTxs.filter((t) => t.type === 'income');

      const dailySpent = expenseTxs.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const dailyIncome = incomeTxs.reduce((sum, t) => sum + Number(t.amount || 0), 0);

      cumulativeExpense += dailySpent;
      cumulativeIncome += dailyIncome;

      data.push({
        dateStr,
        dateLabel: i === 0 ? 'Hôm nay' : i === 1 ? 'Hôm qua' : dayLabel,
        dailySpent,
        dailyIncome,
        cumulativeSpent: cumulativeExpense,
        cumulativeIncome: cumulativeIncome,
        netDaily: dailyIncome - dailySpent,
        netCumulative: cumulativeIncome - cumulativeExpense,
        expenseCount: expenseTxs.length,
        incomeCount: incomeTxs.length,
        txCount: expenseTxs.length + incomeTxs.length,
        workHours: Number((dailySpent / (hourlyWage || 1)).toFixed(1)),
        expenseItems: expenseTxs.map((t) => t.subCategory),
        incomeItems: incomeTxs.map((t) => t.subCategory),
      });
    }
    return data;
  }, [transactions, hourlyWage, daysCount]);

  const totalPeriodSpent = useMemo(
    () => chartData.reduce((sum, d) => sum + d.dailySpent, 0),
    [chartData]
  );
  const totalPeriodIncome = useMemo(
    () => chartData.reduce((sum, d) => sum + d.dailyIncome, 0),
    [chartData]
  );
  const totalPeriodNet = totalPeriodIncome - totalPeriodSpent;
  const totalPeriodTxCount = useMemo(
    () => chartData.reduce((sum, d) => sum + d.txCount, 0),
    [chartData]
  );
  const totalPeriodHours = (totalPeriodSpent / (hourlyWage || 1)).toFixed(1);
  const averageDailySpent = Math.round(totalPeriodSpent / daysCount);
  const averageDailyIncome = Math.round(totalPeriodIncome / daysCount);

  // Custom Recharts Tooltip with Income, Expense & Net Flow
  const CustomSpendingTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      const isDaily = chartMode === 'daily';
      const dispSpent = isDaily ? dataPoint.dailySpent : dataPoint.cumulativeSpent;
      const dispIncome = isDaily ? dataPoint.dailyIncome : dataPoint.cumulativeIncome;
      const dispNet = isDaily ? dataPoint.netDaily : dataPoint.netCumulative;

      return (
        <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border-2 border-pink-200 shadow-xl text-xs space-y-2 min-w-56">
          <div className="font-black text-gray-900 border-b border-gray-100 pb-1 flex items-center justify-between">
            <span>Ngày: {label}</span>
            <span className="text-[10px] text-gray-400 font-mono font-normal">({dataPoint.dateStr})</span>
          </div>

          <div className="space-y-1.5 text-gray-700">
            <div className="flex justify-between items-center text-rose-700">
              <span className="font-bold flex items-center gap-1">🔴 {isDaily ? 'Chi trong ngày' : 'Tổng chi tích lũy'}:</span>
              <strong className="font-black tabular-nums">
                {dispSpent.toLocaleString('vi-VN')} đ
              </strong>
            </div>

            <div className="flex justify-between items-center text-emerald-700">
              <span className="font-bold flex items-center gap-1">🟢 {isDaily ? 'Thu trong ngày' : 'Tổng thu tích lũy'}:</span>
              <strong className="font-black tabular-nums">
                {dispIncome.toLocaleString('vi-VN')} đ
              </strong>
            </div>

            <div className="flex justify-between items-center pt-1 border-t border-gray-100 text-[11px] font-bold">
              <span className="text-gray-600">Dòng tiền chênh lệch:</span>
              <span className={`tabular-nums font-black ${dispNet >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {dispNet >= 0 ? '+' : ''}{dispNet.toLocaleString('vi-VN')} đ
              </span>
            </div>

            {dataPoint.workHours > 0 && (
              <div className="flex justify-between items-center text-[11px] text-amber-700 font-medium">
                <span>Thời gian làm việc:</span>
                <span className="font-bold">⏱️ {dataPoint.workHours} giờ</span>
              </div>
            )}

            <div className="flex justify-between items-center text-[11px] text-gray-500">
              <span>Số giao dịch:</span>
              <span className="font-bold">{dataPoint.txCount} món ({dataPoint.expenseCount} chi, {dataPoint.incomeCount} thu)</span>
            </div>
          </div>

          {(dataPoint.expenseItems?.length > 0 || dataPoint.incomeItems?.length > 0) && (
            <div className="pt-1.5 border-t border-gray-100 text-[10px] space-y-0.5 text-gray-500 font-medium truncate">
              {dataPoint.expenseItems?.length > 0 && (
                <div className="truncate text-rose-600">
                  Chi: {dataPoint.expenseItems.slice(0, 3).join(', ')}
                  {dataPoint.expenseItems.length > 3 ? '...' : ''}
                </div>
              )}
              {dataPoint.incomeItems?.length > 0 && (
                <div className="truncate text-emerald-600">
                  Thu: {dataPoint.incomeItems.slice(0, 3).join(', ')}
                  {dataPoint.incomeItems.length > 3 ? '...' : ''}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Metric Cards: Rollover & Wallets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Rollover Savings 🐷 */}
        <div className="bg-gradient-to-br from-purple-100/90 via-pink-100/70 to-rose-50 p-5 rounded-3xl border border-purple-200/80 shadow-xs relative overflow-hidden group">
          <div className="text-4xl absolute -right-1 -bottom-1 opacity-20 pointer-events-none transition-transform group-hover:scale-110">
            🐷
          </div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-purple-700 tracking-wider">
              KẾ DƯ THÁNG TRƯỚC SANG
            </span>
            <button
              type="button"
              onClick={() => {
                playSoftPop();
                setShowRolloverEdit(!showRolloverEdit);
              }}
              className="text-xs text-purple-600 hover:text-purple-800 p-1 rounded-lg hover:bg-white/50"
              title="Chỉnh sửa số tiền kế dư"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {showRolloverEdit ? (
            <div className="mt-2 flex gap-1.5">
              <input
                type="number"
                value={tempRollover}
                onChange={(e) => setTempRollover(e.target.value)}
                className="w-full text-sm font-bold p-1.5 bg-white border border-purple-300 rounded-xl"
              />
              <button
                type="button"
                onClick={() => {
                  setRolloverSavings(Number(tempRollover) || 0);
                  setShowRolloverEdit(false);
                }}
                className="px-2.5 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700"
              >
                Lưu
              </button>
            </div>
          ) : (
            <div className="text-2xl font-extrabold text-purple-900 tracking-tight">
              {rolloverSavings.toLocaleString('vi-VN')} <span className="text-sm font-bold">đ</span>
            </div>
          )}

          <div className="text-xs text-purple-700/90 mt-2 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            Bảo lưu 100% làm đòn bẩy dự trữ tháng này ✨
          </div>
        </div>

        {/* Card 2: Wallets (Nguồn tiền) with Tri-Balance Breakdown */}
        <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-5 rounded-3xl border border-emerald-200/80 shadow-xs md:col-span-2 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-emerald-900 tracking-wider">
                  NGUỒN TIỀN CỦA BẠN (CÁC VÍ) 💳
                </span>
                <span className="text-xs text-emerald-800 font-extrabold bg-emerald-100/90 px-2 py-0.5 rounded-lg border border-emerald-200">
                  Tổng Sở Hữu: {totalWalletBalance.toLocaleString('vi-VN')} đ
                </span>
                <span className="text-xs text-purple-800 font-black bg-purple-100/90 px-2 py-0.5 rounded-lg border border-purple-200">
                  🛡️ Khóa Tiết Kiệm: {totalSavedInFunds.toLocaleString('vi-VN')} đ
                </span>
                <span className="text-xs text-teal-900 font-black bg-teal-200/80 px-2 py-0.5 rounded-lg border border-teal-300">
                  🟢 Khả Dụng Để Tiêu: {totalAvailableToSpend.toLocaleString('vi-VN')} đ
                </span>
              </div>
              {totalIncome > 0 && (
                <div className="text-[11px] text-teal-700 font-semibold mt-1">
                  Đã ghi nhận thu nhập: +{totalIncome.toLocaleString('vi-VN')} đ ✨
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  playCashRegister();
                  if (onNavigateToIncome) onNavigateToIncome();
                }}
                className="self-start sm:self-auto px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95 shrink-0"
                title="Ghi nhận khoản thu mới và nạp vào ví mong muốn"
              >
                <span>💰 Nạp Tiền Vào Ví</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playSoftPop();
                  if (onNavigateToTransfer) onNavigateToTransfer();
                }}
                className="self-start sm:self-auto px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95 shrink-0"
                title="Chuyển tiền qua lại giữa các ví (Túi trái sang túi phải)"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-purple-200" />
                <span>Chuyển Tiền Ví 🔄</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-2">
            {wallets.map((w) => {
              const alloc = walletFundAllocations[w.id];
              const savedInThisWallet = alloc?.totalSaved || 0;
              const spendableInThisWallet = Math.max(0, w.balance - savedInThisWallet);

              return (
                <div
                  key={w.id}
                  onClick={() => {
                    playSoftPop();
                    if (onNavigateToIncome) onNavigateToIncome(w.id);
                  }}
                  className="bg-white/95 backdrop-blur-xs p-3 rounded-2xl border border-emerald-200/90 text-xs text-gray-700 flex items-center justify-between gap-2 shadow-2xs hover:border-emerald-400 hover:shadow-xs transition-all cursor-pointer group"
                  title={`Bấm để nạp thêm thu nhập vào ${w.name}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-2xl shrink-0 group-hover:scale-110 transition-transform">
                      {w.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-gray-800 truncate">{w.name}</div>
                      <div className="font-black text-emerald-800 text-sm tracking-tight">
                        {w.balance.toLocaleString('vi-VN')}{' '}
                        <span className="text-[10px] font-normal text-emerald-600">đ tổng</span>
                      </div>
                      {savedInThisWallet > 0 ? (
                        <div className="text-[10px] space-y-0.5 mt-0.5">
                          <div className="text-purple-700 font-bold flex items-center gap-1 truncate">
                            <span>🛡️ Giữ quỹ: {savedInThisWallet.toLocaleString('vi-VN')} đ</span>
                            <span className="text-gray-400">({alloc?.funds.map((f) => f.icon).join('')})</span>
                          </div>
                          <div className="text-teal-700 font-black flex items-center gap-1">
                            <span>🟢 Được tiêu: {spendableInThisWallet.toLocaleString('vi-VN')} đ</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[10px] text-teal-700 font-bold mt-0.5 flex items-center gap-1">
                          <span>🟢 Khả dụng 100% để tiêu</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playSoftPop();
                        if (onNavigateToIncome) onNavigateToIncome(w.id);
                      }}
                      className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-extrabold rounded-xl text-[10px] transition-colors"
                      title={`Nạp tiền vào ${w.name}`}
                    >
                      + Nạp
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playSoftPop();
                        if (onNavigateToTransfer) onNavigateToTransfer(w.id);
                      }}
                      className="px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-900 font-extrabold rounded-xl text-[10px] transition-colors flex items-center gap-0.5"
                      title={`Chuyển tiền từ ${w.name} sang ví khác`}
                    >
                      <span>🔄</span>
                      <span>Chuyển</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Monthly Budget Summary Banner */}
      <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-400 to-amber-300 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-inner">
            {overallSpentPercent}%
          </div>
          <div>
            <div className="text-xs font-bold text-gray-400">ĐIỀU PHỐI NGÂN SÁCH THÁNG NÀY</div>
            <div className="text-base sm:text-lg font-black text-gray-800">
              Đã phân bổ {totalSpent.toLocaleString('vi-VN')} đ{' '}
              <span className="text-gray-400 text-xs font-normal">
                / {totalBudget.toLocaleString('vi-VN')} đ
              </span>
            </div>
            {/* Detailed financial separation: Expenses vs Savings */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px]">
              <span className="text-pink-700 font-bold bg-pink-50 px-2 py-0.5 rounded-lg border border-pink-200">
                💸 Đã tiêu thực tế: {actualExpenses.toLocaleString('vi-VN')} đ
              </span>
              <span className="text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                🛡️ Trích quỹ tiết kiệm: {totalMonthlySavings.toLocaleString('vi-VN')} đ (Vẫn là tiền của bạn)
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold bg-amber-50 text-amber-900 px-4 py-2 rounded-2xl border border-amber-200 shrink-0">
          <TrendingUp className="w-4 h-4 text-amber-600" />
          <span>
            Tương đương <strong className="font-bold text-amber-800">{totalWorkHoursUsed} giờ</strong> lao động ⏱️
          </span>
        </div>
      </div>

      {/* RECHARTS AREACHART: TRỰC QUAN HÓA TỔNG THU & CHI THEO THỜI GIAN THỰC TẾ TỪ TRANSACTIONS */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border-2 border-pink-200/90 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl p-2 rounded-2xl bg-gradient-to-tr from-pink-100 to-emerald-100 text-pink-700">
              📈
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-gray-900 tracking-tight">
                  BIỂU ĐỒ DIỆN TÍCH TỔNG THU & CHI (AREACHART)
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                  Tự động cập nhật
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium">
                Theo dõi diễn biến thu chi thực tế theo từng ngày hoặc lũy kế, cập nhật ngay lập tức khi thêm hoặc xóa giao dịch
              </p>
            </div>
          </div>

          {/* Mode & Time Range Controls */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto text-xs font-bold">
            {/* Thu / Chi / Cả hai Selector */}
            <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  playSoftPop();
                  setChartMetric('both');
                }}
                className={`px-2.5 py-1.5 rounded-xl transition-all ${
                  chartMetric === 'both' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🔘 Cả Thu & Chi
              </button>
              <button
                type="button"
                onClick={() => {
                  playSoftPop();
                  setChartMetric('expense');
                }}
                className={`px-2.5 py-1.5 rounded-xl transition-all ${
                  chartMetric === 'expense' ? 'bg-rose-500 text-white shadow-2xs' : 'text-gray-600 hover:text-rose-600'
                }`}
              >
                🔴 Chi Tiêu
              </button>
              <button
                type="button"
                onClick={() => {
                  playSoftPop();
                  setChartMetric('income');
                }}
                className={`px-2.5 py-1.5 rounded-xl transition-all ${
                  chartMetric === 'income' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-gray-600 hover:text-emerald-600'
                }`}
              >
                🟢 Thu Nhập
              </button>
            </div>

            {/* Metric Mode Toggle */}
            <div className="flex items-center gap-1 p-1 bg-pink-50 rounded-2xl border border-pink-200">
              <button
                type="button"
                onClick={() => {
                  playSoftPop();
                  setChartMode('daily');
                }}
                className={`px-2.5 py-1.5 rounded-xl transition-all ${
                  chartMode === 'daily'
                    ? 'bg-pink-500 text-white shadow-2xs'
                    : 'text-pink-900 hover:text-pink-600'
                }`}
              >
                Từng Ngày
              </button>
              <button
                type="button"
                onClick={() => {
                  playSoftPop();
                  setChartMode('cumulative');
                }}
                className={`px-2.5 py-1.5 rounded-xl transition-all ${
                  chartMode === 'cumulative'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'text-purple-900 hover:text-purple-600'
                }`}
              >
                Tích Lũy
              </button>
            </div>

            {/* Time horizon */}
            <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  playSoftPop();
                  setChartTimeRange('7d');
                }}
                className={`px-2.5 py-1.5 rounded-xl transition-all ${
                  chartTimeRange === '7d' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-600'
                }`}
              >
                7 Ngày
              </button>
              <button
                type="button"
                onClick={() => {
                  playSoftPop();
                  setChartTimeRange('14d');
                }}
                className={`px-2.5 py-1.5 rounded-xl transition-all ${
                  chartTimeRange === '14d' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-600'
                }`}
              >
                14 Ngày
              </button>
              <button
                type="button"
                onClick={() => {
                  playSoftPop();
                  setChartTimeRange('30d');
                }}
                className={`px-2.5 py-1.5 rounded-xl transition-all ${
                  chartTimeRange === '30d' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-600'
                }`}
              >
                30 Ngày
              </button>
            </div>
          </div>
        </div>

        {/* Chart Period Stat Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="p-3 bg-rose-50/80 rounded-2xl border border-rose-200">
            <span className="text-[11px] text-rose-700 font-bold block">Tổng Chi Trong Kỳ:</span>
            <strong className="text-sm font-black text-rose-900 tabular-nums">
              {totalPeriodSpent.toLocaleString('vi-VN')} đ
            </strong>
          </div>

          <div className="p-3 bg-emerald-50/80 rounded-2xl border border-emerald-200">
            <span className="text-[11px] text-emerald-700 font-bold block">Tổng Thu Trong Kỳ:</span>
            <strong className="text-sm font-black text-emerald-900 tabular-nums">
              +{totalPeriodIncome.toLocaleString('vi-VN')} đ
            </strong>
          </div>

          <div className={`p-3 rounded-2xl border ${
            totalPeriodNet >= 0
              ? 'bg-teal-50/80 border-teal-200 text-teal-900'
              : 'bg-amber-50/80 border-amber-200 text-amber-900'
          }`}>
            <span className="text-[11px] font-bold block">
              {totalPeriodNet >= 0 ? 'Thặng Dư Ròng 🟢:' : 'Thâm Hụt Ròng 🔴:'}
            </span>
            <strong className="text-sm font-black tabular-nums">
              {totalPeriodNet >= 0 ? '+' : ''}{totalPeriodNet.toLocaleString('vi-VN')} đ
            </strong>
          </div>

          <div className="p-3 bg-purple-50/80 rounded-2xl border border-purple-200">
            <span className="text-[11px] text-purple-700 font-bold block">Giao Dịch Đã Quét:</span>
            <strong className="text-sm font-black text-purple-900 tabular-nums">
              {totalPeriodTxCount} lượt ({totalPeriodHours}h làm việc)
            </strong>
          </div>
        </div>

        {/* Recharts AreaChart Container */}
        <div className="w-full h-64 sm:h-72 pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.65} />
                  <stop offset="95%" stopColor="#FB7185" stopOpacity={0.04} />
                </linearGradient>
                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.65} />
                  <stop offset="95%" stopColor="#34D399" stopOpacity={0.04} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 600 }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) =>
                  val >= 1000000
                    ? `${(val / 1000000).toFixed(1)}Tr`
                    : val >= 1000
                    ? `${(val / 1000).toFixed(0)}k`
                    : String(val)
                }
              />
              <Tooltip content={<CustomSpendingTooltip />} />
              
              {/* Income Area (Xanh ngọc) */}
              {(chartMetric === 'both' || chartMetric === 'income') && (
                <Area
                  type="monotone"
                  dataKey={chartMode === 'daily' ? 'dailyIncome' : 'cumulativeIncome'}
                  stroke="#059669"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#incomeGradient)"
                  name={chartMode === 'daily' ? 'Thu Nhập Từng Ngày' : 'Tổng Thu Tích Lũy'}
                  activeDot={{ r: 6, fill: '#059669', stroke: '#fff', strokeWidth: 2 }}
                />
              )}

              {/* Expense Area (Đỏ hồng) */}
              {(chartMetric === 'both' || chartMetric === 'expense') && (
                <Area
                  type="monotone"
                  dataKey={chartMode === 'daily' ? 'dailySpent' : 'cumulativeSpent'}
                  stroke="#E11D48"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#spendingGradient)"
                  name={chartMode === 'daily' ? 'Chi Tiêu Từng Ngày' : 'Tổng Chi Tích Lũy'}
                  activeDot={{ r: 6, fill: '#E11D48', stroke: '#fff', strokeWidth: 2 }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Helpful Tip */}
        {transactions.length === 0 ? (
          <div className="p-3 bg-pink-50/60 rounded-2xl border border-pink-200 text-center text-xs text-gray-500 font-medium">
            💡 Hiện tại chưa có giao dịch nào được ghi nhận. Khi bạn quét thêm các khoản chi hoặc nạp thu nhập, biểu đồ AreaChart sẽ vẽ trực quan hóa diễn biến tức thì theo từng ngày! ✨
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-1 text-[11px] text-gray-400 font-medium px-1">
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-emerald-700 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Thu Nhập
              </span>
              <span className="flex items-center gap-1 text-rose-700 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> Chi Tiêu
              </span>
              <span>• Dữ liệu tự động đồng bộ theo thời gian thực</span>
            </span>
            <span>Chế độ: {chartMode === 'daily' ? 'Từng ngày' : 'Tích lũy'} ({chartMetric === 'both' ? 'Cả thu & chi' : chartMetric === 'expense' ? 'Chỉ chi' : 'Chỉ thu'})</span>
          </div>
        )}
      </div>

      {/* CẢNH BÁO TRỰC QUAN & THÔNG BÁO ĐẨY KHI HŨ VƯỢT QUÁ 90% HẠN MỨC */}
      {alertedJars.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 via-rose-50 to-pink-50 p-5 sm:p-6 rounded-3xl border-2 border-amber-300 shadow-md relative overflow-hidden animate-fadeIn">
          {/* Subtle background icon */}
          <div className="absolute top-2 right-3 text-5xl opacity-15 select-none pointer-events-none">
            ⚠️
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-rose-400 text-white flex items-center justify-center text-xl shrink-0 shadow-sm animate-pulse">
                <BellRing className="w-6 h-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-rose-500 text-white shadow-2xs">
                    Cảnh báo trực quan
                  </span>
                  <span className="text-xs font-black text-rose-700">
                    Phát hiện {alertedJars.length} hũ chi tiêu vượt quá 90% hạn mức!
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-gray-900 tracking-tight mt-0.5">
                  CHẠM NGƯỠNG BÁO ĐỘNG NGÂN SÁCH THÁNG 🚨
                </h3>
              </div>
            </div>

            {/* Web Push Notification Button */}
            <button
              type="button"
              onClick={handleTogglePushNotifications}
              className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shadow-2xs shrink-0 ${
                pushPermission === 'granted'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-200'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>
                {pushPermission === 'granted'
                  ? '✅ Thông báo đẩy: Đã kích hoạt'
                  : '🔔 Bật thông báo đẩy (Web Push)'}
              </span>
            </button>
          </div>

          {/* Cards of Warning Jars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 my-3">
            {alertedJars.map((jar) => (
              <div
                key={jar.id}
                className={`p-3.5 rounded-2xl border bg-white/95 flex items-center justify-between gap-2 shadow-2xs transition-all ${
                  jar.isExceeded
                    ? 'border-rose-300 ring-1 ring-rose-200'
                    : 'border-amber-300 ring-1 ring-amber-200'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-2xl p-1 bg-gray-50 rounded-xl border border-black/5 shrink-0">
                    {jar.icon}
                  </span>
                  <div className="truncate">
                    <div className="font-black text-xs text-gray-900 truncate">{jar.name}</div>
                    <div className="text-[11px] font-semibold text-gray-500">
                      Đã tiêu: <strong className="text-gray-800">{jar.spent.toLocaleString('vi-VN')} đ</strong> / {jar.limit.toLocaleString('vi-VN')} đ
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`text-xs font-black px-2.5 py-0.5 rounded-full block text-center ${
                      jar.isExceeded
                        ? 'bg-rose-500 text-white'
                        : 'bg-amber-400 text-amber-950'
                    }`}
                  >
                    {jar.pct}%
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      playSoftPop();
                      setEditingJarId(jar.id);
                      setNewLimitInput(String(jar.limit));
                    }}
                    className="text-[10px] text-pink-700 hover:text-pink-900 font-bold mt-1 block"
                  >
                    Nâng hạn mức ✏️
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Actionable Guidance & Alert Status */}
          <div className="mt-2 pt-2.5 border-t border-amber-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gray-700">
            <div className="flex items-center gap-1.5 font-medium text-amber-950">
              <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
              <span>
                <strong>Hành động đề xuất:</strong> Tạm hoãn mua sắm các mục con của hũ này trong <em>Giỏ Chờ Đắn Đo</em> hoặc điều chỉnh tăng hạn mức từ các hũ còn dư!
              </span>
            </div>
            {pushNoticeSent && (
              <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 animate-fadeIn shrink-0">
                Đã gửi thông báo thử nghiệm! 📲
              </span>
            )}
          </div>
        </div>
      )}

      {/* 2. QUẢN LÝ CÁC QUỸ TIẾT KIỆM MỤC TIÊU DÀI HẠN */}
      <SavingsFundsManager
        savingsFunds={savingsFunds}
        wallets={wallets}
        hourlyWage={hourlyWage}
        onAddSavingsFund={onAddSavingsFund || (() => {})}
        onUpdateSavingsFund={onUpdateSavingsFund || (() => {})}
        onDeleteSavingsFund={onDeleteSavingsFund || (() => {})}
        onDepositSavingsFund={onDepositSavingsFund || (() => {})}
        onRelocateSavingsFundWallet={onRelocateSavingsFundWallet}
        onNavigateToTransfer={onNavigateToTransfer}
      />

      {/* 3. The Spending Jars Grid (Đã loại bỏ khung Tiết Kiệm Dài Hạn LTSS theo yêu cầu, toàn bộ mục tiêu tiết kiệm dài hạn được quản lý tập trung ở mục CÁC QUỸ TIẾT KIỆM MỤC TIÊU DÀI HẠN phía trên) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {jarsWithStatus
          .filter((jar) => jar.id !== 'ltss')
          .map((jar) => {
          const { spent, remaining, pct, isOver, isWarning, isExceeded } = {
            spent: jar.spent,
            remaining: jar.remaining,
            pct: jar.pct,
            isOver: jar.isExceeded,
            isWarning: jar.isWarning,
            isExceeded: jar.isExceeded,
          };
          const isEditing = editingJarId === jar.id;

          return (
            <div
              key={jar.id}
              className={`p-5 rounded-3xl border-2 transition-all duration-200 shadow-xs flex flex-col justify-between ${
                isExceeded
                  ? 'bg-rose-50/70 border-rose-300 ring-2 ring-rose-200'
                  : isWarning
                  ? 'bg-amber-50/60 border-amber-300 ring-2 ring-amber-200'
                  : `${jar.colorBg} ${jar.colorBorder}`
              } hover:shadow-sm`}
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl p-1 bg-white/70 rounded-xl border border-black/5">
                      {jar.icon}
                    </span>
                    <div>
                      <h3 className={`font-extrabold text-sm sm:text-base leading-tight ${jar.colorText}`}>
                        {jar.name}
                      </h3>
                      <span className="text-[11px] font-semibold text-gray-500">{jar.code}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-extrabold border ${
                        isExceeded
                          ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                          : isWarning
                          ? 'bg-amber-400 text-amber-950 border-amber-500'
                          : 'bg-white/80 text-gray-700 border-black/10'
                      }`}
                    >
                      {pct}%
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        playSoftPop();
                        if (isEditing) {
                          setEditingJarId(null);
                        } else {
                          setEditingJarId(jar.id);
                          setNewLimitInput(String(jar.limit));
                        }
                      }}
                      className="p-1 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-white/60 transition-colors"
                      title="Sửa hạn mức"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Edit limit modal/inline */}
                {isEditing && (
                  <div className="my-2 p-2 bg-white/90 rounded-2xl border border-black/10 text-xs">
                    <label className="font-bold block text-gray-600 mb-1">Cài hạn mức mới:</label>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        value={newLimitInput}
                        onChange={(e) => setNewLimitInput(e.target.value)}
                        className="w-full p-1 border rounded-lg font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const val = Number(newLimitInput);
                          if (val >= 0) {
                            onUpdateJarLimit(jar.id, val);
                            setEditingJarId(null);
                          }
                        }}
                        className="px-2.5 bg-gray-800 text-white rounded-lg font-bold hover:bg-black"
                      >
                        Lưu
                      </button>
                    </div>
                  </div>
                )}

                {/* Description */}
                <p className="text-[11px] text-gray-600 line-clamp-1 mb-2.5">
                  {jar.description}
                </p>

                {/* Visual 90% Caution Ribbon on the Card */}
                {isExceeded ? (
                  <div className="mb-2 p-2 rounded-xl bg-rose-100/90 border border-rose-300 text-rose-800 text-[11px] font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>🚨 ĐÃ VƯỢT HẠN MỨC! Hãy tạm dừng chi thêm cho hũ này.</span>
                  </div>
                ) : isWarning ? (
                  <div className="mb-2 p-2 rounded-xl bg-amber-100/90 border border-amber-300 text-amber-900 text-[11px] font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>⚠️ ĐÃ DÙNG HƠN 90%! Chỉ còn {remaining.toLocaleString('vi-VN')} đ dự phòng.</span>
                  </div>
                ) : null}

                {/* Candy Progress bar */}
                <div className="w-full bg-white/80 h-3.5 rounded-full overflow-hidden p-0.5 border border-black/5 relative shadow-inner">
                  <div
                    className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${
                      isExceeded
                        ? 'from-rose-500 to-red-600'
                        : isWarning
                        ? 'from-amber-400 via-orange-400 to-rose-400 animate-pulse'
                        : jar.colorBar
                    }`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>

                {/* Numeric summary */}
                <div className="flex justify-between items-center text-xs font-bold mt-2.5">
                  <span className="text-gray-600">
                    Đã tiêu: <strong className="text-gray-900">{spent.toLocaleString('vi-VN')} đ</strong>
                  </span>
                  <span className={remaining < 0 ? 'text-rose-600 font-extrabold flex items-center gap-1' : 'text-gray-600'}>
                    {remaining < 0 ? (
                      <>
                        <AlertTriangle className="w-3 h-3 text-rose-500" />
                        Vượt {Math.abs(remaining).toLocaleString('vi-VN')} đ
                      </>
                    ) : (
                      <>Còn lại: {remaining.toLocaleString('vi-VN')} đ</>
                    )}
                  </span>
                </div>

              </div>

              {/* Subcategories list */}
              <div className="mt-4 pt-3 border-t border-black/10">
                <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 mb-1.5">
                  <span>MỤC CON (BẤM ĐỂ QUÉT NHANH):</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {jar.subs.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        playSoftPop();
                        onSelectSubcategoryForScan(jar.id, s);
                      }}
                      className="text-[11px] bg-white/90 hover:bg-white px-2.5 py-1 rounded-xl text-gray-700 font-semibold border border-black/5 hover:border-black/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-1 shadow-2xs group"
                    >
                      <span>{s}</span>
                      <ArrowRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-pink-500 transition-opacity" />
                    </button>
                  ))}
                  {/* Inline add subcategory */}
                  <div className="flex items-center gap-1 mt-1 w-full">
                    <input
                      type="text"
                      placeholder="+ Thêm mục con..."
                      value={editingJarId === `sub-${jar.id}` ? newSubInput : ''}
                      onFocus={() => setEditingJarId(`sub-${jar.id}`)}
                      onChange={(e) => setNewSubInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newSubInput.trim()) {
                          onAddSubCategory(jar.id, newSubInput.trim());
                          setNewSubInput('');
                          setEditingJarId(null);
                        }
                      }}
                      className="text-[11px] bg-white/70 px-2 py-1 rounded-lg border border-gray-200 w-full focus:bg-white focus:outline-none"
                    />
                    {editingJarId === `sub-${jar.id}` && newSubInput.trim() && (
                      <button
                        type="button"
                        onClick={() => {
                          onAddSubCategory(jar.id, newSubInput.trim());
                          setNewSubInput('');
                          setEditingJarId(null);
                        }}
                        className="p-1 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 shrink-0"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
