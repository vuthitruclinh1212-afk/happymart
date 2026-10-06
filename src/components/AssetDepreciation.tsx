import React, { useState } from 'react';
import { AssetDepreciation } from '../types';
import { Plus, Trash2, Smartphone, Laptop, Sparkles, TrendingDown } from 'lucide-react';
import { playCashRegister, playSoftPop } from '../utils/audio';

interface AssetDepreciationProps {
  assets: AssetDepreciation[];
  onAddAsset: (asset: Omit<AssetDepreciation, 'id'>) => void;
  onIncrementUsage: (id: string, days: number) => void;
  onDeleteAsset: (id: string) => void;
}

export const AssetTracker: React.FC<AssetDepreciationProps> = ({
  assets,
  onAddAsset,
  onIncrementUsage,
  onDeleteAsset,
}) => {
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [totalValStr, setTotalValStr] = useState<string>('');
  const [daysPlanStr, setDaysPlanStr] = useState<string>('730');
  const [category, setCategory] = useState<string>('Thiết bị công nghệ');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalVal = Number(totalValStr);
    const daysPlan = Number(daysPlanStr);
    if (!name.trim() || !totalVal || !daysPlan) {
      alert('Vui lòng điền đầy đủ thông tin tài sản!');
      return;
    }

    onAddAsset({
      name: name.trim(),
      totalVal,
      daysPlan,
      daysUsed: 1,
      category,
      purchaseDate: new Date().toISOString().split('T')[0],
    });

    playCashRegister();
    setName('');
    setTotalValStr('');
    setShowAddForm(false);
  };

  return (
    <div className="bg-white p-5 sm:p-6 rounded-3xl border border-sky-200/90 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">💻</span>
            <h3 className="font-extrabold text-base text-sky-800 tracking-tight">
              THEO DÕI KHẤU HAO TÀI SẢN (&quot;VẮT KIỆT GIÁ TRỊ&quot;)
            </h3>
          </div>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Xem những món đồ đắt tiền (Laptop, Điện thoại, Tai nghe...) càng dùng lâu thì chi phí mỗi ngày càng giảm về số 0!
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            playSoftPop();
            setShowAddForm(!showAddForm);
          }}
          className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{showAddForm ? 'Đóng lại' : 'Thêm Món Cần Khấu Hao'}</span>
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <form
          onSubmit={handleSubmit}
          className="p-4 bg-sky-50/60 rounded-2xl border border-sky-200 space-y-3 animate-fadeIn text-xs"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-gray-700 block mb-1">TÊN MÓN ĐỒ / TÀI SẢN *</label>
              <input
                type="text"
                placeholder="VD: MacBook Air M2, iPhone 15, Bàn phím cơ..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2.5 bg-white border border-sky-200 rounded-xl font-bold"
                required
              />
            </div>
            <div>
              <label className="font-bold text-gray-700 block mb-1">GIÁ MUA BAN ĐẦU (VNĐ) *</label>
              <input
                type="number"
                placeholder="VD: 20000000"
                value={totalValStr}
                onChange={(e) => setTotalValStr(e.target.value)}
                className="w-full p-2.5 bg-white border border-sky-200 rounded-xl font-bold"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-gray-700 block mb-1">
                KẾ HOẠCH SỬ DỤNG (SỐ NGÀY)
              </label>
              <select
                value={daysPlanStr}
                onChange={(e) => setDaysPlanStr(e.target.value)}
                className="w-full p-2.5 bg-white border border-sky-200 rounded-xl font-bold"
              >
                <option value="365">1 năm (365 ngày)</option>
                <option value="730">2 năm (730 ngày)</option>
                <option value="1095">3 năm (1.095 ngày)</option>
                <option value="1825">5 năm (1.825 ngày)</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-gray-700 block mb-1">DANH MỤC</label>
              <input
                type="text"
                placeholder="Thiết bị làm việc, Đồ gia dụng..."
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2.5 bg-white border border-sky-200 rounded-xl font-medium"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl font-bold"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-xs"
            >
              Lưu Tài Sản 💾
            </button>
          </div>
        </form>
      )}

      {/* Asset Items List */}
      <div className="space-y-3">
        {assets.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-xs font-semibold">
            Chưa có tài sản nào được theo dõi. Hãy thêm món đồ giá trị cao bạn đang sở hữu để thấy nó rẻ đi từng ngày! 💻
          </div>
        ) : (
          assets.map((asset) => {
            const plannedDailyCost = Math.round(asset.totalVal / (asset.daysPlan || 1));
            const actualDailyCostSoFar = Math.round(asset.totalVal / (asset.daysUsed || 1));
            const pctUsed = Math.min(
              100,
              Math.round((asset.daysUsed / (asset.daysPlan || 1)) * 100)
            );

            return (
              <div
                key={asset.id}
                className="p-4 bg-sky-50/40 hover:bg-sky-50/70 border border-sky-200/90 rounded-2xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-gray-900">{asset.name}</span>
                    <span className="text-[10px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full font-bold">
                      {asset.category}
                    </span>
                  </div>

                  <div className="text-gray-500 font-medium">
                    Giá mua: <strong className="text-gray-800">{asset.totalVal.toLocaleString('vi-VN')} đ</strong> · Đã dùng được{' '}
                    <strong className="text-sky-900">{asset.daysUsed}</strong>/{asset.daysPlan} ngày ({pctUsed}%)
                  </div>

                  {/* Visual Progress bar */}
                  <div className="w-full max-w-md bg-gray-200 h-2.5 rounded-full overflow-hidden p-0.5">
                    <div
                      className="bg-gradient-to-r from-sky-400 to-indigo-500 h-full rounded-full transition-all"
                      style={{ width: `${pctUsed}%` }}
                    />
                  </div>
                </div>

                {/* Depreciation metrics badge */}
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-base font-black text-sky-900 tabular-nums">
                      {actualDailyCostSoFar.toLocaleString('vi-VN')} đ <span className="text-[10px] font-medium text-gray-500">/ ngày</span>
                    </div>
                    <div className="text-[10px] text-emerald-600 font-bold flex items-center justify-end gap-1">
                      <TrendingDown className="w-3 h-3" />
                      Mục tiêu: {plannedDailyCost.toLocaleString('vi-VN')} đ/ngày
                    </div>
                  </div>

                  {/* Fast action: +1 or +7 days */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        playSoftPop();
                        onIncrementUsage(asset.id, 1);
                      }}
                      className="px-2.5 py-1.5 bg-white border border-sky-300 hover:bg-sky-100 text-sky-900 font-bold rounded-xl text-[11px]"
                      title="Cộng 1 ngày đã dùng"
                    >
                      +1 Ngày
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playSoftPop();
                        onIncrementUsage(asset.id, 7);
                      }}
                      className="px-2.5 py-1.5 bg-white border border-sky-300 hover:bg-sky-100 text-sky-900 font-bold rounded-xl text-[11px]"
                      title="Cộng 1 tuần"
                    >
                      +7 Ngày
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Xóa tài sản "${asset.name}"?`)) {
                          onDeleteAsset(asset.id);
                        }
                      }}
                      className="p-1.5 text-gray-300 hover:text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
