import {
  Jar,
  Wallet,
  Mood,
  Transaction,
  WishlistItem,
  AssetDepreciation,
  DiaryEntry,
  Badge,
  UserRank,
  RecurringExpense,
  UserProfile,
  FavoriteSong,
  SavingsFund,
} from '../types';

export const MOODS: Mood[] = [
  { id: 'love', icon: '🥰', label: 'Cực kỳ xứng đáng', desc: 'Rất vui, thỏa mãn & hài lòng', color: 'text-rose-600 bg-rose-50 border-rose-200' },
  { id: 'okay', icon: '🙂', label: 'Bình thường', desc: 'Khoản chi tiêu thiết yếu', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { id: 'hesitant', icon: '🥲', label: 'Hơi lăn tăn', desc: 'Có thể cắt giảm hoặc tối ưu', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  { id: 'regret', icon: '😭', label: 'Rất hối hận', desc: 'Mua bốc đồng, cắn rứt', color: 'text-purple-700 bg-purple-50 border-purple-200' },
];

export const INITIAL_JARS: Jar[] = [
  {
    id: 'nec',
    name: 'Thiết Yếu (NEC)',
    code: 'NEC 55%',
    limit: 5500000,
    colorBg: 'bg-emerald-50/80',
    colorBorder: 'border-emerald-200',
    colorText: 'text-emerald-800',
    colorBar: 'from-emerald-400 to-teal-400',
    icon: '🥦',
    description: 'Nhu cầu cơ bản: ăn uống, tiền phòng/nhà, điện nước, xăng xe, siêu thị',
    subs: ['Ăn sáng', 'Ăn trưa/tối', 'Tiền thuê nhà', 'Điện nước & Net', 'Xăng xe', 'Đi chợ siêu thị', 'Thuốc men'],
  },
  {
    id: 'play',
    name: 'Hưởng Thụ (PLAY)',
    code: 'PLAY 10%',
    limit: 1500000,
    colorBg: 'bg-pink-50/80',
    colorBorder: 'border-pink-200',
    colorText: 'text-pink-800',
    colorBar: 'from-pink-400 to-rose-400',
    icon: '🧋',
    description: 'Tận hưởng niềm vui ngắn hạn: cà phê, trà sữa, xem phim, ăn hàng',
    subs: ['Trà sữa & Cà phê', 'Xem phim rạp', 'Shopping quần áo', 'Tụ tập bạn bè', 'Du lịch ngắn ngày'],
  },
  {
    id: 'ltss',
    name: 'Tiết Kiệm Dài Hạn (LTSS)',
    code: 'LTSS 10%',
    limit: 2000000,
    colorBg: 'bg-purple-50/80',
    colorBorder: 'border-purple-200',
    colorText: 'text-purple-800',
    colorBar: 'from-purple-400 to-indigo-400',
    icon: '🛡️',
    description: 'Quỹ dự phòng khẩn cấp, mua sắm lớn có kế hoạch, bảo hiểm',
    subs: ['Quỹ khẩn cấp 6 tháng', 'Đổi điện thoại/laptop', 'Quỹ du lịch năm', 'Bảo hiểm nhân thọ/y tế'],
  },
  {
    id: 'edu',
    name: 'Giáo Dục (EDU)',
    code: 'EDU 10%',
    limit: 800000,
    colorBg: 'bg-amber-50/80',
    colorBorder: 'border-amber-200',
    colorText: 'text-amber-800',
    colorBar: 'from-amber-400 to-yellow-400',
    icon: '📚',
    description: 'Đầu tư phát triển bản thân: sách hay, khóa học chuyên môn, hội thảo',
    subs: ['Sách hay & Ebook', 'Khóa học online', 'Học ngoại ngữ', 'Phần mềm công việc (Notion/Figma)'],
  },
  {
    id: 'ffa',
    name: 'Tự Do Tài Chính (FFA)',
    code: 'FFA 10%',
    limit: 1500000,
    colorBg: 'bg-sky-50/80',
    colorBorder: 'border-sky-200',
    colorText: 'text-sky-800',
    colorBar: 'from-sky-400 to-blue-400',
    icon: '🌱',
    description: 'Gà đẻ trứng vàng: chứng chỉ quỹ, cổ phiếu, vàng tích sản, gửi kỳ hạn',
    subs: ['Chứng chỉ quỹ ETF', 'Cổ phiếu dài hạn', 'Vàng tích sản', 'Gửi tiết kiệm kỳ hạn'],
  },
  {
    id: 'give',
    name: 'Cho Đi (GIVE)',
    code: 'GIVE 5%',
    limit: 500000,
    colorBg: 'bg-rose-50/80',
    colorBorder: 'border-rose-200',
    colorText: 'text-rose-800',
    colorBar: 'from-rose-400 to-red-400',
    icon: '🎁',
    description: 'Báo hiếu cha mẹ, quà mừng sinh nhật bạn bè, làm việc thiện nguyện',
    subs: ['Biếu bố mẹ', 'Quà sinh nhật/cưới', 'Mời bạn bè thân', 'Ủng hộ từ thiện'],
  },
];

export const INITIAL_WALLETS: Wallet[] = [
  { id: 'cash', name: 'Ví Tiền Mặt 💵', balance: 300000, icon: '💵' },
  { id: 'bank', name: 'Tài Khoản Ngân Hàng 💳', balance: 2500000, icon: '💳' },
  { id: 'momo', name: 'Ví MoMo 📱', balance: 150000, icon: '📱' },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const INITIAL_WISHLIST: WishlistItem[] = [];

export const INITIAL_ASSETS: AssetDepreciation[] = [];

export const INITIAL_DIARY: DiaryEntry[] = [];

export const INITIAL_RECURRING: RecurringExpense[] = [
  { id: 'rec-rent', name: 'Tiền thuê nhà / phòng trọ', amount: 2500000, jarId: 'nec', dayOfMonth: 5, icon: '🏠', isActive: true, category: 'Nhà ở' },
  { id: 'rec-elec', name: 'Hóa đơn Điện, Nước & Rác', amount: 450000, jarId: 'nec', dayOfMonth: 10, icon: '⚡', isActive: true, category: 'Tiện ích' },
  { id: 'rec-wifi', name: 'Cước Internet Wi-Fi', amount: 200000, jarId: 'nec', dayOfMonth: 15, icon: '🌐', isActive: true, category: 'Viễn thông' },
];

export const INITIAL_SAVINGS_FUNDS: SavingsFund[] = [
  {
    id: 'fund-phone',
    name: 'Mua điện thoại mới',
    icon: '📱',
    targetAmount: 18000000,
    targetMonths: 6,
    monthlyAmount: 3000000, // 18Tr / 6 tháng = 3Tr/tháng
    currentSaved: 6000000,
    walletId: 'bank',
    createdAt: Date.now() - 60 * 86400000,
    note: 'Khoản chi tích lũy tự động hàng tháng để đổi điện thoại sau 6 tháng',
    isCompleted: false,
  },
  {
    id: 'fund-emergency',
    name: 'Quỹ khẩn cấp dự phòng',
    icon: '🛡️',
    targetAmount: 24000000,
    targetMonths: 12,
    monthlyAmount: 2000000, // 24Tr / 12 tháng = 2Tr/tháng
    currentSaved: 8000000,
    walletId: 'bank',
    createdAt: Date.now() - 90 * 86400000,
    note: 'Quỹ an toàn dự phòng 3-6 tháng chi phí sinh hoạt thiết yếu',
    isCompleted: false,
  },
];

export const INITIAL_PROFILE: UserProfile = {
  name: 'Bạn Mới',
  avatar: '🥑',
  memberId: 'HM-MEMBER-01',
  joinedDate: new Date().toLocaleDateString('vi-VN'),
  monthlyWorkHours: 160,
  currentStreakDays: 1,
  longestStreakDays: 1,
  lastActiveDate: new Date().toISOString().split('T')[0],
};

export const INITIAL_SONGS: FavoriteSong[] = [
  {
    id: 'song-lofi-1',
    title: 'Supermarket Lo-Fi Breeze',
    artist: 'Happy Mart Records',
    genre: 'Lo-Fi Chill',
    isFavorite: true,
    moodIcon: '🥑',
    duration: '3:20',
    synthType: 'lofi',
    createdAt: Date.now() - 3600000,
  },
  {
    id: 'song-cafe-2',
    title: 'Cozy Morning Accounting',
    artist: 'Pastel Beans Studio',
    genre: 'Cafe Relax',
    isFavorite: true,
    moodIcon: '☕',
    duration: '2:45',
    synthType: 'cafe',
    createdAt: Date.now() - 7200000,
  },
  {
    id: 'song-boba-3',
    title: 'Boba Milk Tea Melody',
    artist: 'Dopamine Mart Band',
    genre: 'Pastel Pop',
    isFavorite: false,
    moodIcon: '🧋',
    duration: '3:05',
    synthType: 'chime',
    createdAt: Date.now() - 10800000,
  },
  {
    id: 'song-croissant-4',
    title: 'Warm Croissant Acoustic',
    artist: 'Bakery Chillout',
    genre: 'Acoustic Calm',
    isFavorite: false,
    moodIcon: '🥐',
    duration: '2:50',
    synthType: 'bell',
    createdAt: Date.now() - 14400000,
  },
  {
    id: 'song-evening-5',
    title: 'Midnight Grocery Stroll',
    artist: 'Konbini Dreams',
    genre: 'Ambient Dream',
    isFavorite: true,
    moodIcon: '🌙',
    duration: '4:10',
    synthType: 'ambient',
    createdAt: Date.now() - 18000000,
  },
];

export const INITIAL_BADGES: Badge[] = [
  {
    id: 'badge-silver-saver',
    title: 'Tiết Kiệm Bạc 🥈',
    icon: '🥈',
    tier: 'silver',
    description: 'Tích lũy đạt tối thiểu 50% hạn mức hũ tiết kiệm (LTSS & FFA).',
    requirement: 'Đạt 50% mục tiêu tích lũy hũ Tiết Kiệm Dài Hạn hoặc Tự Do Tài Chính',
    howToUnlock: 'Phân bổ tiền tích lũy vào hũ Tiết Kiệm Dài Hạn (LTSS) hoặc Tự Do Tài Chính (FFA) để số tiền dành dụm đạt tối thiểu 50% ngân sách tháng.',
    category: 'savings',
    progress: 0,
    maxProgress: 100,
    isUnlocked: false,
  },
  {
    id: 'badge-mindful-streak',
    title: 'Chi Tiêu Tỉnh Táo 🧠',
    icon: '🧠',
    tier: 'silver',
    description: 'Hoàn thành 7 ngày liên tiếp ghi lại chi tiêu một cách kỷ luật không bỏ sót.',
    requirement: 'Duy trì chuỗi ghi chép chi tiêu liên tục 7 ngày',
    howToUnlock: 'Mỗi ngày mở quầy quét mã hoặc ghi lại ít nhất một giao dịch thu chi hoặc nhật ký tiêu dùng để giữ vững chuỗi 7 ngày liên tục.',
    category: 'discipline',
    progress: 1,
    maxProgress: 7,
    isUnlocked: false,
  },
  {
    id: 'badge-master-planner',
    title: 'Người Lập Kế Hoạch 📋',
    icon: '📋',
    tier: 'gold',
    description: 'Thiết lập và hoàn thành mục tiêu đắn đo cho món đồ trong Giỏ Chờ Đắn Đo (Wishlist).',
    requirement: 'Vượt qua thời gian thử thách hoặc thành công nhẫn nhịn món đồ trong Wishlist',
    howToUnlock: 'Thêm món đồ vào Giỏ Chờ Đắn Đo và kiên trì đợi đủ số ngày đếm ngược (7, 14, 30 ngày) hoặc bấm "Không Mua Nữa (Tiết Kiệm!)" để bảo toàn nguồn vốn.',
    category: 'planning',
    progress: 0,
    maxProgress: 1,
    isUnlocked: false,
  },
  {
    id: 'badge-zero-waste',
    title: 'Tháng Không Lãng Phí 🌿',
    icon: '🌿',
    tier: 'gold',
    description: 'Chi tiêu dưới 50% tổng hạn mức ngân sách tháng, bảo toàn nguồn lực tối đa.',
    requirement: 'Tổng chi tiêu thực tế < 50% tổng ngân sách tháng (tối thiểu 3 đơn)',
    howToUnlock: 'Giữ kỷ luật tài chính trong tháng, kiểm soát các hũ chi tiêu để tổng số tiền thực chi không vượt quá 50% hạn mức tổng đã đề ra.',
    category: 'discipline',
    progress: 0,
    maxProgress: 50,
    isUnlocked: false,
  },
  {
    id: 'badge-brake',
    title: 'Phanh Gấp 60 Giây 🛑',
    icon: '🛑',
    tier: 'bronze',
    description: 'Đã bỏ 1 món vào Giỏ Chờ Đắn Đo thay vì vội vàng thanh toán ngay!',
    requirement: 'Thêm ít nhất 1 món vào Giỏ Chờ Đắn Đo',
    howToUnlock: 'Khi có cảm giác thèm mua món đồ nào, bấm "Thêm Món Đắn Đo" trong tab Giỏ Chờ để hạ nhiệt mua sắm bốc đồng.',
    category: 'mindful',
    progress: 0,
    maxProgress: 1,
    isUnlocked: false,
  },
  {
    id: 'badge-sweat',
    title: 'Trân Trọng Mồ Hôi ⏱️',
    icon: '⏱️',
    tier: 'bronze',
    description: 'Luôn tính toán số giờ làm việc trước mỗi quyết định rút ví.',
    requirement: 'Cài đặt mức lương giờ và quét ít nhất 3 khoản chi',
    howToUnlock: 'Thiết lập mức lương 1 giờ trong phần tiêu đề và quét tối thiểu 3 món đồ qua máy quét POS.',
    category: 'mindful',
    progress: 0,
    maxProgress: 3,
    isUnlocked: false,
  },
  {
    id: 'badge-happy-money',
    title: 'Tiêu Tiền Hạnh Phúc 🥰',
    icon: '🥰',
    tier: 'silver',
    description: 'Khoản chi hưởng thụ mang lại niềm vui trọn vẹn và không cắn rứt.',
    requirement: 'Có ít nhất 2 khoản chi đánh giá 🥰 Cực kỳ xứng đáng',
    howToUnlock: 'Khi quét mã thanh toán, chọn cảm xúc 🥰 Cực kỳ xứng đáng cho những trải nghiệm mang lại giá trị tinh thần tích cực.',
    category: 'mindful',
    progress: 0,
    maxProgress: 2,
    isUnlocked: false,
  },
  {
    id: 'badge-depreciation',
    title: 'Thợ Vắt Kiệt Giá Trị 💻',
    icon: '💻',
    tier: 'silver',
    description: 'Theo dõi khấu hao để biến tài sản đắt đỏ thành chi phí rẻ mỗi ngày.',
    requirement: 'Có ít nhất 1 tài sản trong mục Khấu hao',
    howToUnlock: 'Nhập thông tin 1 món đồ công nghệ hoặc gia dụng vào bảng Theo Dõi Khấu Hao để theo dõi chi phí/ngày.',
    category: 'planning',
    progress: 0,
    maxProgress: 1,
    isUnlocked: false,
  },
  {
    id: 'badge-rollover',
    title: 'Kế Dư Vô Địch 🐷',
    icon: '🐷',
    tier: 'gold',
    description: 'Bảo toàn số tiền dư tháng trước sang tháng mới làm đòn bẩy.',
    requirement: 'Duy trì kế dư dương sang chu kỳ mới',
    howToUnlock: 'Kết thúc tháng với số dư ngân sách còn dư và chuyển tiếp sang tháng kế tiếp làm quỹ đòn bẩy.',
    category: 'savings',
    progress: 0,
    maxProgress: 1,
    isUnlocked: false,
  },
  {
    id: 'badge-historian',
    title: 'Người Viết Sử Tiền Bạc 📖',
    icon: '📖',
    tier: 'bronze',
    description: 'Ghi chép bài học tài chính để hiểu rõ hành vi tiêu tiền của bản thân.',
    requirement: 'Viết từ 2 ghi chú nhật ký tiêu dùng',
    howToUnlock: 'Vào mục Nhật Ký Trải Nghiệm Tiêu Dùng và lưu lại ít nhất 2 bài học hoặc khoảnh khắc làm chủ đồng tiền.',
    category: 'mindful',
    progress: 0,
    maxProgress: 2,
    isUnlocked: false,
  },
  {
    id: 'badge-ceo',
    title: 'Chủ Tịch Chuỗi Siêu Thị 👑',
    icon: '👑',
    tier: 'platinum',
    description: 'Quản lý tài chính thuần thục với trên 25 lượt kiểm soát chi tiêu!',
    requirement: 'Ghi nhận trên 25 giao dịch trên quầy thu ngân',
    howToUnlock: 'Tích lũy tối thiểu 25 giao dịch quét mã thu chi thành công trên ứng dụng Happy Mart Fin.',
    category: 'discipline',
    progress: 0,
    maxProgress: 25,
    isUnlocked: false,
  },
];

export const RANKS: UserRank[] = [
  { title: 'Khách Đi Lạc 🛒💭', level: 1, bg: 'bg-blue-100 text-blue-900 border-blue-300', description: 'Mới bước vào siêu thị, đang làm quen với các giỏ hàng', minTransactions: 0 },
  { title: 'Thực Tập Quét Mã 🏷️', level: 2, bg: 'bg-emerald-100 text-emerald-900 border-emerald-300', description: 'Đã biết soi từng món đồ và quy đổi thành thời gian lao động', minTransactions: 3 },
  { title: 'Trưởng Quầy Thu Ngân 🧾🎀', level: 3, bg: 'bg-pink-100 text-pink-900 border-pink-300', description: 'Kiểm soát chặt chẽ ngân sách, quét mã siêu nhanh gọn', minTransactions: 8 },
  { title: 'Quản Lý Gian Hàng 📦✨', level: 4, bg: 'bg-purple-100 text-purple-900 border-purple-300', description: 'Làm chủ 6 chiếc giỏ tài chính và tối ưu khấu hao xuất sắc', minTransactions: 15 },
  { title: 'Chủ Tịch Chuỗi Siêu Thị 👑🥑', level: 5, bg: 'bg-amber-100 text-amber-900 border-amber-300', description: 'Đạt cảnh giới tự do tâm trí với từng đồng tiền mình làm ra', minTransactions: 25 },
];

export const loadStored = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.debug(`Error loading ${key}`, e);
    return fallback;
  }
};

export const saveStored = <T>(key: string, data: T) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.debug(`Error saving ${key}`, e);
  }
};
