import React from 'react';
import { ShoppingBag, ScanBarcode, LineChart, ReceiptText, Gift, Award } from 'lucide-react';
import { TabType } from '../types';
import { playSoftPop } from '../utils/audio';

interface NavigationProps {
  currentTab: TabType;
  setTab: (tab: TabType) => void;
  coolingCount: number;
  unlockedBadgeCount: number;
  warningJarsCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  setTab,
  coolingCount,
  unlockedBadgeCount,
  warningJarsCount = 0,
}) => {
  const tabs = [
    {
      id: 'overview' as TabType,
      label: '6 Hũ Ngân Sách',
      sub: 'Tiến độ & Số dư',
      icon: ShoppingBag,
      badge: warningJarsCount > 0 ? `⚠️ ${warningJarsCount}` : undefined,
      badgeColor: 'bg-rose-500 text-white animate-pulse',
      activeColor: 'bg-pink-400 text-white border-pink-500 shadow-md shadow-pink-200',
      hoverColor: 'hover:bg-pink-50 text-gray-700 border-pink-100',
    },
    {
      id: 'scanner' as TabType,
      label: 'Quét Thu Chi',
      sub: 'Âm thanh Bíp & Giờ làm',
      icon: ScanBarcode,
      activeColor: 'bg-emerald-400 text-white border-emerald-500 shadow-md shadow-emerald-200',
      hoverColor: 'hover:bg-emerald-50 text-gray-700 border-emerald-100',
    },
    {
      id: 'forecast' as TabType,
      label: 'Dự Báo Dòng Tiền',
      sub: '3 - 6 tháng & Cảnh báo',
      icon: LineChart,
      activeColor: 'bg-indigo-400 text-white border-indigo-500 shadow-md shadow-indigo-200',
      hoverColor: 'hover:bg-indigo-50 text-gray-700 border-indigo-100',
    },
    {
      id: 'receipt' as TabType,
      label: 'Hóa Đơn Siêu Thị',
      sub: 'Lịch sử & Moods',
      icon: ReceiptText,
      activeColor: 'bg-purple-400 text-white border-purple-500 shadow-md shadow-purple-200',
      hoverColor: 'hover:bg-purple-50 text-gray-700 border-purple-100',
    },
    {
      id: 'special' as TabType,
      label: 'Giỏ Đắn Đo & Khấu Hao',
      sub: 'Hạ nhiệt mua sắm',
      icon: Gift,
      badge: coolingCount > 0 ? coolingCount : undefined,
      activeColor: 'bg-amber-400 text-white border-amber-500 shadow-md shadow-amber-200',
      hoverColor: 'hover:bg-amber-50 text-gray-700 border-amber-100',
    },
    {
      id: 'badges' as TabType,
      label: 'Tạp Dề & Hồ Sơ',
      sub: 'Huy hiệu thành tựu',
      icon: Award,
      badge: unlockedBadgeCount > 0 ? unlockedBadgeCount : undefined,
      activeColor: 'bg-sky-400 text-white border-sky-500 shadow-md shadow-sky-200',
      hoverColor: 'hover:bg-sky-50 text-gray-700 border-sky-100',
    },
  ];

  return (
    <nav className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5 my-5">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              playSoftPop();
              setTab(tab.id);
            }}
            className={`relative p-3 rounded-2xl border transition-all duration-200 text-left flex flex-col justify-between select-none ${
              isActive
                ? `${tab.activeColor} scale-[1.02]`
                : `bg-white/80 ${tab.hoverColor} hover:scale-[1.01] shadow-xs`
            }`}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-600'}`} />
              {tab.badge !== undefined && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    tab.badgeColor || (isActive ? 'bg-white text-gray-800' : 'bg-pink-100 text-pink-700')
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </div>
            <div>
              <div className="font-bold text-xs sm:text-sm tracking-tight leading-snug">
                {tab.label}
              </div>
              <div
                className={`text-[10px] hidden sm:block ${
                  isActive ? 'text-white/80' : 'text-gray-400'
                }`}
              >
                {tab.sub}
              </div>
            </div>
          </button>
        );
      })}
    </nav>
  );
};

