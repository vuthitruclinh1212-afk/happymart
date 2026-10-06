/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  TabType,
  Jar,
  Wallet,
  Transaction,
  WishlistItem,
  AssetDepreciation,
  DiaryEntry,
  Badge,
  UserRank,
  MoodId,
  RecurringExpense,
  UserProfile,
  FavoriteSong,
} from './types';
import {
  INITIAL_JARS,
  INITIAL_WALLETS,
  INITIAL_TRANSACTIONS,
  INITIAL_WISHLIST,
  INITIAL_ASSETS,
  INITIAL_DIARY,
  INITIAL_BADGES,
  INITIAL_RECURRING,
  INITIAL_PROFILE,
  INITIAL_SONGS,
  RANKS,
  loadStored,
  saveStored,
} from './utils/storage';
import { setAudioMuted, getAudioMuted, playFanfare, playCashRegister } from './utils/audio';
import { triggerMegaConfetti } from './utils/confetti';
import { auth, onAuthStateChanged, FirebaseUser } from './firebase';
import {
  loadUserDataFromFirestore,
  saveUserProfileToFirestore,
  saveSubDocument,
  deleteSubDocument,
} from './utils/firebaseSync';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { JarsOverview } from './components/JarsOverview';
import { ScannerCheckout } from './components/ScannerCheckout';
import { FinancialForecast } from './components/FinancialForecast';
import { ReceiptHistory } from './components/ReceiptHistory';
import { CoolingWishlist } from './components/CoolingWishlist';
import { AssetTracker } from './components/AssetDepreciation';
import { FinancialDiary } from './components/FinancialDiary';
import { BadgesApron } from './components/BadgesApron';
import { SettingsModal } from './components/SettingsModal';
import { AuthModal } from './components/AuthModal';
import { FloatingMusicPlayer } from './components/FloatingMusicPlayer';
import { MusicStationModal } from './components/MusicStationModal';

export default function App() {
  // Navigation
  const [tab, setTab] = useState<TabType>('overview');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isMusicStationOpen, setIsMusicStationOpen] = useState<boolean>(false);
  const [isMuted, setIsMutedState] = useState<boolean>(() => getAudioMuted());

  // Firebase Authentication & Multi-user isolation
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false);

  // Scanner initial prefill
  const [scanPrefillJar, setScanPrefillJar] = useState<string>('nec');
  const [scanPrefillSub, setScanPrefillSub] = useState<string>('Ăn sáng');

  // Primary application data synced with LocalStorage & Firestore
  const [hourlyWage, setHourlyWage] = useState<number>(() =>
    loadStored<number>('hm_wage', 50000)
  );

  const [userProfile, setUserProfile] = useState<UserProfile>(() =>
    loadStored<UserProfile>('hm_profile', INITIAL_PROFILE)
  );

  const [wallets, setWallets] = useState<Wallet[]>(() =>
    loadStored<Wallet[]>('hm_wallets', INITIAL_WALLETS)
  );

  const [jars, setJars] = useState<Jar[]>(() =>
    loadStored<Jar[]>('hm_jars', INITIAL_JARS)
  );

  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    loadStored<Transaction[]>('hm_txs', INITIAL_TRANSACTIONS)
  );

  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>(() =>
    loadStored<RecurringExpense[]>('hm_recurring', INITIAL_RECURRING)
  );

  const [rolloverSavings, setRolloverSavings] = useState<number>(() =>
    loadStored<number>('hm_rollover', 0)
  );

  const [wishlist, setWishlist] = useState<WishlistItem[]>(() =>
    loadStored<WishlistItem[]>('hm_wishlist', INITIAL_WISHLIST)
  );

  const [assets, setAssets] = useState<AssetDepreciation[]>(() =>
    loadStored<AssetDepreciation[]>('hm_assets', INITIAL_ASSETS)
  );

  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>(() =>
    loadStored<DiaryEntry[]>('hm_diary', INITIAL_DIARY)
  );

  const [badges, setBadges] = useState<Badge[]>(() =>
    loadStored<Badge[]>('hm_badges', INITIAL_BADGES)
  );

  const [songs, setSongs] = useState<FavoriteSong[]>(() =>
    loadStored<FavoriteSong[]>('hm_songs', INITIAL_SONGS)
  );

  // Listen to Firebase Auth state to isolate user accounts
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        setIsSyncingCloud(true);
        try {
          const cloudData = await loadUserDataFromFirestore(user.uid);
          if (cloudData) {
            setUserProfile(cloudData.userProfile);
            setHourlyWage(cloudData.hourlyWage);
            setRolloverSavings(cloudData.rolloverSavings);
            setJars(cloudData.jars);
            setWallets(cloudData.wallets);
            setTransactions(cloudData.transactions);
            setRecurringExpenses(cloudData.recurringExpenses);
            setWishlist(cloudData.wishlist);
            setAssets(cloudData.assets);
            setDiaryEntries(cloudData.diaryEntries);
            if (cloudData.songs && cloudData.songs.length > 0) {
              setSongs(cloudData.songs);
            }
          }
        } catch (err) {
          console.error('Failed to load user cloud data from Firestore:', err);
        } finally {
          setIsSyncingCloud(false);
        }
      } else {
        // User logged out: restore clean initial defaults to ensure strict separation
        setUserProfile(INITIAL_PROFILE);
        setHourlyWage(50000);
        setRolloverSavings(0);
        setJars(INITIAL_JARS);
        setWallets(INITIAL_WALLETS);
        setTransactions([]);
        setRecurringExpenses(INITIAL_RECURRING);
        setWishlist([]);
        setAssets([]);
        setDiaryEntries([]);
        setBadges(INITIAL_BADGES);
        setSongs(INITIAL_SONGS);
        setIsSyncingCloud(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Auto clean / fresh start reset if previous demo session had inflated data
  useEffect(() => {
    if (localStorage.getItem('hm_clean_fresh_v3') !== 'true') {
      setWallets(INITIAL_WALLETS);
      setTransactions([]);
      setWishlist([]);
      setAssets([]);
      setDiaryEntries([]);
      setRolloverSavings(0);
      setUserProfile(INITIAL_PROFILE);
      setBadges(INITIAL_BADGES);
      localStorage.setItem('hm_clean_fresh_v3', 'true');
    }
  }, []);

  // Sync Audio state
  const handleSetMuted = (muted: boolean) => {
    setIsMutedState(muted);
    setAudioMuted(muted);
  };

  // LocalStorage auto-save
  useEffect(() => { saveStored('hm_wage', hourlyWage); }, [hourlyWage]);
  useEffect(() => { saveStored('hm_profile', userProfile); }, [userProfile]);
  useEffect(() => { saveStored('hm_wallets', wallets); }, [wallets]);
  useEffect(() => { saveStored('hm_jars', jars); }, [jars]);
  useEffect(() => { saveStored('hm_txs', transactions); }, [transactions]);
  useEffect(() => { saveStored('hm_recurring', recurringExpenses); }, [recurringExpenses]);
  useEffect(() => { saveStored('hm_rollover', rolloverSavings); }, [rolloverSavings]);
  useEffect(() => { saveStored('hm_wishlist', wishlist); }, [wishlist]);
  useEffect(() => { saveStored('hm_assets', assets); }, [assets]);
  useEffect(() => { saveStored('hm_diary', diaryEntries); }, [diaryEntries]);
  useEffect(() => { saveStored('hm_badges', badges); }, [badges]);
  useEffect(() => { saveStored('hm_songs', songs); }, [songs]);

  // Dynamic user rank based on transaction counts
  const userRank: UserRank = useMemo(() => {
    const count = transactions.length;
    for (let i = RANKS.length - 1; i >= 0; i--) {
      if (count >= RANKS[i].minTransactions) {
        return RANKS[i];
      }
    }
    return RANKS[0];
  }, [transactions.length]);

  // Total spent calculation for badge evaluations
  const totalBudget = useMemo(() => jars.reduce((sum, j) => sum + j.limit, 0), [jars]);
  const totalSpent = useMemo(
    () => transactions.reduce((sum, t) => sum + Number(t.amount), 0),
    [transactions]
  );

  // Savings allocation ratio (LTSS + FFA)
  const savingsJarProgress = useMemo(() => {
    const ltssLimit = jars.find((j) => j.id === 'ltss')?.limit || 1;
    const ffaLimit = jars.find((j) => j.id === 'ffa')?.limit || 1;
    const totalSavingsLimit = ltssLimit + ffaLimit;
    const allocated = rolloverSavings + (wallets.find((w) => w.id === 'bank')?.balance || 0);
    return Math.min(100, Math.round((allocated / (totalSavingsLimit * 0.5)) * 50));
  }, [jars, rolloverSavings, wallets]);

  // Dynamic Badge achievement evaluation
  useEffect(() => {
    let hasNewlyUnlocked = false;

    const updated = badges.map((b) => {
      let shouldUnlock = b.isUnlocked;
      let newProgress = b.progress;

      // 1. "Tiết Kiệm Bạc" (Silver Saver): Đạt 50% hạn mức hũ tiết kiệm
      if (b.id === 'badge-silver-saver') {
        newProgress = Math.min(100, Math.max(50, savingsJarProgress));
        if (newProgress >= 50) shouldUnlock = true;
      }

      // 2. "Chi Tiêu Tỉnh Táo" (Mindful Spender): Hoàn thành 7 ngày liên tiếp ghi lại chi tiêu
      if (b.id === 'badge-mindful-streak') {
        newProgress = Math.min(7, userProfile.currentStreakDays);
        if (userProfile.currentStreakDays >= 7) shouldUnlock = true;
      }

      // 3. "Người Lập Kế Hoạch" (Master Planner): Thiết lập và đạt mục tiêu cho wishlist
      if (b.id === 'badge-master-planner') {
        const hasCompletedWish =
          wishlist.some((w) => w.targetAchieved || w.daysPassed >= w.daysPlanned) ||
          diaryEntries.some((d) => d.tag === 'Thắng cám dỗ ✨');
        newProgress = hasCompletedWish ? 1 : 0;
        if (hasCompletedWish) shouldUnlock = true;
      }

      // 4. "Tháng Không Lãng Phí" (Zero-Waste Month): Chi tiêu dưới 50% hạn mức tổng (khi có ít nhất 3 đơn)
      if (b.id === 'badge-zero-waste') {
        const spentPercent = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
        newProgress = Math.min(50, spentPercent);
        if (transactions.length >= 3 && spentPercent < 50) {
          shouldUnlock = true;
        }
      }

      // Existing badges:
      if (b.id === 'badge-brake') {
        newProgress = wishlist.length > 0 ? 1 : 0;
        if (wishlist.length > 0) shouldUnlock = true;
      }

      if (b.id === 'badge-sweat') {
        newProgress = Math.min(3, transactions.length);
        if (transactions.length >= 3) shouldUnlock = true;
      }

      if (b.id === 'badge-happy-money') {
        const happyCount = transactions.filter((t) => t.mood === 'love').length;
        newProgress = Math.min(2, happyCount);
        if (happyCount >= 2) shouldUnlock = true;
      }

      if (b.id === 'badge-depreciation') {
        newProgress = Math.min(1, assets.length);
        if (assets.length >= 1) shouldUnlock = true;
      }

      if (b.id === 'badge-rollover') {
        newProgress = rolloverSavings > 0 ? 1 : 0;
        if (rolloverSavings > 0) shouldUnlock = true;
      }

      if (b.id === 'badge-historian') {
        newProgress = Math.min(2, diaryEntries.length);
        if (diaryEntries.length >= 2) shouldUnlock = true;
      }

      if (b.id === 'badge-ceo') {
        newProgress = Math.min(25, transactions.length);
        if (transactions.length >= 25) shouldUnlock = true;
      }

      if (!b.isUnlocked && shouldUnlock) {
        hasNewlyUnlocked = true;
        return {
          ...b,
          progress: newProgress,
          isUnlocked: true,
          unlockedAt: 'Vừa đạt được ✨',
        };
      }

      return {
        ...b,
        progress: newProgress,
      };
    });

    if (hasNewlyUnlocked) {
      setBadges(updated);
      playFanfare();
      triggerMegaConfetti();
    }
  }, [
    transactions.length,
    wishlist.length,
    assets.length,
    diaryEntries.length,
    rolloverSavings,
    userProfile.currentStreakDays,
    totalSpent,
    totalBudget,
    savingsJarProgress,
  ]);

  // User Profile updater with Firestore sync
  const handleUpdateProfile = (updated: Partial<UserProfile>) => {
    const newProfile = { ...userProfile, ...updated };
    setUserProfile(newProfile);
    if (currentUser) {
      saveUserProfileToFirestore(currentUser.uid, newProfile, hourlyWage, rolloverSavings);
    }
  };

  const handleUpdateHourlyWage = (newWage: number) => {
    setHourlyWage(newWage);
    if (currentUser) {
      saveUserProfileToFirestore(currentUser.uid, userProfile, newWage, rolloverSavings);
    }
  };

  const handleUpdateRolloverSavings = (newRollover: number) => {
    setRolloverSavings(newRollover);
    if (currentUser) {
      saveUserProfileToFirestore(currentUser.uid, userProfile, hourlyWage, newRollover);
    }
  };

  // Handler: Add new transaction
  const handleAddTransaction = (newTxData: {
    amount: number;
    jarId: string;
    subCategory: string;
    walletId: string;
    mood: MoodId;
    note: string;
    date: string;
  }) => {
    const workHours = Number((newTxData.amount / (hourlyWage || 1)).toFixed(1));

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      amount: newTxData.amount,
      jarId: newTxData.jarId,
      subCategory: newTxData.subCategory,
      walletId: newTxData.walletId,
      mood: newTxData.mood,
      note: newTxData.note,
      date: newTxData.date,
      workHours,
      createdAt: Date.now(),
    };

    // Deduct balance from chosen wallet
    setWallets((prev) =>
      prev.map((w) =>
        w.id === newTxData.walletId
          ? { ...w, balance: Math.max(0, w.balance - newTxData.amount) }
          : w
      )
    );

    // Prepend transaction
    setTransactions((prev) => [newTx, ...prev]);

    // Save to user's isolated Firestore subcollections
    if (currentUser) {
      saveSubDocument(currentUser.uid, 'transactions', newTx);
      const w = wallets.find((item) => item.id === newTxData.walletId);
      if (w) {
        saveSubDocument(currentUser.uid, 'wallets', {
          ...w,
          balance: Math.max(0, w.balance - newTxData.amount),
        });
      }
    }

    // Check if this transaction pushes the jar over 90% and trigger browser push notification if enabled
    const targetJar = jars.find((j) => j.id === newTxData.jarId);
    if (targetJar && targetJar.limit > 0) {
      const priorSpent = transactions
        .filter((t) => t.jarId === targetJar.id)
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const newTotalSpent = priorSpent + newTxData.amount;
      const ratio = newTotalSpent / targetJar.limit;

      if (ratio >= 0.9) {
        const pct = Math.round(ratio * 100);
        if (
          typeof window !== 'undefined' &&
          'Notification' in window &&
          Notification.permission === 'granted'
        ) {
          try {
            new Notification('🚨 Happy Mart Fin - Cảnh Báo Chi Tiêu 90%!', {
              body: `Hũ "${targetJar.name}" đã đạt ${pct}% hạn mức ngân sách! Hãy cân nhắc điều chỉnh kịp thời.`,
            });
          } catch (err) {
            console.error('Notification error:', err);
          }
        }
      }
    }

    // Check streak update
    const todayStr = new Date().toISOString().split('T')[0];
    if (userProfile.lastActiveDate !== todayStr) {
      const updatedProfile = {
        ...userProfile,
        currentStreakDays: userProfile.currentStreakDays + 1,
        longestStreakDays: Math.max(userProfile.longestStreakDays, userProfile.currentStreakDays + 1),
        lastActiveDate: todayStr,
      };
      setUserProfile(updatedProfile);
      if (currentUser) {
        saveUserProfileToFirestore(currentUser.uid, updatedProfile, hourlyWage, rolloverSavings);
      }
    }
  };

  // Handler: Delete transaction (Refunds money back into wallet)
  const handleDeleteTransaction = (id: string) => {
    const tx = transactions.find((t) => t.id === id);
    if (!tx) return;

    // Refund wallet
    setWallets((prev) =>
      prev.map((w) =>
        w.id === tx.walletId ? { ...w, balance: w.balance + tx.amount } : w
      )
    );

    setTransactions((prev) => prev.filter((t) => t.id !== id));

    // Cloud sync
    if (currentUser) {
      deleteSubDocument(currentUser.uid, 'transactions', id);
      const w = wallets.find((item) => item.id === tx.walletId);
      if (w) {
        saveSubDocument(currentUser.uid, 'wallets', {
          ...w,
          balance: w.balance + tx.amount,
        });
      }
    }
  };

  // Handler: Edit transaction (Adjusts wallet differences and updates data)
  const handleEditTransaction = (updatedTx: Transaction) => {
    const oldTx = transactions.find((t) => t.id === updatedTx.id);
    if (!oldTx) return;

    const newWorkHours = Number((updatedTx.amount / (hourlyWage || 1)).toFixed(1));
    const finalTx: Transaction = { ...updatedTx, workHours: newWorkHours };

    // Adjust wallet balances
    setWallets((prev) =>
      prev.map((w) => {
        // If same wallet: adjust difference
        if (w.id === oldTx.walletId && w.id === updatedTx.walletId) {
          const diff = updatedTx.amount - oldTx.amount;
          return { ...w, balance: Math.max(0, w.balance - diff) };
        }
        // If wallet changed: refund old, deduct new
        if (w.id === oldTx.walletId) {
          return { ...w, balance: w.balance + oldTx.amount };
        }
        if (w.id === updatedTx.walletId) {
          return { ...w, balance: Math.max(0, w.balance - updatedTx.amount) };
        }
        return w;
      })
    );

    setTransactions((prev) =>
      prev.map((t) => (t.id === updatedTx.id ? finalTx : t))
    );

    if (currentUser) {
      saveSubDocument(currentUser.uid, 'transactions', finalTx);
    }
  };

  // Handler: Recurring Expense actions
  const handleAddRecurringExpense = (
    expenseData: Omit<RecurringExpense, 'id'>
  ) => {
    const newRec: RecurringExpense = {
      ...expenseData,
      id: `rec-${Date.now()}`,
    };
    setRecurringExpenses((prev) => [...prev, newRec]);
    if (currentUser) {
      saveSubDocument(currentUser.uid, 'recurring', newRec);
    }
  };

  const handleToggleRecurringExpense = (id: string) => {
    setRecurringExpenses((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const updated = { ...r, isActive: !r.isActive };
          if (currentUser) {
            saveSubDocument(currentUser.uid, 'recurring', updated);
          }
          return updated;
        }
        return r;
      })
    );
  };

  const handleDeleteRecurringExpense = (id: string) => {
    setRecurringExpenses((prev) => prev.filter((r) => r.id !== id));
    if (currentUser) {
      deleteSubDocument(currentUser.uid, 'recurring', id);
    }
  };

  // Handler: Subcategory quick click to scan
  const handleSelectSubcategoryForScan = (jarId: string, subCategory: string) => {
    setScanPrefillJar(jarId);
    setScanPrefillSub(subCategory);
    setTab('scanner');
  };

  // Handler: Update Jar Limit
  const handleUpdateJarLimit = (jarId: string, newLimit: number) => {
    setJars((prev) =>
      prev.map((j) => {
        if (j.id === jarId) {
          const updated = { ...j, limit: newLimit };
          if (currentUser) {
            saveSubDocument(currentUser.uid, 'jars', updated);
          }
          return updated;
        }
        return j;
      })
    );
  };

  // Handler: Add SubCategory to Jar
  const handleAddSubCategory = (jarId: string, subName: string) => {
    setJars((prev) =>
      prev.map((j) => {
        if (j.id === jarId && !j.subs.includes(subName)) {
          const updated = { ...j, subs: [...j.subs, subName] };
          if (currentUser) {
            saveSubDocument(currentUser.uid, 'jars', updated);
          }
          return updated;
        }
        return j;
      })
    );
  };

  // Handler: Wishlist actions
  const handleAddWishlistItem = (
    itemData: Omit<WishlistItem, 'id' | 'daysPassed' | 'createdAt'>
  ) => {
    const newItem: WishlistItem = {
      ...itemData,
      id: `wish-${Date.now()}`,
      daysPassed: 0,
      createdAt: new Date().toISOString().split('T')[0],
      targetAchieved: false,
    };
    setWishlist((prev) => [newItem, ...prev]);
    if (currentUser) {
      saveSubDocument(currentUser.uid, 'wishlist', newItem);
    }
  };

  const handleAdvanceDayWishlist = (id: string) => {
    setWishlist((prev) =>
      prev.map((w) => {
        if (w.id === id) {
          const nextDays = Math.min(w.daysPlanned, w.daysPassed + 1);
          const updated = {
            ...w,
            daysPassed: nextDays,
            targetAchieved: nextDays >= w.daysPlanned,
          };
          if (currentUser) {
            saveSubDocument(currentUser.uid, 'wishlist', updated);
          }
          return updated;
        }
        return w;
      })
    );
  };

  const handleConvertToExpenseWishlist = (item: WishlistItem) => {
    // Add to transactions
    handleAddTransaction({
      amount: item.price,
      jarId: 'play',
      subCategory: item.name,
      walletId: wallets[0]?.id || 'cash',
      mood: 'love',
      note: `Mua sau khi đắn đo ${item.daysPassed}/${item.daysPlanned} ngày: ${item.note}`,
      date: new Date().toISOString().split('T')[0],
    });

    setWishlist((prev) => prev.filter((w) => w.id !== item.id));
    if (currentUser) {
      deleteSubDocument(currentUser.uid, 'wishlist', item.id);
    }
    alert(`Đã hoàn tất thanh toán món "${item.name}"! Bạn đã kiên nhẫn đủ thời gian cần thiết! 🛒`);
  };

  const handleCancelAndSaveWishlist = (item: WishlistItem) => {
    const entry: DiaryEntry = {
      id: `diary-${Date.now()}`,
      date: new Date().toLocaleDateString('vi-VN'),
      content: `Mình đã kiên định không mua món "${item.name}" (${item.price.toLocaleString('vi-VN')} đ) sau ${item.daysPassed} ngày suy nghĩ. Cảm giác làm chủ tài chính thật tuyệt vời!`,
      feelingScore: 5,
      tag: 'Thắng cám dỗ ✨',
      savedAmount: item.price,
    };
    setDiaryEntries((prev) => [entry, ...prev]);
    setWishlist((prev) => prev.filter((w) => w.id !== item.id));
    if (currentUser) {
      saveSubDocument(currentUser.uid, 'diary', entry);
      deleteSubDocument(currentUser.uid, 'wishlist', item.id);
    }
    alert(`Chúc mừng bạn! Bạn đã giữ lại được ${item.price.toLocaleString('vi-VN')} đ vào túi thay vì tiêu bốc đồng! 🐷🎉`);
  };

  const handleDeleteWishlistItem = (id: string) => {
    setWishlist((prev) => prev.filter((w) => w.id !== id));
    if (currentUser) {
      deleteSubDocument(currentUser.uid, 'wishlist', id);
    }
  };

  // Handler: Favorite Songs actions
  const handleAddSong = (songData: Omit<FavoriteSong, 'id'>) => {
    const newSong: FavoriteSong = {
      ...songData,
      id: `song-${Date.now()}`,
      createdAt: Date.now(),
    };
    setSongs((prev) => [newSong, ...prev]);
    if (currentUser) {
      saveSubDocument(currentUser.uid, 'songs', newSong);
    }
  };

  const handleEditSong = (id: string, updatedFields: Partial<FavoriteSong>) => {
    setSongs((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const updated = { ...s, ...updatedFields };
          if (currentUser) {
            saveSubDocument(currentUser.uid, 'songs', updated);
          }
          return updated;
        }
        return s;
      })
    );
  };

  const handleToggleFavoriteSong = (id: string) => {
    setSongs((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const updated = { ...s, isFavorite: !s.isFavorite };
          if (currentUser) {
            saveSubDocument(currentUser.uid, 'songs', updated);
          }
          return updated;
        }
        return s;
      })
    );
  };

  const handleDeleteSong = (id: string) => {
    setSongs((prev) => prev.filter((s) => s.id !== id));
    if (currentUser) {
      deleteSubDocument(currentUser.uid, 'songs', id);
    }
  };

  // Handler: Asset Depreciation actions
  const handleAddAsset = (assetData: Omit<AssetDepreciation, 'id'>) => {
    const newAsset: AssetDepreciation = {
      ...assetData,
      id: `asset-${Date.now()}`,
    };
    setAssets((prev) => [newAsset, ...prev]);
    if (currentUser) {
      saveSubDocument(currentUser.uid, 'assets', newAsset);
    }
  };

  const handleIncrementAssetUsage = (id: string, days: number) => {
    setAssets((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          const updated = { ...a, daysUsed: a.daysUsed + days };
          if (currentUser) {
            saveSubDocument(currentUser.uid, 'assets', updated);
          }
          return updated;
        }
        return a;
      })
    );
  };

  const handleDeleteAsset = (id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
    if (currentUser) {
      deleteSubDocument(currentUser.uid, 'assets', id);
    }
  };

  // Handler: Financial Diary
  const handleAddDiaryEntry = (entryData: Omit<DiaryEntry, 'id'>) => {
    const newEntry: DiaryEntry = {
      ...entryData,
      id: `diary-${Date.now()}`,
    };
    setDiaryEntries((prev) => [newEntry, ...prev]);
    if (currentUser) {
      saveSubDocument(currentUser.uid, 'diary', newEntry);
    }

    // Check streak update
    const todayStr = new Date().toISOString().split('T')[0];
    if (userProfile.lastActiveDate !== todayStr) {
      const updatedProfile = {
        ...userProfile,
        currentStreakDays: userProfile.currentStreakDays + 1,
        longestStreakDays: Math.max(userProfile.longestStreakDays, userProfile.currentStreakDays + 1),
        lastActiveDate: todayStr,
      };
      setUserProfile(updatedProfile);
      if (currentUser) {
        saveUserProfileToFirestore(currentUser.uid, updatedProfile, hourlyWage, rolloverSavings);
      }
    }
  };

  const handleDeleteDiaryEntry = (id: string) => {
    setDiaryEntries((prev) => prev.filter((d) => d.id !== id));
    if (currentUser) {
      deleteSubDocument(currentUser.uid, 'diary', id);
    }
  };

  // Settings & Wallet Management
  const handleUpdateWalletBalance = (id: string, newBalance: number) => {
    setWallets((prev) =>
      prev.map((w) => {
        if (w.id === id) {
          const updated = { ...w, balance: newBalance };
          if (currentUser) {
            saveSubDocument(currentUser.uid, 'wallets', updated);
          }
          return updated;
        }
        return w;
      })
    );
  };

  const handleAddWallet = (name: string, balance: number, icon: string) => {
    const newW: Wallet = {
      id: `wallet-${Date.now()}`,
      name,
      balance,
      icon: icon || '💳',
    };
    setWallets((prev) => [...prev, newW]);
    if (currentUser) {
      saveSubDocument(currentUser.uid, 'wallets', newW);
    }
  };

  const handleDeleteWallet = (id: string) => {
    setWallets((prev) => prev.filter((w) => w.id !== id));
    if (currentUser) {
      deleteSubDocument(currentUser.uid, 'wallets', id);
    }
  };

  // Backup & Restore
  const handleExportData = () => {
    const data = {
      hourlyWage,
      userProfile,
      wallets,
      jars,
      transactions,
      recurringExpenses,
      rolloverSavings,
      wishlist,
      assets,
      diaryEntries,
      badges,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `happy-mart-fin-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (jsonStr: string) => {
    const data = JSON.parse(jsonStr);
    if (data.hourlyWage) setHourlyWage(data.hourlyWage);
    if (data.userProfile) setUserProfile(data.userProfile);
    if (data.wallets) setWallets(data.wallets);
    if (data.jars) setJars(data.jars);
    if (data.transactions) setTransactions(data.transactions);
    if (data.recurringExpenses) setRecurringExpenses(data.recurringExpenses);
    if (data.rolloverSavings !== undefined) setRolloverSavings(data.rolloverSavings);
    if (data.wishlist) setWishlist(data.wishlist);
    if (data.assets) setAssets(data.assets);
    if (data.diaryEntries) setDiaryEntries(data.diaryEntries);
    if (data.badges) setBadges(data.badges);
  };

  const handleResetAllData = () => {
    setHourlyWage(50000);
    setUserProfile(INITIAL_PROFILE);
    setWallets(INITIAL_WALLETS);
    setJars(INITIAL_JARS);
    setTransactions(INITIAL_TRANSACTIONS);
    setRecurringExpenses(INITIAL_RECURRING);
    setRolloverSavings(1200000);
    setWishlist(INITIAL_WISHLIST);
    setAssets(INITIAL_ASSETS);
    setDiaryEntries(INITIAL_DIARY);
    setBadges(INITIAL_BADGES);
    alert('Đã khôi phục toàn bộ dữ liệu về mặc định ban đầu!');
  };

  const unlockedBadgeCount = badges.filter((b) => b.isUnlocked).length;

  const warningJarsCount = useMemo(() => {
    const jarSpentMap: Record<string, number> = {};
    jars.forEach((j) => (jarSpentMap[j.id] = 0));
    transactions.forEach((t) => {
      if (jarSpentMap[t.jarId] !== undefined) {
        jarSpentMap[t.jarId] += Number(t.amount);
      }
    });

    return jars.filter((j) => {
      if (j.limit <= 0) return false;
      const spent = jarSpentMap[j.id] || 0;
      return spent / j.limit >= 0.9;
    }).length;
  }, [jars, transactions]);

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-gray-800 antialiased selection:bg-pink-200">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
        {/* Top Header */}
        <Header
          hourlyWage={hourlyWage}
          setHourlyWage={handleUpdateHourlyWage}
          userRank={userRank}
          isMuted={isMuted}
          setIsMuted={handleSetMuted}
          onOpenSettings={() => setIsSettingsOpen(true)}
          totalTransactionsCount={transactions.length}
          currentUser={currentUser}
          userProfile={userProfile}
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenMusicStation={() => setIsMusicStationOpen(true)}
        />

        {/* User Account Separation & Multi-user status banner */}
        {currentUser ? (
          <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl px-4 py-2.5 my-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs shadow-2xs animate-fadeIn">
            <div className="flex items-center gap-2 text-emerald-900 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>
                Tài khoản cá nhân: <strong className="text-emerald-950 font-black">{userProfile.name}</strong> ({currentUser.email}) · Dữ liệu 6 hũ & thu chi được lưu trữ riêng biệt trên đám mây
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsAuthOpen(true)}
                className="px-3 py-1 bg-white hover:bg-emerald-100 text-emerald-800 rounded-xl font-bold border border-emerald-300 transition-colors shadow-2xs"
              >
                Xem Thẻ Thành Viên 💳
              </button>
              <button
                type="button"
                onClick={() => setIsAuthOpen(true)}
                className="text-[11px] text-gray-500 hover:text-rose-600 underline font-medium"
              >
                Đổi tài khoản
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-pink-50 via-purple-50 to-pink-50 border-2 border-pink-200 rounded-2xl p-3.5 my-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-2xs animate-fadeIn">
            <div className="flex items-center gap-2.5 text-gray-700">
              <span className="text-2xl p-1 bg-white rounded-xl shadow-2xs shrink-0">🏪</span>
              <div>
                <strong className="text-pink-900 block font-black text-xs sm:text-sm">
                  Bạn đang trải nghiệm ở chế độ dùng thử.
                </strong>
                <span className="text-gray-500 text-[11px]">
                  Tạo tài khoản hoặc đăng nhập để tách biệt hoàn toàn 6 hũ, ví tiền và lịch sử hóa đơn cho từng người dùng khi chia sẻ ứng dụng!
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsAuthOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-95 text-white font-black rounded-xl shadow-xs transition-all shrink-0 active:scale-95"
            >
              Tạo Tài Khoản / Đăng Nhập ✨
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <Navigation
          currentTab={tab}
          setTab={setTab}
          coolingCount={wishlist.length}
          unlockedBadgeCount={unlockedBadgeCount}
          warningJarsCount={warningJarsCount}
        />

        {/* Tab 1: 6 Jars & Overview */}
        {tab === 'overview' && (
          <JarsOverview
            jars={jars}
            wallets={wallets}
            transactions={transactions}
            rolloverSavings={rolloverSavings}
            setRolloverSavings={handleUpdateRolloverSavings}
            hourlyWage={hourlyWage}
            onSelectSubcategoryForScan={handleSelectSubcategoryForScan}
            onUpdateJarLimit={handleUpdateJarLimit}
            onAddSubCategory={handleAddSubCategory}
          />
        )}

        {/* Tab 2: POS Scanner Checkout */}
        {tab === 'scanner' && (
          <ScannerCheckout
            jars={jars}
            wallets={wallets}
            hourlyWage={hourlyWage}
            initialJarId={scanPrefillJar}
            initialSubCategory={scanPrefillSub}
            onAddTransaction={handleAddTransaction}
          />
        )}

        {/* Tab 3: Financial Cash Flow Forecasting (3-6 Months) */}
        {tab === 'forecast' && (
          <FinancialForecast
            hourlyWage={hourlyWage}
            setHourlyWage={setHourlyWage}
            monthlyWorkHours={userProfile.monthlyWorkHours}
            setMonthlyWorkHours={(h) =>
              setUserProfile((prev) => ({ ...prev, monthlyWorkHours: h }))
            }
            jars={jars}
            wallets={wallets}
            recurringExpenses={recurringExpenses}
            onAddRecurringExpense={handleAddRecurringExpense}
            onToggleRecurringExpense={handleToggleRecurringExpense}
            onDeleteRecurringExpense={handleDeleteRecurringExpense}
            transactions={transactions}
            rolloverSavings={rolloverSavings}
          />
        )}

        {/* Tab 4: Supermarket Receipt & Mood History */}
        {tab === 'receipt' && (
          <ReceiptHistory
            transactions={transactions}
            jars={jars}
            wallets={wallets}
            hourlyWage={hourlyWage}
            onDeleteTransaction={handleDeleteTransaction}
            onEditTransaction={handleEditTransaction}
          />
        )}

        {/* Tab 5: Cooling-off Wishlist & Depreciation & Diary */}
        {tab === 'special' && (
          <div className="space-y-6">
            <CoolingWishlist
              wishlist={wishlist}
              onAddWishlistItem={handleAddWishlistItem}
              onAdvanceDay={handleAdvanceDayWishlist}
              onConvertToExpense={handleConvertToExpenseWishlist}
              onCancelAndSave={handleCancelAndSaveWishlist}
              onDeleteItem={handleDeleteWishlistItem}
            />

            <AssetTracker
              assets={assets}
              onAddAsset={handleAddAsset}
              onIncrementUsage={handleIncrementAssetUsage}
              onDeleteAsset={handleDeleteAsset}
            />

            <FinancialDiary
              entries={diaryEntries}
              onAddEntry={handleAddDiaryEntry}
              onDeleteEntry={handleDeleteDiaryEntry}
            />
          </div>
        )}

        {/* Tab 6: Collectible Supermarket Apron & Career Badges & User Profile */}
        {tab === 'badges' && (
          <BadgesApron
            badges={badges}
            userRank={userRank}
            userProfile={userProfile}
            setUserProfile={setUserProfile}
            totalTransactionsCount={transactions.length}
            songs={songs}
            onOpenMusicStation={() => setIsMusicStationOpen(true)}
          />
        )}

        {/* Footer */}
        <footer className="mt-12 text-center text-xs text-gray-400 py-6 border-t border-pink-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 font-medium text-gray-500">
            <span>🛒 HAPPY MART FIN</span>
            <span>·</span>
            <span>Siêu Thị Tài Chính Dopamine Pastel</span>
          </div>
          <div className="text-[11px] text-gray-400">
            Dự Báo Dòng Tiền 3-6 Tháng · Kịch Bản Tài Chính · Hệ Thống Huy Hiệu & Thẻ Thành Viên
          </div>
        </footer>

        {/* Settings Modal */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          wallets={wallets}
          onUpdateWalletBalance={handleUpdateWalletBalance}
          onAddWallet={handleAddWallet}
          onDeleteWallet={handleDeleteWallet}
          onResetAllData={handleResetAllData}
          onExportData={handleExportData}
          onImportData={handleImportData}
        />

        {/* Auth Modal for Multi-user Account Separation */}
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          currentUser={currentUser}
          userProfile={userProfile}
          onUpdateProfile={handleUpdateProfile}
        />

        {/* Floating Music Player */}
        <FloatingMusicPlayer
          songs={songs}
          onOpenStation={() => setIsMusicStationOpen(true)}
          onToggleFavoriteSong={handleToggleFavoriteSong}
        />

        {/* Music Station Modal */}
        <MusicStationModal
          isOpen={isMusicStationOpen}
          onClose={() => setIsMusicStationOpen(false)}
          songs={songs}
          onAddSong={handleAddSong}
          onEditSong={handleEditSong}
          onToggleFavoriteSong={handleToggleFavoriteSong}
          onDeleteSong={handleDeleteSong}
        />
      </div>
    </div>
  );
}
