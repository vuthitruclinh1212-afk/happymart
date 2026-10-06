import React, { useState, useMemo } from 'react';
import { Jar, Wallet, RecurringExpense, ScenarioType, ForecastMonthData, Transaction } from '../types';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ShieldCheck,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  HelpCircle,
  Clock,
  PiggyBank,
  ArrowRight,
  Sliders,
  Flame,
  ShieldAlert,
} from 'lucide-react';
import { playCashRegister, playSoftPop } from '../utils/audio';

interface FinancialForecastProps {
  hourlyWage: number;
  setHourlyWage: (wage: number) => void;
  monthlyWorkHours: number;
  setMonthlyWorkHours: (hours: number) => void;
  jars: Jar[];
  wallets: Wallet[];
  recurringExpenses: RecurringExpense[];
  transactions: Transaction[];
  onAddRecurringExpense: (expense: Omit<RecurringExpense, 'id'>) => void;
  onToggleRecurringExpense: (id: string) => void;
  onDeleteRecurringExpense: (id: string) => void;
  rolloverSavings: number;
}

export const FinancialForecast: React.FC<FinancialForecastProps> = ({
  hourlyWage,
  setHourlyWage,
  monthlyWorkHours,
  setMonthlyWorkHours,
  jars,
  wallets,
  recurringExpenses,
  transactions,
  onAddRecurringExpense,
  onToggleRecurringExpense,
  onDeleteRecurringExpense,
  rolloverSavings,
}) => {
  const [forecastHorizon, setForecastHorizon] = useState<3 | 6>(6);
  // Default to 'normal' based on user request ('tight', 'normal', 'splurge')
  const [scenario, setScenario] = useState<ScenarioType>('normal');
  const [showAddRecurring, setShowAddRecurring] = useState<boolean>(false);

  // New recurring form state
  const [recName, setRecName] = useState<string>('');
  const [recAmountStr, setRecAmountStr] = useState<string>('');
  const [recJarId, setRecJarId] = useState<string>('nec');
  const [recDay, setRecDay] = useState<number>(5);
  const [recIcon, setRecIcon] = useState<string>('⚡');
  const [recCategory, setRecCategory] = useState<string>('Hóa đơn sinh hoạt');

  // Total current starting capital across all wallets
  const startingLiquidCapital = wallets.reduce((sum, w) => sum + w.balance, 0) + rolloverSavings;

  // Active recurring fixed costs per month
  const activeRecurringMonthly = useMemo(() => {
    return recurringExpenses
      .filter((r) => r.isActive)
      .reduce((sum, r) => sum + r.amount, 0);
  }, [recurringExpenses]);

  // Savings allocation targets (LTSS + FFA)
  const monthlySavingsTarget = useMemo(() => {
    const ltss = jars.find((j) => j.id === 'ltss')?.limit || 0;
    const ffa = jars.find((j) => j.id === 'ffa')?.limit || 0;
    return ltss + ffa;
  }, [jars]);

  // Other variable spending targets (NEC excluding recurring + PLAY + EDU + GIVE)
  const baseVariableBudget = useMemo(() => {
    const necTotal = jars.find((j) => j.id === 'nec')?.limit || 0;
    const play = jars.find((j) => j.id === 'play')?.limit || 0;
    const edu = jars.find((j) => j.id === 'edu')?.limit || 0;
    const give = jars.find((j) => j.id === 'give')?.limit || 0;

    // nec variable = nec limit minus recurring items in NEC jar
    const necRecurring = recurringExpenses
      .filter((r) => r.isActive && r.jarId === 'nec')
      .reduce((sum, r) => sum + r.amount, 0);
    const necVariable = Math.max(0, necTotal - necRecurring);

    return necVariable + play + edu + give;
  }, [jars, recurringExpenses]);

  // Actual Historical Spending Rate from transactions
  const historicalSpendingVelocity = useMemo(() => {
    if (transactions.length === 0) {
      return {
        totalHistoricalSpent: 0,
        monthlyRate: baseVariableBudget,
        dailyRate: Math.round(baseVariableBudget / 30),
        hasHistory: false,
        txCount: 0,
      };
    }

    const totalSpent = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
    // Find unique days or date range
    const uniqueDays = new Set(transactions.map((t) => t.date)).size;
    const effectiveDays = Math.max(1, uniqueDays);
    const dailyRate = Math.round(totalSpent / effectiveDays);
    const estimatedMonthly = Math.round(dailyRate * 30);

    return {
      totalHistoricalSpent: totalSpent,
      monthlyRate: estimatedMonthly > 0 ? estimatedMonthly : baseVariableBudget,
      dailyRate,
      hasHistory: true,
      txCount: transactions.length,
    };
  }, [transactions, baseVariableBudget]);

  // Compute 3 to 6 months forecast based on scenario ('tight' | 'normal' | 'splurge')
  const forecastData: ForecastMonthData[] = useMemo(() => {
    const months: ForecastMonthData[] = [];
    let currentBalance = startingLiquidCapital;

    // Multipliers based on requested scenarios:
    // 'tight': Thắt lưng buộc bụng (-35% chi tiêu biến đổi so với thực tế, tăng tích lũy)
    // 'normal': Bình thường (theo nhịp độ chi tiêu thực tế)
    // 'splurge': Thả ga (+45% chi tiêu biến đổi so với thực tế)
    let incomeMultiplier = 1.0;
    let variableMultiplier = 1.0;
    let savingsGrowthRate = 1.0;

    if (scenario === 'tight' || scenario === 'optimistic') {
      incomeMultiplier = 1.05; // Cày thêm một chút
      variableMultiplier = 0.65; // Cắt giảm 35% chi phí biến đổi
      savingsGrowthRate = 1.25; // Tối đa hóa tích lũy
    } else if (scenario === 'splurge' || scenario === 'pessimistic') {
      incomeMultiplier = 1.0;
      variableMultiplier = 1.45; // Chi tiêu thả ga +45%
      savingsGrowthRate = 0.55; // Giảm tích lũy để bù tiêu
    } else {
      // 'normal' or 'neutral'
      incomeMultiplier = 1.0;
      variableMultiplier = 1.0;
      savingsGrowthRate = 1.0;
    }

    const baseMonthlyIncome = hourlyWage * monthlyWorkHours;
    const baseVariableToUse = historicalSpendingVelocity.hasHistory
      ? historicalSpendingVelocity.monthlyRate
      : baseVariableBudget;

    const today = new Date();

    for (let i = 1; i <= forecastHorizon; i++) {
      const forecastDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const monthLabel = `Tháng ${forecastDate.getMonth() + 1}/${forecastDate.getFullYear()}`;

      const expectedIncome = Math.round(baseMonthlyIncome * incomeMultiplier);
      const recurringFixed = activeRecurringMonthly;
      const variableExpenses = Math.round(baseVariableToUse * variableMultiplier);
      const savingsAllocated = Math.round(monthlySavingsTarget * savingsGrowthRate);

      const totalExpenses = recurringFixed + variableExpenses + savingsAllocated;
      const netCashFlow = expectedIncome - totalExpenses;

      const startingBal = currentBalance;
      const endingBal = startingBal + netCashFlow;

      // Danger threshold: less than 1 month essential living costs
      const essentialMonthlyNeeds = recurringFixed + (baseVariableToUse * 0.5);
      const hasDeficitRisk = endingBal < essentialMonthlyNeeds;

      let warningNote: string | undefined;
      if (endingBal < 0) {
        warningNote = `Nguy cơ thâm hụt âm ${Math.abs(endingBal).toLocaleString('vi-VN')} đ! Không đủ tiền chi trả!`;
      } else if (hasDeficitRisk) {
        warningNote = `Dưới ngưỡng an toàn dự phòng (${essentialMonthlyNeeds.toLocaleString('vi-VN')} đ)!`;
      }

      months.push({
        monthIndex: i,
        monthLabel,
        expectedIncome,
        recurringFixed,
        variableExpenses,
        savingsAllocated,
        totalExpenses,
        netCashFlow,
        startingBalance: startingBal,
        endingBalance: endingBal,
        hasDeficitRisk,
        warningNote,
      });

      // Pass ending balance to next month
      currentBalance = endingBal;
    }

    return months;
  }, [
    hourlyWage,
    monthlyWorkHours,
    startingLiquidCapital,
    activeRecurringMonthly,
    baseVariableBudget,
    historicalSpendingVelocity,
    monthlySavingsTarget,
    forecastHorizon,
    scenario,
  ]);

  // Overall Deficit Warning Check
  const worstMonth = forecastData.find((m) => m.endingBalance < 0) || forecastData.find((m) => m.hasDeficitRisk);
  const totalProjectedNet = forecastData.reduce((sum, m) => sum + m.netCashFlow, 0);
  const totalProjectedSavings = forecastData.reduce((sum, m) => sum + m.savingsAllocated, 0);

  const handleAddRecurringSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(recAmountStr);
    if (!recName.trim() || !amount || amount <= 0) {
      alert('Vui lòng điền đầy đủ thông tin hóa đơn định kỳ!');
      return;
    }

    onAddRecurringExpense({
      name: recName.trim(),
      amount,
      jarId: recJarId,
      dayOfMonth: recDay,
      icon: recIcon || '⚡',
      isActive: true,
      category: recCategory || 'Hóa đơn định kỳ',
    });

    playCashRegister();
    setRecName('');
    setRecAmountStr('');
    setShowAddRecurring(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner: Forecast Control Panel */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-pink-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2 rounded-2xl bg-gradient-to-tr from-pink-100 to-purple-100 border border-pink-200">
              🔮
            </span>
            <div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                DỰ BÁO DÒNG TIỀN TƯƠNG LAI (3 - 6 THÁNG)
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                Mô phỏng dòng tiền theo các kịch bản thực tế dựa trên lịch sử chi tiêu từ quầy thu ngân
              </p>
            </div>
          </div>

          {/* Forecast Horizon Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-2xl self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                playSoftPop();
                setForecastHorizon(3);
              }}
              className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all ${
                forecastHorizon === 3
                  ? 'bg-white text-pink-600 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              3 Tháng Tới
            </button>
            <button
              type="button"
              onClick={() => {
                playSoftPop();
                setForecastHorizon(6);
              }}
              className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all ${
                forecastHorizon === 6
                  ? 'bg-white text-pink-600 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              6 Tháng Tới ✨
            </button>
          </div>
        </div>

        {/* Input variables: Hourly wage & Monthly work hours */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-gray-100 text-xs">
          <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200/80 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-amber-800 block">LƯƠNG HÀNG GIỜ:</span>
              <span className="text-base font-black text-amber-950">
                {hourlyWage.toLocaleString('vi-VN')} đ/h
              </span>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={1000}
                step={5000}
                value={hourlyWage}
                onChange={(e) => setHourlyWage(Number(e.target.value) || 0)}
                className="w-16 px-1.5 py-1 bg-white border border-amber-300 rounded-lg text-xs font-bold text-center"
              />
              <span className="text-amber-700 font-bold">đ</span>
            </div>
          </div>

          <div className="p-3 bg-purple-50/70 rounded-2xl border border-purple-200/80 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-purple-800 block">GIỜ LÀM VIỆC / THÁNG:</span>
              <span className="text-base font-black text-purple-950">
                {monthlyWorkHours} giờ <span className="text-xs font-normal opacity-70">(~{(monthlyWorkHours / 8).toFixed(0)} ngày)</span>
              </span>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={20}
                max={300}
                step={8}
                value={monthlyWorkHours}
                onChange={(e) => setMonthlyWorkHours(Number(e.target.value) || 160)}
                className="w-16 px-1.5 py-1 bg-white border border-purple-300 rounded-lg text-xs font-bold text-center"
              />
              <span className="text-purple-700 font-bold">h</span>
            </div>
          </div>

          <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-emerald-800 block">THU NHẬP CƠ BẢN DỰ KIẾN:</span>
              <span className="text-base font-black text-emerald-950">
                {(hourlyWage * monthlyWorkHours).toLocaleString('vi-VN')} đ
              </span>
            </div>
            <span className="text-xl">💰</span>
          </div>
        </div>

        {/* Historical Spending Velocity Indicator */}
        <div className="p-3 bg-pink-50/60 rounded-2xl border border-pink-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-base">📊</span>
            <div>
              <span className="font-bold text-gray-800">
                Tốc độ chi tiêu thực tế từ lịch sử giao dịch ({historicalSpendingVelocity.txCount} đơn):
              </span>
              <span className="text-gray-500 block text-[11px]">
                {historicalSpendingVelocity.hasHistory
                  ? `Dựa trên các lần quét mã: ~${historicalSpendingVelocity.dailyRate.toLocaleString('vi-VN')} đ/ngày (~${historicalSpendingVelocity.monthlyRate.toLocaleString('vi-VN')} đ/tháng)`
                  : 'Chưa có nhiều lịch sử quét mã, hệ thống đang dùng định mức cơ bản các hũ để mô phỏng'}
              </span>
            </div>
          </div>
          <span className="text-xs font-black text-purple-800 bg-white px-3 py-1 rounded-xl border border-purple-200 self-start sm:self-auto shrink-0">
            {historicalSpendingVelocity.monthlyRate.toLocaleString('vi-VN')} đ / tháng
          </span>
        </div>

        {/* REQUESTED SCENARIO SELECTOR: 'Thắt lưng buộc bụng', 'Bình thường', 'Thả ga' */}
        <div className="pt-2">
          <label className="block text-xs font-bold text-gray-700 mb-2">
            CHỌN KỊCH BẢN XEM TRƯỚC DÒNG TIỀN THEO HÀNH VI CHI TIÊU:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Thắt lưng buộc bụng */}
            <button
              type="button"
              onClick={() => {
                playSoftPop();
                setScenario('tight');
              }}
              className={`p-3.5 rounded-2xl border-2 text-left transition-all ${
                scenario === 'tight' || scenario === 'optimistic'
                  ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300 shadow-xs'
                  : 'bg-gray-50/70 hover:bg-emerald-50/40 border-gray-200 text-gray-600'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-black text-xs text-emerald-900 flex items-center gap-1.5">
                  <span className="text-base">🔒</span> THẮT LƯNG BUỘC BỤNG
                </span>
                <span className="text-[10px] bg-emerald-200 text-emerald-900 font-extrabold px-2 py-0.5 rounded-md">
                  Tiết giảm -35%
                </span>
              </div>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                Cắt giảm triệt để mua sắm hưởng thụ, chỉ giữ lại nhu cầu thiết yếu và hóa đơn cố định. Tiết kiệm tối đa!
              </p>
            </button>

            {/* 2. Bình thường */}
            <button
              type="button"
              onClick={() => {
                playSoftPop();
                setScenario('normal');
              }}
              className={`p-3.5 rounded-2xl border-2 text-left transition-all ${
                scenario === 'normal' || scenario === 'neutral'
                  ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-300 shadow-xs'
                  : 'bg-gray-50/70 hover:bg-blue-50/40 border-gray-200 text-gray-600'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-black text-xs text-blue-900 flex items-center gap-1.5">
                  <span className="text-base">⚖️</span> BÌNH THƯỜNG
                </span>
                <span className="text-[10px] bg-blue-200 text-blue-900 font-extrabold px-2 py-0.5 rounded-md">
                  Theo thực tế (100%)
                </span>
              </div>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                Duy trì mức chi tiêu trung bình đều đặn dựa trên lịch sử quét mã và phân bổ theo 6 hũ tiêu chuẩn.
              </p>
            </button>

            {/* 3. Thả ga */}
            <button
              type="button"
              onClick={() => {
                playSoftPop();
                setScenario('splurge');
              }}
              className={`p-3.5 rounded-2xl border-2 text-left transition-all ${
                scenario === 'splurge' || scenario === 'pessimistic'
                  ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-300 shadow-xs'
                  : 'bg-gray-50/70 hover:bg-rose-50/40 border-gray-200 text-gray-600'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-black text-xs text-rose-900 flex items-center gap-1.5">
                  <span className="text-base">🛍️</span> THẢ GA
                </span>
                <span className="text-[10px] bg-rose-200 text-rose-900 font-extrabold px-2 py-0.5 rounded-md">
                  Vung tay +45%
                </span>
              </div>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                Tăng mạnh chi tiêu vui chơi, du lịch, mua sắm bốc đồng. Xem trước xem bao lâu nữa tiền dự phòng sẽ cạn!
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* DEFICIT RISK EARLY WARNING BOX */}
      {worstMonth && (
        <div
          className={`p-4 sm:p-5 rounded-3xl border-2 transition-all shadow-xs ${
            worstMonth.endingBalance < 0
              ? 'bg-rose-50/90 border-rose-300 text-rose-950'
              : 'bg-amber-50/90 border-amber-300 text-amber-950'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white rounded-2xl shadow-2xs shrink-0 mt-0.5">
              <AlertTriangle className={`w-6 h-6 ${worstMonth.endingBalance < 0 ? 'text-rose-600' : 'text-amber-600'}`} />
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-sm sm:text-base">
                  CẢNH BÁO NGUY CƠ THIẾU HỤT TÀI CHÍNH: {worstMonth.monthLabel.toUpperCase()}
                </h3>
                <span className="text-[11px] font-bold px-2.5 py-0.5 bg-white rounded-full border">
                  Kịch bản: {scenario === 'tight' ? 'THẮT LƯNG BUỘC BỤNG' : scenario === 'splurge' ? 'THẢ GA' : 'BÌNH THƯỜNG'}
                </span>
              </div>
              <p className="text-xs font-medium leading-relaxed">
                {worstMonth.warningNote} Nếu tiếp tục duy trì mức chi tiêu này, dòng tiền dự phòng của bạn sẽ chạm ngưỡng rủi ro vào {worstMonth.monthLabel}.
              </p>

              {/* Actionable Remedies */}
              <div className="pt-2">
                <span className="text-[11px] font-black uppercase tracking-wider block mb-1">
                  🛠️ GỢI Ý HÀNH ĐỘNG KHẮC PHỤC NGAY:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="bg-white/80 p-2.5 rounded-xl border border-black/5">
                    <strong>1. Chuyển sang Thắt lưng buộc bụng:</strong> Cắt giảm các món ăn ngoài và mua sắm không cần thiết.
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-xl border border-black/5">
                    <strong>2. Tăng giờ làm việc:</strong> Cần làm thêm khoảng{' '}
                    <span className="text-purple-700 font-bold">
                      {Math.ceil(Math.abs(worstMonth.netCashFlow) / (hourlyWage || 1))} giờ
                    </span>{' '}
                    để cân bằng lại dòng tiền.
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-xl border border-black/5">
                    <strong>3. Sử dụng Giỏ Chờ Đắn Đo:</strong> Tạm hoãn các khoản chi tiêu muốn mua trong 14 ngày.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MONTHLY PROJECTION CARDS (3 - 6 Months Timeline) */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-pink-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
              <span>📅</span> CHI TIẾT DÒNG TIỀN THEO TỪNG THÁNG ({forecastHorizon} THÁNG TỚI)
            </h3>
            <span className="text-xs text-gray-500 font-medium">
              Vốn ban đầu: <strong>{startingLiquidCapital.toLocaleString('vi-VN')} đ</strong> · Kịch bản:{' '}
              <strong className="text-purple-700">
                {scenario === 'tight' ? 'Thắt Lưng Buộc Bụng' : scenario === 'splurge' ? 'Thả Ga' : 'Bình Thường'}
              </strong>
            </span>
          </div>

          <div className="text-right">
            <span className="text-xs text-gray-500 block">Dòng tiền ròng tích lũy cả kỳ:</span>
            <span
              className={`text-lg font-black tabular-nums ${
                totalProjectedNet >= 0 ? 'text-emerald-700' : 'text-rose-600'
              }`}
            >
              {totalProjectedNet >= 0 ? '+' : ''}
              {totalProjectedNet.toLocaleString('vi-VN')} đ
            </span>
          </div>
        </div>

        {/* Visual Forecast Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {forecastData.map((m) => {
            const isPositiveNet = m.netCashFlow >= 0;
            const isOverdraw = m.endingBalance < 0;

            return (
              <div
                key={m.monthIndex}
                className={`p-4 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                  isOverdraw
                    ? 'bg-rose-50/60 border-rose-300'
                    : m.hasDeficitRisk
                    ? 'bg-amber-50/60 border-amber-300'
                    : 'bg-white hover:bg-pink-50/30 border-gray-200'
                }`}
              >
                <div>
                  {/* Month Header */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-sm text-gray-800">{m.monthLabel}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isOverdraw
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : m.hasDeficitRisk
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      }`}
                    >
                      {isOverdraw ? 'THÂM HỤT ⚠️' : m.hasDeficitRisk ? 'CẢNH BÁO ⚡' : 'AN TOÀN ✨'}
                    </span>
                  </div>

                  {/* Flow items */}
                  <div className="space-y-1.5 text-xs font-medium text-gray-600 border-y border-gray-100 py-2 my-2">
                    <div className="flex justify-between items-center">
                      <span>Thu nhập dự kiến:</span>
                      <strong className="text-gray-900 tabular-nums">
                        +{m.expectedIncome.toLocaleString('vi-VN')} đ
                      </strong>
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-gray-500 pl-2">
                      <span>- Hóa đơn định kỳ:</span>
                      <span className="tabular-nums">-{m.recurringFixed.toLocaleString('vi-VN')} đ</span>
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-gray-500 pl-2">
                      <span>- Chi sinh hoạt ({scenario === 'tight' ? '-35%' : scenario === 'splurge' ? '+45%' : 'chuẩn'}):</span>
                      <span className="tabular-nums font-bold">-{m.variableExpenses.toLocaleString('vi-VN')} đ</span>
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-purple-700 pl-2 font-semibold">
                      <span>- Tích lũy hũ tiết kiệm (LTSS & FFA):</span>
                      <span className="tabular-nums">-{m.savingsAllocated.toLocaleString('vi-VN')} đ</span>
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-gray-100 font-bold">
                      <span className="text-gray-700">Dòng tiền ròng (Net):</span>
                      <span
                        className={`tabular-nums ${
                          isPositiveNet ? 'text-emerald-700' : 'text-rose-600'
                        }`}
                      >
                        {isPositiveNet ? '+' : ''}
                        {m.netCashFlow.toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ending Balance */}
                <div className="pt-1 flex items-center justify-between text-xs">
                  <span className="text-gray-500 font-semibold">Số dư cuối tháng:</span>
                  <span
                    className={`text-sm font-black tabular-nums ${
                      isOverdraw
                        ? 'text-rose-700'
                        : m.hasDeficitRisk
                        ? 'text-amber-800'
                        : 'text-gray-900'
                    }`}
                  >
                    {m.endingBalance.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RECURRING EXPENSES MANAGER (Hóa đơn định kỳ: tiền nhà, điện nước, internet...) */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-purple-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚡</span>
              <h3 className="font-extrabold text-base text-purple-900 tracking-tight">
                DANH MỤC GIAO DỊCH ĐỊNH KỲ HÀNG THÁNG
              </h3>
            </div>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Các khoản chi cố định tự động trừ mỗi tháng: tiền nhà, điện nước, mạng internet, các gói cước...
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-bold bg-purple-50 text-purple-800 px-3 py-1.5 rounded-2xl border border-purple-200">
              Tổng định kỳ: <strong>{activeRecurringMonthly.toLocaleString('vi-VN')} đ/tháng</strong>
            </span>
            <button
              type="button"
              onClick={() => {
                playSoftPop();
                setShowAddRecurring(!showAddRecurring);
              }}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl text-xs flex items-center gap-1 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddRecurring ? 'Đóng' : 'Thêm Khoản Định Kỳ'}</span>
            </button>
          </div>
        </div>

        {/* Add Recurring Form */}
        {showAddRecurring && (
          <form
            onSubmit={handleAddRecurringSubmit}
            className="p-4 bg-purple-50/60 rounded-2xl border border-purple-200 space-y-3 animate-fadeIn text-xs"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-gray-700 block mb-1">TÊN KHOẢN ĐỊNH KỲ *</label>
                <input
                  type="text"
                  placeholder="VD: Tiền trọ, Tiền điện, Cước Netflix..."
                  value={recName}
                  onChange={(e) => setRecName(e.target.value)}
                  className="w-full p-2.5 bg-white border border-purple-200 rounded-xl font-bold"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">SỐ TIỀN / THÁNG (VNĐ) *</label>
                <input
                  type="number"
                  placeholder="VD: 650000"
                  value={recAmountStr}
                  onChange={(e) => setRecAmountStr(e.target.value)}
                  className="w-full p-2.5 bg-white border border-purple-200 rounded-xl font-bold"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-gray-700 block mb-1">THUỘC HŨ NÀO?</label>
                <select
                  value={recJarId}
                  onChange={(e) => setRecJarId(e.target.value)}
                  className="w-full p-2.5 bg-white border border-purple-200 rounded-xl font-bold"
                >
                  {jars.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.icon} {j.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">NGÀY TRỪ TIỀN TRONG THÁNG</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={recDay}
                  onChange={(e) => setRecDay(Number(e.target.value) || 1)}
                  className="w-full p-2.5 bg-white border border-purple-200 rounded-xl font-bold text-center"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">ICON BIỂU TƯỢNG</label>
                <input
                  type="text"
                  value={recIcon}
                  onChange={(e) => setRecIcon(e.target.value)}
                  className="w-full p-2.5 bg-white border border-purple-200 rounded-xl font-bold text-center"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddRecurring(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl font-bold"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-xs"
              >
                Lưu Hóa Đơn Định Kỳ 💾
              </button>
            </div>
          </form>
        )}

        {/* List of Recurring Expenses */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {recurringExpenses.map((rec) => {
            const jar = jars.find((j) => j.id === rec.jarId);
            return (
              <div
                key={rec.id}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between text-xs ${
                  rec.isActive
                    ? 'bg-purple-50/40 border-purple-200/90'
                    : 'bg-gray-50 border-gray-200 opacity-60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl p-1 bg-white rounded-xl shadow-2xs border border-black/5">
                    {rec.icon}
                  </span>
                  <div>
                    <div className="font-extrabold text-gray-900 flex items-center gap-1.5">
                      <span>{rec.name}</span>
                      <span className="text-[10px] text-gray-400 font-normal">
                        ({jar?.code || 'NEC'})
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-500 font-medium">
                      Hàng tháng ngày {rec.dayOfMonth} · {rec.category}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="font-black text-purple-900 tabular-nums">
                      {rec.amount.toLocaleString('vi-VN')} đ
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        playSoftPop();
                        onToggleRecurringExpense(rec.id);
                      }}
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        rec.isActive ? 'text-emerald-700 bg-emerald-100' : 'text-gray-500 bg-gray-200'
                      }`}
                    >
                      {rec.isActive ? 'Đang kích hoạt' : 'Tạm tắt'}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Xác nhận xóa khoản định kỳ "${rec.name}"?`)) {
                        onDeleteRecurringExpense(rec.id);
                      }
                    }}
                    className="p-1 text-gray-300 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
