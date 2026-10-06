import React, { useState, useMemo } from 'react';
import { Transaction, Jar, Wallet, MoodId } from '../types';
import { MOODS } from '../utils/storage';
import { Trash2, Edit2, Search, Filter, Printer, Calendar, X, Check, Sparkles, AlertCircle } from 'lucide-react';
import { playSoftPop, playCashRegister } from '../utils/audio';

interface ReceiptHistoryProps {
  transactions: Transaction[];
  jars: Jar[];
  wallets: Wallet[];
  hourlyWage: number;
  onDeleteTransaction: (id: string) => void;
  onEditTransaction: (updatedTx: Transaction) => void;
}

export const ReceiptHistory: React.FC<ReceiptHistoryProps> = ({
  transactions,
  jars,
  wallets,
  hourlyWage,
  onDeleteTransaction,
  onEditTransaction,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedJarFilter, setSelectedJarFilter] = useState<string>('all');
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<string>('all');
  
  // Date filter state
  const [dateFilterPreset, setDateFilterPreset] = useState<'all' | 'today' | '7days' | 'thisMonth' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Edit transaction state
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editAmountStr, setEditAmountStr] = useState<string>('');
  const [editJarId, setEditJarId] = useState<string>('nec');
  const [editSubCategory, setEditSubCategory] = useState<string>('');
  const [editWalletId, setEditWalletId] = useState<string>('cash');
  const [editMood, setEditMood] = useState<MoodId>('love');
  const [editNote, setEditNote] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const currentMonthStr = useMemo(() => todayStr.slice(0, 7), [todayStr]);
  const sevenDaysAgoStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  }, []);

  // Filter transactions with date filter logic
  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      // Jar filter
      if (selectedJarFilter !== 'all' && t.jarId !== selectedJarFilter) return false;
      
      // Mood filter
      if (selectedMoodFilter !== 'all' && t.mood !== selectedMoodFilter) return false;

      // Date preset filter
      if (dateFilterPreset === 'today' && t.date !== todayStr) return false;
      if (dateFilterPreset === '7days' && (t.date < sevenDaysAgoStr || t.date > todayStr)) return false;
      if (dateFilterPreset === 'thisMonth' && !t.date.startsWith(currentMonthStr)) return false;
      if (dateFilterPreset === 'custom') {
        if (customStartDate && t.date < customStartDate) return false;
        if (customEndDate && t.date > customEndDate) return false;
      }

      // Search keyword
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSub = t.subCategory.toLowerCase().includes(q);
        const matchNote = t.note?.toLowerCase().includes(q);
        return matchSub || matchNote;
      }

      return true;
    });
  }, [
    transactions,
    selectedJarFilter,
    selectedMoodFilter,
    dateFilterPreset,
    customStartDate,
    customEndDate,
    searchQuery,
    todayStr,
    sevenDaysAgoStr,
    currentMonthStr,
  ]);

  // Mood calculations on current filtered or total set
  const totalTxCount = filtered.length;
  const moodBreakdown = MOODS.map((m) => {
    const count = filtered.filter((t) => t.mood === m.id).length;
    const pct = totalTxCount > 0 ? Math.round((count / totalTxCount) * 100) : 0;
    const totalAmount = filtered
      .filter((t) => t.mood === m.id)
      .reduce((sum, t) => sum + t.amount, 0);
    return { ...m, count, pct, totalAmount };
  });

  const totalFilteredAmount = filtered.reduce((sum, t) => sum + t.amount, 0);
  const totalFilteredHours = (totalFilteredAmount / (hourlyWage || 1)).toFixed(1);

  const handlePrint = () => {
    playSoftPop();
    window.print();
  };

  const handleOpenEdit = (tx: Transaction) => {
    playSoftPop();
    setEditingTx(tx);
    setEditAmountStr(String(tx.amount));
    setEditJarId(tx.jarId);
    setEditSubCategory(tx.subCategory);
    setEditWalletId(tx.walletId);
    setEditMood(tx.mood);
    setEditNote(tx.note || '');
    setEditDate(tx.date);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    const newAmount = Number(editAmountStr);
    if (!newAmount || newAmount <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ!');
      return;
    }

    const updated: Transaction = {
      ...editingTx,
      amount: newAmount,
      jarId: editJarId,
      subCategory: editSubCategory,
      walletId: editWalletId,
      mood: editMood,
      note: editNote.trim(),
      date: editDate,
      workHours: Number((newAmount / (hourlyWage || 1)).toFixed(1)),
    };

    onEditTransaction(updated);
    playCashRegister();
    setEditingTx(null);
  };

  const currentEditJar = jars.find((j) => j.id === editJarId) || jars[0];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Mood Analysis Dashboard */}
      <div className="bg-white p-5 rounded-3xl border border-pink-200/90 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <h3 className="font-extrabold text-sm text-gray-800">
              BÁO CÁO CẢM XÚC TIÊU TIỀN {dateFilterPreset === 'all' ? 'TẤT CẢ' : 'KHOẢNG NGÀY ĐÃ CHỌN'}
            </h3>
          </div>
          <span className="text-xs text-gray-400 font-semibold">
            {totalTxCount} giao dịch hiển thị
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {moodBreakdown.map((mb) => (
            <div
              key={mb.id}
              onClick={() => {
                playSoftPop();
                setSelectedMoodFilter(selectedMoodFilter === mb.id ? 'all' : mb.id);
              }}
              className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                selectedMoodFilter === mb.id
                  ? 'ring-2 ring-purple-400 shadow-sm scale-102'
                  : 'hover:bg-gray-50'
              } ${mb.color}`}
            >
              <span className="text-2xl block">{mb.icon}</span>
              <div className="font-extrabold text-xs mt-1 text-gray-800">{mb.label}</div>
              <div className="text-lg font-black mt-0.5 tracking-tight">{mb.pct}%</div>
              <div className="text-[10px] text-gray-500 font-medium">
                {mb.count} món · {mb.totalAmount.toLocaleString('vi-VN')} đ
              </div>
            </div>
          ))}
        </div>

        {/* Thoughtful reflection advice */}
        {moodBreakdown.find((m) => m.id === 'regret')?.pct! > 20 && (
          <div className="mt-3 p-3 bg-purple-50 rounded-2xl border border-purple-200 flex items-center gap-2 text-xs text-purple-900 font-medium">
            <AlertCircle className="w-4 h-4 text-purple-600 shrink-0" />
            <span>
              Cảnh báo: Khoản chi hối hận chiếm hơn 20%! Hãy sử dụng <strong>Giỏ Chờ Đắn Đo 30 Ngày</strong> để hạ nhiệt trước khi quẹt thẻ nhé!
            </span>
          </div>
        )}
      </div>

      {/* FILTER TOOLBAR: DATEPICKER RANGE & JARS & MOODS & SEARCH */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-200/80 shadow-xs space-y-3.5 text-xs">
        {/* Row 1: Dedicated DatePicker Range Section */}
        <div className="p-3.5 bg-gradient-to-r from-pink-50/70 via-purple-50/50 to-pink-50/70 rounded-2xl border border-pink-200/80 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white rounded-xl shadow-2xs text-pink-600">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="font-black text-gray-900 text-xs tracking-tight">
                  BỘ LỌC KHOẢNG THỜI GIAN (DATEPICKER RANGE)
                </span>
                <span className="text-[11px] text-gray-500 block">
                  Chọn khoảng ngày tùy chỉnh để tra cứu lại các giao dịch chi tiêu cũ
                </span>
              </div>
            </div>

            {/* Quick Range Presets */}
            <div className="flex flex-wrap items-center gap-1 font-bold">
              <button
                type="button"
                onClick={() => {
                  playSoftPop();
                  setDateFilterPreset('all');
                  setCustomStartDate('');
                  setCustomEndDate('');
                }}
                className={`px-2.5 py-1 rounded-xl transition-all ${
                  dateFilterPreset === 'all'
                    ? 'bg-pink-500 text-white shadow-2xs'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => {
                  playSoftPop();
                  setDateFilterPreset('today');
                  setCustomStartDate(todayStr);
                  setCustomEndDate(todayStr);
                }}
                className={`px-2.5 py-1 rounded-xl transition-all ${
                  dateFilterPreset === 'today'
                    ? 'bg-pink-500 text-white shadow-2xs'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                Hôm nay
              </button>
              <button
                type="button"
                onClick={() => {
                  playSoftPop();
                  setDateFilterPreset('7days');
                  setCustomStartDate(sevenDaysAgoStr);
                  setCustomEndDate(todayStr);
                }}
                className={`px-2.5 py-1 rounded-xl transition-all ${
                  dateFilterPreset === '7days'
                    ? 'bg-pink-500 text-white shadow-2xs'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                7 ngày qua
              </button>
              <button
                type="button"
                onClick={() => {
                  playSoftPop();
                  setDateFilterPreset('thisMonth');
                  setCustomStartDate(`${currentMonthStr}-01`);
                  setCustomEndDate(todayStr);
                }}
                className={`px-2.5 py-1 rounded-xl transition-all ${
                  dateFilterPreset === 'thisMonth'
                    ? 'bg-pink-500 text-white shadow-2xs'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                Tháng này
              </button>
            </div>
          </div>

          {/* Interactive Start Date and End Date Pickers */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-pink-200/50">
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-pink-200 shadow-2xs">
              <span className="font-bold text-gray-600 text-[11px]">Từ ngày:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => {
                  setCustomStartDate(e.target.value);
                  setDateFilterPreset('custom');
                }}
                className="font-bold text-gray-800 text-xs focus:outline-none"
              />
            </div>

            <span className="text-gray-400 font-bold">➔</span>

            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-pink-200 shadow-2xs">
              <span className="font-bold text-gray-600 text-[11px]">Đến ngày:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => {
                  setCustomEndDate(e.target.value);
                  setDateFilterPreset('custom');
                }}
                className="font-bold text-gray-800 text-xs focus:outline-none"
              />
            </div>

            {/* Clear Range Button */}
            {(customStartDate || customEndDate || dateFilterPreset !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  playSoftPop();
                  setCustomStartDate('');
                  setCustomEndDate('');
                  setDateFilterPreset('all');
                }}
                className="px-2.5 py-1.5 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 border border-rose-200 font-bold rounded-xl text-[11px] transition-colors flex items-center gap-1 shadow-2xs"
              >
                <X className="w-3 h-3" />
                <span>Xóa lọc ngày</span>
              </button>
            )}

            {/* Active Range Summary */}
            <div className="ml-auto text-[11px] font-semibold text-gray-500">
              Đang hiển thị: <strong className="text-pink-700">{filtered.length}</strong> giao dịch
            </div>
          </div>
        </div>

        {/* Row 2: Search & Jar & Mood dropdowns & Print */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto flex-1">
            {/* Search bar */}
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm món đồ, ghi chú..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-pink-400"
              />
            </div>

            {/* Jar filter */}
            <select
              value={selectedJarFilter}
              onChange={(e) => setSelectedJarFilter(e.target.value)}
              className="py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-700 focus:outline-none"
            >
              <option value="all">Tất cả 6 hũ</option>
              {jars.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.name}
                </option>
              ))}
            </select>

            {/* Mood filter */}
            <select
              value={selectedMoodFilter}
              onChange={(e) => setSelectedMoodFilter(e.target.value)}
              className="py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-700 focus:outline-none"
            >
              <option value="all">Mọi tâm trạng</option>
              {MOODS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.icon} {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Action: Print */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl flex items-center gap-1.5 transition-colors self-end sm:self-auto shrink-0"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>In Phiếu</span>
          </button>
        </div>
      </div>

      {/* REALISTIC THERMAL SUPERMARKET RECEIPT */}
      <div className="max-w-2xl mx-auto">
        {/* Receipt Container with Sawtooth edge effect */}
        <div className="relative bg-white rounded-t-3xl shadow-md border-x-2 border-t-2 border-gray-200 overflow-hidden print:border-none print:shadow-none">
          {/* Header */}
          <div className="p-6 text-center border-b-2 border-dashed border-gray-300">
            <div className="inline-block p-2 rounded-2xl bg-pink-50 border border-pink-200 text-2xl mb-2">
              🛒
            </div>
            <h2 className="text-xl font-black tracking-wider text-gray-900">
              HAPPY MART SUPERSTORE
            </h2>
            <div className="text-[11px] text-gray-500 font-mono mt-0.5">
              CN: Tự Do Tài Chính · Quầy Thu Ngân Số 01
            </div>
            <div className="text-[11px] text-gray-500 font-mono">
              Ngày kiểm toán: {new Date().toLocaleDateString('vi-VN')}
            </div>

            <div className="my-3 py-1.5 border-y border-dashed border-gray-200 text-xs font-mono font-bold text-gray-600">
              *** PHIẾU THANH TOÁN CHI TIÊU & TÂM LÝ ***
            </div>
          </div>

          {/* Table Items */}
          <div className="p-4 sm:p-6">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-400 font-medium">
                <span className="text-3xl block mb-2">🛍️</span>
                {transactions.length === 0
                  ? 'Chưa có giao dịch nào được ghi nhận! Hãy quét món đầu tiên tại tab "Quét Thu Chi" 🛒✨'
                  : 'Không tìm thấy giao dịch nào phù hợp với bộ lọc ngày hoặc từ khóa!'}
              </div>
            ) : (
              <div className="space-y-3 font-mono">
                <div className="grid grid-cols-12 text-[11px] font-bold text-gray-400 pb-2 border-b border-gray-200">
                  <span className="col-span-5">MÓN ĐỒ / HŨ</span>
                  <span className="col-span-2 text-center">TÂM TRẠNG</span>
                  <span className="col-span-2 text-center">GIỜ LÀM</span>
                  <span className="col-span-3 text-right">SỐ TIỀN / SỬA</span>
                </div>

                {filtered.map((t) => {
                  const jar = jars.find((j) => j.id === t.jarId);
                  const moodObj = MOODS.find((m) => m.id === t.mood);
                  const wallet = wallets.find((w) => w.id === t.walletId);

                  return (
                    <div
                      key={t.id}
                      className="grid grid-cols-12 items-center text-xs py-2 border-b border-gray-100 hover:bg-pink-50/40 rounded-lg px-1 transition-colors group"
                    >
                      <div className="col-span-5">
                        <div className="font-bold text-gray-800 flex items-center gap-1">
                          <span>{t.subCategory}</span>
                        </div>
                        <div className="text-[10px] text-gray-400 truncate">
                          {jar?.name} · {t.date} {wallet?.icon}
                        </div>
                        {t.note && (
                          <div className="text-[10px] text-purple-700 italic truncate">
                            &quot;{t.note}&quot;
                          </div>
                        )}
                      </div>

                      <div className="col-span-2 text-center text-base" title={moodObj?.label}>
                        {moodObj?.icon}
                      </div>

                      <div className="col-span-2 text-center text-[11px] font-bold text-purple-700">
                        ⏱️ {t.workHours}h
                      </div>

                      <div className="col-span-3 text-right flex items-center justify-end gap-1.5">
                        <div className="font-black text-gray-900 tabular-nums">
                          -{t.amount.toLocaleString('vi-VN')} đ
                        </div>

                        {/* EDIT BUTTON (Chỉnh sửa nghiệp vụ chi tiêu) */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(t)}
                          className="p-1 text-gray-400 hover:text-purple-600 transition-colors rounded-md hover:bg-purple-50"
                          title="Chỉnh sửa giao dịch này"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* DELETE BUTTON */}
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Xác nhận xóa giao dịch "${t.subCategory}" và hoàn lại tiền vào ví?`)) {
                              onDeleteTransaction(t.id);
                            }
                          }}
                          className="p-1 text-gray-400 hover:text-rose-600 transition-colors rounded-md hover:bg-rose-50"
                          title="Xóa và hoàn ví"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Receipt Summary Totals */}
            <div className="mt-6 pt-4 border-t-2 border-dashed border-gray-300 space-y-1.5 font-mono text-xs">
              <div className="flex justify-between text-gray-600">
                <span>TỔNG SỐ LƯỢNG MÓN:</span>
                <span className="font-bold">{filtered.length} món</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>TỔNG THỜI GIAN LÀM VIỆC:</span>
                <span className="font-bold text-purple-700">⏱️ {totalFilteredHours} GIỜ</span>
              </div>
              <div className="flex justify-between text-base font-black text-gray-900 pt-2 border-t border-gray-200">
                <span>TỔNG TIỀN ĐÃ CHI:</span>
                <span className="tabular-nums">-{totalFilteredAmount.toLocaleString('vi-VN')} đ</span>
              </div>
            </div>

            {/* Simulated Barcode */}
            <div className="text-center mt-8 pt-4 border-t border-dashed border-gray-300">
              <div className="inline-block space-y-1 font-mono">
                <div className="h-10 w-52 mx-auto bg-repeat-x flex items-stretch gap-0.5 justify-center">
                  {[...Array(28)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-full ${
                        i % 4 === 0 || i % 7 === 0 ? 'w-1 bg-black' : i % 2 === 0 ? 'w-0.5 bg-black' : 'w-1 bg-white'
                      }`}
                    />
                  ))}
                </div>
                <div className="text-[10px] tracking-widest text-gray-500 font-bold">
                  * HAPPY-MART-FIN-{Date.now().toString().slice(-6)} *
                </div>
              </div>
              <div className="text-[11px] text-gray-500 font-semibold mt-3">
                CẢM ƠN QUÝ KHÁCH ĐÃ TIÊU TIỀN TỈNH TÁO! 🥑✨
              </div>
            </div>
          </div>

          {/* Bottom Sawtooth cut */}
          <div className="h-4 bg-white receipt-sawtooth-bottom border-b-2 border-gray-200" />
        </div>
      </div>

      {/* EDIT TRANSACTION MODAL (CHỈNH SỬA CHI TIÊU NẾU BẤM NHẦM) */}
      {editingTx && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border-2 border-purple-200 space-y-4 animate-scaleIn text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-2xl">✏️</span>
                <h3 className="font-black text-base text-gray-900">
                  CHỈNH SỬA GIAO DỊCH CHI TIÊU
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingTx(null)}
                className="p-1 rounded-xl text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              {/* Amount */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  SỐ TIỀN CHI (VNĐ) *
                </label>
                <input
                  type="number"
                  value={editAmountStr}
                  onChange={(e) => setEditAmountStr(e.target.value)}
                  className="w-full text-xl font-black p-3 bg-amber-50/70 border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                  required
                />
              </div>

              {/* Jar & SubCategory */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">HŨ CHI TIÊU</label>
                  <select
                    value={editJarId}
                    onChange={(e) => {
                      const newJ = e.target.value;
                      setEditJarId(newJ);
                      const jarObj = jars.find((j) => j.id === newJ);
                      if (jarObj && jarObj.subs.length > 0) {
                        setEditSubCategory(jarObj.subs[0]);
                      }
                    }}
                    className="w-full p-2.5 bg-gray-50 border rounded-xl font-bold"
                  >
                    {jars.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.icon} {j.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">MỤC CON</label>
                  <select
                    value={editSubCategory}
                    onChange={(e) => setEditSubCategory(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border rounded-xl font-bold"
                  >
                    {currentEditJar.subs.map((s, idx) => (
                      <option key={idx} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Wallet & Date */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">VÍ NGUỒN TIỀN</label>
                  <select
                    value={editWalletId}
                    onChange={(e) => setEditWalletId(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border rounded-xl font-bold"
                  >
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.icon} {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">NGÀY GIAO DỊCH</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border rounded-xl font-bold"
                  />
                </div>
              </div>

              {/* Mood */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">TÂM TRẠNG KHOẢN CHI</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {MOODS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setEditMood(m.id)}
                      className={`p-2 rounded-xl border text-center transition-all ${
                        editMood === m.id
                          ? 'bg-purple-100 border-purple-400 font-bold shadow-xs'
                          : 'bg-gray-50 text-gray-600'
                      }`}
                    >
                      <span className="text-xl block">{m.icon}</span>
                      <span className="text-[10px] block mt-0.5">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">GHI CHÚ</label>
                <input
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Ghi chú món đồ..."
                  className="w-full p-2.5 bg-gray-50 border rounded-xl"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl font-bold"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Lưu Chỉnh Sửa 💾
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
