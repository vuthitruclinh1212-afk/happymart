import React, { useState } from 'react';
import { WishlistItem } from '../types';
import { Plus, Check, Trash2, Clock, Sparkles, Flame, CheckCircle, ShieldAlert } from 'lucide-react';
import { playScannerBeep, playCashRegister, playSoftPop } from '../utils/audio';
import { triggerConfetti } from '../utils/confetti';

interface CoolingWishlistProps {
  wishlist: WishlistItem[];
  onAddWishlistItem: (item: Omit<WishlistItem, 'id' | 'daysPassed' | 'createdAt'>) => void;
  onAdvanceDay: (id: string) => void;
  onConvertToExpense: (item: WishlistItem) => void;
  onCancelAndSave: (item: WishlistItem) => void;
  onDeleteItem: (id: string) => void;
}

export const CoolingWishlist: React.FC<CoolingWishlistProps> = ({
  wishlist,
  onAddWishlistItem,
  onAdvanceDay,
  onConvertToExpense,
  onCancelAndSave,
  onDeleteItem,
}) => {
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [priceStr, setPriceStr] = useState<string>('');
  const [type, setType] = useState<'need' | 'want'>('want');
  const [daysPlanned, setDaysPlanned] = useState<number>(14);
  const [note, setNote] = useState<string>('');
  const [category, setCategory] = useState<string>('Thời trang / Đồ chơi');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = Number(priceStr);
    if (!name.trim() || !price || price <= 0) {
      alert('Vui lòng điền tên món đồ và số tiền!');
      return;
    }

    onAddWishlistItem({
      name: name.trim(),
      price,
      type,
      daysPlanned,
      note: note.trim() || 'Hạ nhiệt cơn bốc đồng',
      category,
    });

    playCashRegister();
    triggerConfetti();

    setName('');
    setPriceStr('');
    setNote('');
    setShowAddForm(false);
  };

  return (
    <div className="bg-white p-5 sm:p-6 rounded-3xl border border-pink-200/90 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🛍️</span>
            <h3 className="font-extrabold text-base text-pink-700 tracking-tight">
              GIỎ CHỜ ĐẮN ĐO 30 NGÀY (HẠ NHIỆT MUA BỐC ĐỒNG)
            </h3>
          </div>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Khi muốn mua thứ gì, hãy bỏ vào đây và chờ đếm ngược. Nếu sau thời gian thử thách bạn vẫn cần nó, hãy mua!
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            playSoftPop();
            setShowAddForm(!showAddForm);
          }}
          className="px-4 py-2 bg-pink-400 hover:bg-pink-500 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{showAddForm ? 'Đóng lại' : 'Thêm Món Đắn Đo'}</span>
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <form
          onSubmit={handleSubmit}
          className="p-4 bg-pink-50/60 rounded-2xl border border-pink-200 space-y-3 animate-fadeIn text-xs"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-gray-700 block mb-1">TÊN MÓN ĐỒ MUỐN MUA *</label>
              <input
                type="text"
                placeholder="VD: Tai nghe chống ồn, Áo khoác mùa đông..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2.5 bg-white border border-pink-200 rounded-xl font-bold"
                required
              />
            </div>
            <div>
              <label className="font-bold text-gray-700 block mb-1">GIÁ TIỀN DỰ KIẾN (VNĐ) *</label>
              <input
                type="number"
                placeholder="VD: 890000"
                value={priceStr}
                onChange={(e) => setPriceStr(e.target.value)}
                className="w-full p-2.5 bg-white border border-pink-200 rounded-xl font-bold"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-gray-700 block mb-1">BẢN CHẤT MÓN ĐỒ</label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setType('need')}
                  className={`py-2 rounded-xl font-bold border transition-colors ${
                    type === 'need'
                      ? 'bg-emerald-500 text-white border-emerald-600'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  CẦN (Need)
                </button>
                <button
                  type="button"
                  onClick={() => setType('want')}
                  className={`py-2 rounded-xl font-bold border transition-colors ${
                    type === 'want'
                      ? 'bg-pink-500 text-white border-pink-600'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  THÍCH (Want)
                </button>
              </div>
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">THỜI GIAN THỬ THÁCH</label>
              <select
                value={daysPlanned}
                onChange={(e) => setDaysPlanned(Number(e.target.value))}
                className="w-full p-2.5 bg-white border border-pink-200 rounded-xl font-bold"
              >
                <option value={7}>7 ngày (Thử thách nhanh)</option>
                <option value={14}>14 ngày (Hạ nhiệt chuẩn)</option>
                <option value={30}>30 ngày (Quyết tâm lớn)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">DANH MỤC</label>
              <input
                type="text"
                placeholder="Công nghệ, Quần áo..."
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2.5 bg-white border border-pink-200 rounded-xl font-medium"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-gray-700 block mb-1">GHI CHÚ / LÝ DO ĐẮN ĐO</label>
            <input
              type="text"
              placeholder="VD: Đợi 14 ngày nếu vẫn thèm thì mới mua..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full p-2.5 bg-white border border-pink-200 rounded-xl font-medium"
            />
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
              className="px-5 py-2 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl shadow-xs"
            >
              Bỏ Vào Giỏ Chờ 🛒
            </button>
          </div>
        </form>
      )}

      {/* List of Wishlist items */}
      <div className="space-y-3">
        {wishlist.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-xs font-semibold">
            Giỏ chờ đắn đo đang trống. Mỗi khi có ý định mua đồ bốc đồng, hãy ghi ngay vào đây! ✨
          </div>
        ) : (
          wishlist.map((item) => {
            const daysLeft = Math.max(0, item.daysPlanned - item.daysPassed);
            const isFinished = daysLeft === 0;
            const progressPct = Math.min(
              100,
              Math.round((item.daysPassed / item.daysPlanned) * 100)
            );

            return (
              <div
                key={item.id}
                className="p-4 bg-orange-50/50 hover:bg-orange-50/80 border border-orange-200/90 rounded-2xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1 sm:max-w-md">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        item.type === 'need'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-pink-100 text-pink-800 border border-pink-200'
                      }`}
                    >
                      {item.type === 'need' ? 'CẦN THIẾT' : 'CHỈ LÀ THÍCH'}
                    </span>
                    <h4 className="font-extrabold text-sm text-gray-800">{item.name}</h4>
                    <span className="text-gray-400 font-medium">({item.category})</span>
                  </div>

                  <div className="text-gray-600 font-medium flex items-center gap-3">
                    <span className="font-extrabold text-orange-900 text-sm">
                      {item.price.toLocaleString('vi-VN')} đ
                    </span>
                    <span>·</span>
                    <span className="italic text-gray-500">&quot;{item.note}&quot;</span>
                  </div>

                  {/* Days progress */}
                  <div className="flex items-center gap-2 pt-1">
                    <div className="w-32 bg-gray-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-orange-500 h-full rounded-full transition-all"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-orange-800">
                      Đã qua {item.daysPassed}/{item.daysPlanned} ngày
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap items-center gap-1.5 sm:self-center">
                  {/* +1 Day button for simulation/tracking */}
                  <button
                    type="button"
                    onClick={() => {
                      playSoftPop();
                      onAdvanceDay(item.id);
                    }}
                    className="px-2.5 py-1.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 font-bold rounded-xl flex items-center gap-1"
                    title="Cộng thêm 1 ngày đã nhẫn nhịn"
                  >
                    <Clock className="w-3.5 h-3.5 text-orange-600" />
                    <span>+1 Ngày</span>
                  </button>

                  {/* Cancel & Save: Celebrate anti-impulse purchase! */}
                  <button
                    type="button"
                    onClick={() => {
                      playCashRegister();
                      triggerConfetti();
                      onCancelAndSave(item);
                    }}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl flex items-center gap-1 shadow-xs"
                    title="Tôi nhận ra mình không cần nó nữa! Đã tiết kiệm thành công!"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Không Mua Nữa (Tiết Kiệm!)</span>
                  </button>

                  {/* Buy now if confirmed */}
                  <button
                    type="button"
                    onClick={() => {
                      playScannerBeep();
                      onConvertToExpense(item);
                    }}
                    className="px-3 py-1.5 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl flex items-center gap-1 shadow-xs"
                    title="Vẫn thực sự cần thiết, quét thành chi tiêu chính thức!"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Mua (Chi Tiêu)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Xóa món "${item.name}" khỏi giỏ chờ?`)) {
                        onDeleteItem(item.id);
                      }
                    }}
                    className="p-1.5 text-gray-300 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
