export type TabType = 'overview' | 'scanner' | 'forecast' | 'receipt' | 'special' | 'badges';

export type MoodId = 'love' | 'okay' | 'hesitant' | 'regret';

export interface Mood {
  id: MoodId;
  icon: string;
  label: string;
  desc: string;
  color: string;
}

export interface Jar {
  id: string;
  name: string;
  code: string;
  limit: number;
  colorBg: string;
  colorBorder: string;
  colorText: string;
  colorBar: string;
  icon: string;
  description: string;
  subs: string[];
}

export interface Wallet {
  id: string;
  name: string;
  balance: number;
  icon: string;
}

export interface Transaction {
  id: string;
  amount: number;
  jarId: string;
  subCategory: string;
  walletId: string;
  targetWalletId?: string; // Ví nhận khi chuyển tiền nội bộ giữa các ví
  mood: MoodId;
  note: string;
  date: string;
  workHours: number;
  createdAt: number;
  type?: 'expense' | 'income' | 'transfer';
  source?: string;
}

export interface RecurringExpense {
  id: string;
  name: string;
  amount: number;
  jarId: string;
  dayOfMonth: number;
  icon: string;
  isActive: boolean;
  category: string;
}

export interface SavingsFund {
  id: string;
  name: string; // Tên quỹ tiết kiệm (VD: Mua điện thoại, Quỹ khẩn cấp)
  icon: string; // Icon biểu tượng (📱, 🛡️, 💻, 🛵, ...)
  targetAmount: number; // Giá trị mục tiêu cần có
  targetMonths: number; // Thời gian muốn tiết kiệm (số tháng)
  monthlyAmount: number; // Tự động tính: Math.ceil(targetAmount / targetMonths)
  currentSaved: number; // Số tiền đã tích lũy đến nay
  sourceWalletId?: string; // Ví trích tiền ra (VD: MB Bank)
  walletId?: string; // Ví nhận cất giữ tiền quỹ (VD: Techcombank)
  createdAt: number;
  note?: string;
  isCompleted?: boolean;
}

export type ScenarioType = 'tight' | 'normal' | 'splurge' | 'optimistic' | 'neutral' | 'pessimistic';

export interface ForecastMonthData {
  monthIndex: number;
  monthLabel: string;
  expectedIncome: number;
  recurringFixed: number;
  variableExpenses: number;
  savingsAllocated: number;
  totalExpenses: number;
  netCashFlow: number;
  startingBalance: number;
  endingBalance: number;
  hasDeficitRisk: boolean;
  warningNote?: string;
}

export interface WishlistItem {
  id: string;
  name: string;
  price: number;
  type: 'need' | 'want';
  daysPlanned: number;
  daysPassed: number;
  note: string;
  createdAt: string;
  category: string;
  targetAchieved?: boolean;
}

export interface AssetDepreciation {
  id: string;
  name: string;
  totalVal: number;
  daysPlan: number;
  daysUsed: number;
  category: string;
  purchaseDate: string;
}

export interface DiaryEntry {
  id: string;
  date: string;
  content: string;
  feelingScore?: number; // 1-5
  tag?: string;
  savedAmount?: number;
}

export interface Badge {
  id: string;
  title: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  description: string;
  requirement: string;
  howToUnlock: string;
  category: 'savings' | 'discipline' | 'planning' | 'mindful';
  progress: number;
  maxProgress: number;
  isUnlocked: boolean;
  unlockedAt?: string;
}

export interface UserProfile {
  uid?: string;
  email?: string;
  name: string;
  avatar: string;
  memberId: string;
  joinedDate: string;
  monthlyWorkHours: number; // default 160h
  currentStreakDays: number;
  longestStreakDays: number;
  lastActiveDate: string;
}

export interface UserRank {
  title: string;
  level: number;
  bg: string;
  description: string;
  minTransactions: number;
}

export interface FavoriteSong {
  id: string;
  title: string;
  artist: string;
  genre: string;
  audioUrl?: string;
  isFavorite: boolean;
  moodIcon: string;
  duration?: string;
  synthType?: 'lofi' | 'cafe' | 'chime' | 'bell' | 'ambient';
  createdAt?: number;
  audioSourceType?: 'file' | 'url' | 'synth';
  fileName?: string;
  hasLocalAudioFile?: boolean;
}


