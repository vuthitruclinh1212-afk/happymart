import React, { useState } from 'react';
import { DiaryEntry } from '../types';
import { BookOpen, Sparkles, Send, Trash2, Heart } from 'lucide-react';
import { playCashRegister, playSoftPop } from '../utils/audio';
import { triggerConfetti } from '../utils/confetti';

interface FinancialDiaryProps {
  entries: DiaryEntry[];
  onAddEntry: (entry: Omit<DiaryEntry, 'id'>) => void;
  onDeleteEntry: (id: string) => void;
}

export const FinancialDiary: React.FC<FinancialDiaryProps> = ({
  entries,
  onAddEntry,
  onDeleteEntry,
}) => {
  const [content, setContent] = useState<string>('');
  const [savedAmountStr, setSavedAmountStr] = useState<string>('');
  const [tag, setTag] = useState<string>('Thắng cám dỗ ✨');
  const [score, setScore] = useState<number>(5);

  const promptSuggestions = [
    'Hôm nay mình đã nói KHÔNG với món đồ bốc đồng nào?',
    'Khoản chi nào làm mình thấy hạnh phúc và xứng đáng nhất?',
    'Quy đổi món đồ ra giờ làm việc đã làm mình suy nghĩ lại ra sao?',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const savedAmount = Number(savedAmountStr) || undefined;
    onAddEntry({
      date: new Date().toLocaleDateString('vi-VN'),
      content: content.trim(),
      feelingScore: score,
      tag,
      savedAmount,
    });

    if (savedAmount && savedAmount > 0) {
      playCashRegister();
      triggerConfetti();
    } else {
      playSoftPop();
    }

    setContent('');
    setSavedAmountStr('');
  };

  const totalSaved = entries.reduce((sum, e) => sum + (e.savedAmount || 0), 0);

  return (
    <div className="bg-white p-5 sm:p-6 rounded-3xl border border-emerald-200/90 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📖</span>
            <h3 className="font-extrabold text-base text-emerald-800 tracking-tight">
              NHẬT KÝ TRẢI NGHIỆM TIÊU DÙNG HÔM NAY
            </h3>
          </div>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Viết ra những khoảnh khắc làm chủ đồng tiền giúp củng cố tư duy thịnh vượng!
          </p>
        </div>

        {totalSaved > 0 && (
          <div className="px-3.5 py-1.5 bg-emerald-100/80 border border-emerald-300 rounded-2xl text-xs font-bold text-emerald-900 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
            <span>Đã giữ lại được: <strong>{totalSaved.toLocaleString('vi-VN')} đ</strong> 🐷</span>
          </div>
        )}
      </div>

      {/* Input box */}
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Suggestion buttons */}
        <div className="flex flex-wrap gap-1.5">
          {promptSuggestions.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                playSoftPop();
                setContent(p + ' -> ');
              }}
              className="text-[10px] bg-gray-50 hover:bg-emerald-50 text-gray-600 hover:text-emerald-800 border border-gray-200 rounded-xl px-2.5 py-1 transition-colors font-medium text-left"
            >
              💡 {p}
            </button>
          ))}
        </div>

        <div className="relative">
          <textarea
            rows={3}
            placeholder="Hôm nay bạn học được gì về tiền bạc? Khoảnh khắc nào bạn đã chiến thắng cơn thèm mua sắm?..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full p-3.5 bg-emerald-50/30 border border-emerald-200 rounded-2xl text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300"
            required
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div>
              <span className="text-gray-500 font-semibold mr-1">Tiền giữ được:</span>
              <input
                type="number"
                placeholder="VD: 50000"
                value={savedAmountStr}
                onChange={(e) => setSavedAmountStr(e.target.value)}
                className="w-24 p-1.5 border border-gray-200 rounded-xl font-bold bg-white text-center"
              />
              <span className="text-gray-400 ml-1">đ</span>
            </div>

            <div>
              <select
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="p-1.5 border border-gray-200 rounded-xl bg-white font-semibold"
              >
                <option value="Thắng cám dỗ ✨">Thắng cám dỗ ✨</option>
                <option value="Quy đổi giờ ⏱️">Quy đổi giờ ⏱️</option>
                <option value="Chi tiêu xứng đáng 🥰">Chi tiêu xứng đáng 🥰</option>
                <option value="Bài học tài chính 📚">Bài học tài chính 📚</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Lưu Nhật Ký</span>
          </button>
        </div>
      </form>

      {/* Entries List */}
      <div className="space-y-2.5 pt-2 border-t border-gray-100">
        {entries.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-xs font-semibold">
            Chưa có dòng nhật ký nào. Hãy ghi lại cảm xúc tiêu tiền hôm nay!
          </div>
        ) : (
          entries.map((item) => (
            <div
              key={item.id}
              className="p-3.5 bg-emerald-50/40 hover:bg-emerald-50/70 border border-emerald-100 rounded-2xl text-xs space-y-1 group transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-emerald-900">{item.date}</span>
                  <span className="bg-white px-2 py-0.5 rounded-full border border-emerald-200 text-[10px] font-bold text-emerald-800">
                    {item.tag}
                  </span>
                  {item.savedAmount && (
                    <span className="text-[10px] text-emerald-700 font-extrabold">
                      + Tiết kiệm: {item.savedAmount.toLocaleString('vi-VN')} đ 🐷
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onDeleteEntry(item.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-rose-500 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-gray-700 font-medium leading-relaxed">{item.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
