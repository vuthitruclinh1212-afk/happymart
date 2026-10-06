import React, { useState } from 'react';
import { Wallet, Jar } from '../types';
import { X, Plus, Trash2, Download, Upload, RotateCcw, Wallet as WalletIcon } from 'lucide-react';
import { playSoftPop } from '../utils/audio';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: Wallet[];
  onUpdateWalletBalance: (id: string, newBalance: number) => void;
  onAddWallet: (name: string, balance: number, icon: string) => void;
  onDeleteWallet: (id: string) => void;
  onResetAllData: () => void;
  onExportData: () => void;
  onImportData: (jsonData: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  wallets,
  onUpdateWalletBalance,
  onAddWallet,
  onDeleteWallet,
  onResetAllData,
  onExportData,
  onImportData,
}) => {
  const [newWalletName, setNewWalletName] = useState('');
  const [newWalletBalance, setNewWalletBalance] = useState('');
  const [newWalletIcon, setNewWalletIcon] = useState('💳');
  const [editingWalletId, setEditingWalletId] = useState<string | null>(null);
  const [tempBalance, setTempBalance] = useState<string>('');

  if (!isOpen) return null;

  const handleAddWalletSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWalletName.trim()) return;
    onAddWallet(newWalletName.trim(), Number(newWalletBalance) || 0, newWalletIcon);
    setNewWalletName('');
    setNewWalletBalance('');
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        onImportData(text);
        alert('Đã khôi phục dữ liệu sao lưu thành công!');
        onClose();
      } catch (err) {
        alert('File dữ liệu không hợp lệ!');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl border border-pink-200 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚙️</span>
            <h3 className="font-black text-lg text-gray-800">CÀI ĐẶT & QUẢN LÝ VÍ TIỀN</h3>
          </div>
          <button
            type="button"
            onClick={() => {
              playSoftPop();
              onClose();
            }}
            className="p-1 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wallets section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Danh sách Ví tiền ({wallets.length})
            </h4>
          </div>

          <div className="space-y-2">
            {wallets.map((w) => {
              const isEditing = editingWalletId === w.id;
              return (
                <div
                  key={w.id}
                  className="p-3 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{w.icon}</span>
                    <div>
                      <div className="font-bold text-gray-800">{w.name}</div>
                      {isEditing ? (
                        <div className="flex items-center gap-1 mt-1">
                          <input
                            type="number"
                            value={tempBalance}
                            onChange={(e) => setTempBalance(e.target.value)}
                            className="w-28 p-1 border rounded bg-white text-xs font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateWalletBalance(w.id, Number(tempBalance) || 0);
                              setEditingWalletId(null);
                            }}
                            className="px-2 py-0.5 bg-emerald-600 text-white rounded font-bold"
                          >
                            Lưu
                          </button>
                        </div>
                      ) : (
                        <div className="text-emerald-700 font-extrabold">
                          {w.balance.toLocaleString('vi-VN')} đ
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingWalletId(w.id);
                          setTempBalance(String(w.balance));
                        }}
                        className="text-gray-500 hover:text-gray-800 text-[11px] font-bold px-2 py-1 bg-white border rounded-lg"
                      >
                        Sửa số dư
                      </button>
                    )}
                    {wallets.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Xác nhận xóa ví ${w.name}?`)) {
                            onDeleteWallet(w.id);
                          }
                        }}
                        className="text-gray-400 hover:text-rose-500 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Wallet form */}
          <form onSubmit={handleAddWalletSubmit} className="p-3 bg-purple-50/60 rounded-2xl border border-purple-200 space-y-2 text-xs">
            <span className="font-bold text-purple-900 block">+ Thêm ví tiền mới</span>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Tên ví (VD: MoMo...)"
                value={newWalletName}
                onChange={(e) => setNewWalletName(e.target.value)}
                className="col-span-2 p-2 bg-white border rounded-xl font-bold"
                required
              />
              <input
                type="text"
                placeholder="Icon (VD: 📱, 💳)"
                value={newWalletIcon}
                onChange={(e) => setNewWalletIcon(e.target.value)}
                className="p-2 bg-white border rounded-xl text-center"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Số dư ban đầu"
                value={newWalletBalance}
                onChange={(e) => setNewWalletBalance(e.target.value)}
                className="w-full p-2 bg-white border rounded-xl font-bold"
              />
              <button
                type="submit"
                className="px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl whitespace-nowrap"
              >
                Thêm ví
              </button>
            </div>
          </form>
        </div>

        {/* Data Management: Backup & Reset */}
        <div className="pt-3 border-t border-gray-100 space-y-3">
          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
            Sao Lưu & Phục Hồi Dữ Liệu
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={onExportData}
              className="p-2.5 bg-gray-100 hover:bg-gray-200 font-bold text-gray-800 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Xuất File JSON</span>
            </button>

            <label className="p-2.5 bg-gray-100 hover:bg-gray-200 font-bold text-gray-800 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center">
              <Upload className="w-4 h-4 text-purple-600" />
              <span>Nhập File JSON</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="hidden"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() => {
              if (window.confirm('Khôi phục toàn bộ ứng dụng về dữ liệu mẫu ban đầu?')) {
                onResetAllData();
                onClose();
              }
            }}
            className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Khôi Phục Dữ Liệu Mẫu Mặc Định</span>
          </button>
        </div>
      </div>
    </div>
  );
};
