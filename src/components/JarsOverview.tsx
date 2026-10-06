import React, { useState, useMemo } from 'react';
import { Jar, Wallet, Transaction } from '../types';
import {
  Plus,
  Edit2,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  BarChart3,
  Clock,
  ShoppingCart,
  Bell,
  BellRing,
  ShieldAlert,
  Sparkles,
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
  rolloverSavings: number;
  setRolloverSavings: (val: number) => void;
  hourlyWage: number;
  onSelectSubcategoryForScan: (jarId: string, subCategory: string) => void;
  onUpdateJarLimit: (jarId: string, newLimit: number) => void;
  onAddSubCategory: (jarId: string, subName: string) => void;
}

export const JarsOverview: React.FC<JarsOverviewProps> = ({
  jars,
  wallets,
  transactions,
  rolloverSavings,
  setRolloverSavings,
  hourlyWage,
  onSelectSubcategoryForScan,
  onUpdateJarLimit,
  onAddSubCategory,
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

  // Calculate spent per jar
  const jarSpentMap: Record<string, number> = {};
  jars.forEach((j) => (jarSpentMap[j.id] = 0));
  transactions.forEach((t) => {
    if (jarSpentMap[t.jarId] !== undefined) {
      jarSpentMap[t.jarId] += Number(t.amount);
    }
  });

  const totalBudget = jars.reduce((sum, j) => sum + j.limit, 0);
  const totalSpent = Object.values(jarSpentMap).reduce((sum, v) => sum + v, 0);
  const totalWalletBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
  const totalWorkHoursUsed = (totalSpent / (hourlyWage || 1)).toFixed(1);
  const overallSpentPercent = totalBudget > 0 ? Math.min(Math.round((totalSpent / totalBudget) * 100), 100) : 0;

  // Process jars with 90% threshold warning detection
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

  // Jars that breached 90% or 100%
  const alertedJars = useMemo(() => {
    return jarsWithStatus.filter((j) => j.isWarning || j.isExceeded);
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

  // Real-time Spending AreaChart Data computed directly from transactions
  const daysCount = chartTimeRange === '7d' ? 7 : chartTimeRange === '14d' ? 14 : 30;
  
  const chartData = useMemo(() => {
    const data = [];
    const now = new Date();
    let cumulativeSum = 0;

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = `${d.getDate()}/${d.getMonth() + 1}`;

      // Find all transactions on this date
      const dayTxs = transactions.filter((t) => t.date === dateStr);
      const dailySpent = dayTxs.reduce((sum, t) => sum + Number(t.amount), 0);
      cumulativeSum += dailySpent;

      data.push({
        dateStr,
        dateLabel: i === 0 ? 'Hôm nay' : dayLabel,
        dailySpent,
        cumulativeSpent: cumulativeSum,
        txCount: dayTxs.length,
        workHours: Number((dailySpent / (hourlyWage || 1)).toFixed(1)),
        items: dayTxs.map((t) => t.subCategory),
      });
    }
    return data;
  }, [transactions, hourlyWage, daysCount]);

  const totalPeriodSpent = chartData.reduce((sum, d) => sum + d.dailySpent, 0);
  const totalPeriodTxCount = chartData.reduce((sum, d) => sum + d.txCount, 0);
  const totalPeriodHours = (totalPeriodSpent / (hourlyWage || 1)).toFixed(1);
  const averageDailySpent = Math.round(totalPeriodSpent / daysCount);

  // Custom Recharts Tooltip
  const CustomSpendingTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border-2 border-pink-200 shadow-lg text-xs space-y-1.5 min-w-48">
          <div className="font-black text-gray-900 border-b border-gray-100 pb-1 flex items-center justify-between">
            <span>Ngày: {label}</span>
            <span className="text-[10px] text-gray-400 font-mono font-normal">({dataPoint.dateStr})</span>
          </div>

          <div className="space-y-1 text-gray-700">
            <div className="flex justify-between items-center">
              <span className="font-bold text-pink-700">Chi trong ngày:</span>
              <strong className="font-black text-pink-700 tabular-nums">
                {dataPoint.dailySpent.toLocaleString('vi-VN')} đ
              </strong>
            </div>

            <div className="flex justify-between items-center text-[11px] text-purple-700 font-semibold">
              <span>Tích lũy đến ngày:</span>
              <span className="tabular-nums font-bold">
                {dataPoint.cumulativeSpent.toLocaleString('vi-VN')} đ
              </span>
            </div>

            <div className="flex justify-between items-center text-[11px] text-amber-700 font-medium">
              <span>Thời gian làm việc:</span>
              <span className="font-bold">⏱️ {dataPoint.workHours} giờ</span>
            </div>

            <div className="flex justify-between items-center text-[11px] text-gray-500">
              <span>Số món đã quét:</span>
              <span className="font-bold">{dataPoint.txCount} món</span>
            </div>
          </div>

          {dataPoint.items && dataPoint.items.length > 0 && (
            <div className="pt-1.5 border-t border-gray-100 text-[10px] text-gray-500 font-medium truncate">
              Món: {dataPoint.items.slice(0, 3).join(', ')}
              {dataPoint.items.length > 3 ? '...' : ''}
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

        {/* Card 2: Wallets (Nguồn tiền) */}
        <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-5 rounded-3xl border border-emerald-200/80 shadow-xs md:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-800 tracking-wider">
                NGUỒN TIỀN CỦA BẠN (CÁC VÍ) 💳
              </span>
              <span className="text-xs text-emerald-600 font-semibold">
                Tổng: {totalWalletBalance.toLocaleString('vi-VN')} đ
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 mt-1">
            {wallets.map((w) => (
              <div
                key={w.id}
                className="bg-white/90 backdrop-blur-xs px-3.5 py-2 rounded-2xl border border-emerald-200/90 text-xs text-gray-700 flex items-center gap-2 shadow-2xs hover:border-emerald-400 transition-colors"
              >
                <span className="text-base">{w.icon}</span>
                <div>
                  <div className="font-semibold text-gray-600">{w.name}</div>
                  <div className="font-extrabold text-emerald-700 text-sm">
                    {w.balance.toLocaleString('vi-VN')} đ
                  </div>
                </div>
              </div>
            ))}
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
            <div className="text-xs font-bold text-gray-400">TỔNG NGÂN SÁCH 6 HŨ THÁNG NÀY</div>
            <div className="text-base sm:text-lg font-black text-gray-800">
              Đã tiêu {totalSpent.toLocaleString('vi-VN')} đ{' '}
              <span className="text-gray-400 text-xs font-normal">
                / {totalBudget.toLocaleString('vi-VN')} đ
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

      {/* RECHARTS AREACHART: TRỰC QUAN HÓA TỔNG CHI TIÊU THEO THỜI GIAN TỪ TRANSACTIONS */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border-2 border-pink-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl p-2 rounded-2xl bg-pink-100 text-pink-700">
              📈
            </span>
            <div>
              <h3 className="font-black text-base text-gray-900 tracking-tight flex items-center gap-2">
                BIỂU ĐỒ DIỆN TÍCH TỔNG CHI TIÊU (AREACHART)
              </h3>
              <p className="text-xs text-gray-500 font-medium">
                Trực quan hóa chi tiêu theo thời gian thực tế sử dụng dữ liệu từ các lần quét mã thu ngân
              </p>
            </div>
          </div>

          {/* Mode & Time Range Controls */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto text-xs font-bold">
            {/* Metric Mode Toggle */}
            <div className="flex items-center gap-1 p-1 bg-pink-50 rounded-2xl border border-pink-200">
              <button
                type="button"
                onClick={() => {
                  playSoftPop();
                  setChartMode('daily');
                }}
                className={`px-3 py-1.5 rounded-xl transition-all ${
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
                className={`px-3 py-1.5 rounded-xl transition-all ${
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
          <div className="p-3 bg-pink-50/80 rounded-2xl border border-pink-200">
            <span className="text-[11px] text-pink-700 font-bold block">Tổng Chi Trong Kỳ:</span>
            <strong className="text-sm font-black text-pink-900 tabular-nums">
              {totalPeriodSpent.toLocaleString('vi-VN')} đ
            </strong>
          </div>

          <div className="p-3 bg-purple-50/80 rounded-2xl border border-purple-200">
            <span className="text-[11px] text-purple-700 font-bold block">Số Đơn Quét:</span>
            <strong className="text-sm font-black text-purple-900 tabular-nums">
              {totalPeriodTxCount} giao dịch
            </strong>
          </div>

          <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200">
            <span className="text-[11px] text-amber-700 font-bold block">Giờ Làm Đã Tiêu:</span>
            <strong className="text-sm font-black text-amber-900 tabular-nums">
              ⏱️ {totalPeriodHours} giờ
            </strong>
          </div>

          <div className="p-3 bg-sky-50/80 rounded-2xl border border-sky-200">
            <span className="text-[11px] text-sky-700 font-bold block">Trung Bình / Ngày:</span>
            <strong className="text-sm font-black text-sky-900 tabular-nums">
              {averageDailySpent.toLocaleString('vi-VN')} đ/ngày
            </strong>
          </div>
        </div>

        {/* Recharts AreaChart Container */}
        <div className="w-full h-64 sm:h-72 pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartMode === 'daily' ? '#EC4899' : '#8B5CF6'} stopOpacity={0.65} />
                  <stop offset="95%" stopColor={chartMode === 'daily' ? '#F472B6' : '#C084FC'} stopOpacity={0.04} />
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
              <Area
                type="monotone"
                dataKey={chartMode === 'daily' ? 'dailySpent' : 'cumulativeSpent'}
                stroke={chartMode === 'daily' ? '#DB2777' : '#7C3AED'}
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#spendingGradient)"
                name={chartMode === 'daily' ? 'Chi Tiêu Từng Ngày' : 'Tổng Chi Tích Lũy'}
                activeDot={{ r: 6, fill: '#DB2777', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Helpful Tip */}
        {transactions.length === 0 ? (
          <div className="p-3 bg-pink-50/60 rounded-2xl border border-pink-200 text-center text-xs text-gray-500 font-medium">
            💡 Hiện tại bạn chưa quét khoản chi nào. Khi bạn quét các khoản chi tại tab <strong>Quét Thu Chi</strong>, đường biểu đồ AreaChart sẽ vẽ trực quan hóa diễn biến chi tiêu tức thì theo từng ngày! ✨
          </div>
        ) : (
          <div className="flex items-center justify-between text-[11px] text-gray-400 font-medium px-1">
            <span>Dữ liệu được cập nhật tự động từ danh sách giao dịch thực tế</span>
            <span>Chế độ hiển thị: {chartMode === 'daily' ? 'Chi tiêu từng ngày' : 'Tích lũy tổng chi'}</span>
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

      {/* The 6 Jars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {jarsWithStatus.map((jar) => {
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
