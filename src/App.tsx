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
  SavingsFund,
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
  INITIAL_SAVINGS_FUNDS,
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
  getCanonicalUserId,
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
  const [scanPrefillWalletId, setScanPrefillWalletId] = useState<string>('cash');
  const [scanPrefillTargetWalletId, setScanPrefillTargetWalletId] = useState<string>('bank');
  const [scanMode, setScanMode] = useState<'expense' | 'income' | 'transfer'>('expense');

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

  const [savingsFunds, setSavingsFunds] = useState<SavingsFund[]>(() =>
    loadStored<SavingsFund[]>('hm_savings_funds', INITIAL_SAVINGS_FUNDS)
  );

  // Canonical User ID - Guarantees that any device logging in with the same email uses the exact same account
  const activeUserId = useMemo(() => {
    return currentUser ? getCanonicalUserId(currentUser) : null;
  }, [currentUser]);

  // Handler to reload full user data from cloud (cross-device sync)
  const handleReloadCloudData = async () => {
    if (!currentUser) return;
    setIsSyncingCloud(true);
    try {
      const cloudData = await loadUserDataFromFirestore(currentUser);
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
        if (cloudData.songs) {
          setSongs(cloudData.songs);
        }
        if (cloudData.savingsFunds) {
          setSavingsFunds(cloudData.savingsFunds);
        }
      }
    } catch (err) {
      console.error('Failed to reload cloud data:', err);
    } finally {
      setIsSyncingCloud(false);
    }
  };

  // Listen to Firebase Auth state to isolate user accounts
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        setIsSyncingCloud(true);
        try {
          const cloudData = await loadUserDataFromFirestore(user);
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
            if (cloudData.songs) {
              setSongs(cloudData.songs);
            }
            if (cloudData.savingsFunds) {
              setSavingsFunds(cloudData.savingsFunds);
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
        setSavingsFunds(INITIAL_SAVINGS_FUNDS);
        setIsSyncingCloud(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Auto-sync when returning to the app window/tab
  useEffect(() => {
    const handleFocusSync = () => {
      if (currentUser && document.visibilityState === 'visible') {
        handleReloadCloudData();
      }
    };
    window.addEventListener('visibilitychange', handleFocusSync);
    window.addEventListener('focus', handleFocusSync);
    return () => {
      window.removeEventListener('visibilitychange', handleFocusSync);
      window.removeEventListener('focus', handleFocusSync);
    };
  }, [currentUser]);

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
  useEffect(() => { saveStored('hm_savings_funds', savingsFunds); }, [savingsFunds]);

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

  // Total monthly auto-deduction from savings funds (MẶC ĐỊNH CHI ĐỂ TIẾT KIỆM)
  const totalMonthlySavings = useMemo(() => {
    return savingsFunds
      .filter((f) => !f.isCompleted)
      .reduce((sum, f) => sum + f.monthlyAmount, 0);
  }, [savingsFunds]);

  // Total spent calculation for badge evaluations (bao gồm cả khoản chi tự động trích tiết kiệm định kỳ)
  const totalBudget = useMemo(() => jars.reduce((sum, j) => sum + j.limit, 0), [jars]);
  const totalSpent = useMemo(
    () =>
      transactions.filter((t) => t.type !== 'income').reduce((sum, t) => sum + Number(t.amount), 0) +
      totalMonthlySavings,
    [transactions, totalMonthlySavings]
  );
  const totalIncome = useMemo(
    () => transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0),
    [transactions]
  );

  // Savings allocation ratio (LTSS + FFA + Các quỹ tiết kiệm mục tiêu)
  const savingsJarProgress = useMemo(() => {
    const ltssLimit = jars.find((j) => j.id === 'ltss')?.limit || 1;
    const ffaLimit = jars.find((j) => j.id === 'ffa')?.limit || 1;
    const totalSavingsLimit = ltssLimit + ffaLimit;
    const totalCurrentSavings = savingsFunds.reduce((sum, f) => sum + f.currentSaved, 0);
    const allocated = rolloverSavings + totalCurrentSavings + (wallets.find((w) => w.id === 'bank')?.balance || 0);
    return Math.min(100, Math.round((allocated / (totalSavingsLimit * 0.5)) * 50));
  }, [jars, rolloverSavings, wallets, savingsFunds]);

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
    if (activeUserId) {
      saveUserProfileToFirestore(activeUserId, newProfile, hourlyWage, rolloverSavings);
    }
  };

  const handleUpdateHourlyWage = (newWage: number) => {
    setHourlyWage(newWage);
    if (activeUserId) {
      saveUserProfileToFirestore(activeUserId, userProfile, newWage, rolloverSavings);
    }
  };

  const handleUpdateRolloverSavings = (newRollover: number) => {
    setRolloverSavings(newRollover);
    if (activeUserId) {
      saveUserProfileToFirestore(activeUserId, userProfile, hourlyWage, newRollover);
    }
  };

  // Handler: Add new transaction (Support cả Thu Nhập, Chi Tiêu, và Chuyển Tiền giữa các ví)
  const handleAddTransaction = (newTxData: {
    amount: number;
    jarId: string;
    subCategory: string;
    walletId: string;
    targetWalletId?: string;
    mood: MoodId;
    note: string;
    date: string;
    type?: 'expense' | 'income' | 'transfer';
    source?: string;
  }) => {
    const isTransfer = newTxData.type === 'transfer';
    const isIncome = newTxData.type === 'income';
    const workHours = isTransfer ? 0 : Number((newTxData.amount / (hourlyWage || 1)).toFixed(1));

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      amount: newTxData.amount,
      jarId: newTxData.jarId || 'ltss',
      subCategory: newTxData.subCategory,
      walletId: newTxData.walletId,
      targetWalletId: newTxData.targetWalletId,
      mood: newTxData.mood,
      note: newTxData.note,
      date: newTxData.date,
      workHours,
      createdAt: Date.now(),
      type: newTxData.type || 'expense',
      source: newTxData.source,
    };

    if (isTransfer) {
      const srcId = newTxData.walletId;
      const tgtId = newTxData.targetWalletId;

      // Update wallets: deduct source wallet, increase target wallet
      setWallets((prev) =>
        prev.map((w) => {
          if (w.id === srcId) {
            return { ...w, balance: Math.max(0, w.balance - newTxData.amount) };
          }
          if (w.id === tgtId) {
            return { ...w, balance: w.balance + newTxData.amount };
          }
          return w;
        })
      );

      setTransactions((prev) => [newTx, ...prev]);

      if (activeUserId) {
        saveSubDocument(activeUserId, 'transactions', newTx);
        const srcW = wallets.find((w) => w.id === srcId);
        if (srcW) {
          saveSubDocument(activeUserId, 'wallets', {
            ...srcW,
            balance: Math.max(0, srcW.balance - newTxData.amount),
          });
        }
        const tgtW = wallets.find((w) => w.id === tgtId);
        if (tgtW) {
          saveSubDocument(activeUserId, 'wallets', {
            ...tgtW,
            balance: tgtW.balance + newTxData.amount,
          });
        }
      }
    } else {
      // Normal Income or Expense
      setWallets((prev) =>
        prev.map((w) => {
          if (w.id === newTxData.walletId) {
            const newBal = isIncome
              ? w.balance + newTxData.amount
              : Math.max(0, w.balance - newTxData.amount);
            return { ...w, balance: newBal };
          }
          return w;
        })
      );

      // Prepend transaction
      setTransactions((prev) => [newTx, ...prev]);

      // Save to user's isolated Firestore subcollections
      if (activeUserId) {
        saveSubDocument(activeUserId, 'transactions', newTx);
        const w = wallets.find((item) => item.id === newTxData.walletId);
        if (w) {
          const newBal = isIncome
            ? w.balance + newTxData.amount
            : Math.max(0, w.balance - newTxData.amount);
          saveSubDocument(activeUserId, 'wallets', {
            ...w,
            balance: newBal,
          });
        }
      }

      // Check if this transaction pushes the jar over 90% (chỉ áp dụng cho CHI TIÊU)
      if (!isIncome) {
        const targetJar = jars.find((j) => j.id === newTxData.jarId);
        if (targetJar && targetJar.limit > 0) {
          const priorSpent = transactions
            .filter((t) => t.type !== 'income' && t.type !== 'transfer' && t.jarId === targetJar.id)
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
      if (activeUserId) {
        saveUserProfileToFirestore(activeUserId, updatedProfile, hourlyWage, rolloverSavings);
      }
    }
  };

  // Handler: Delete transaction (Hoàn trả tiền nếu xóa chi tiêu, hoặc trừ lại nếu xóa thu nhập, hoàn cả 2 ví nếu xóa chuyển tiền)
  const handleDeleteTransaction = (id: string) => {
    const tx = transactions.find((t) => t.id === id);
    if (!tx) return;

    if (tx.type === 'transfer') {
      const srcId = tx.walletId;
      const tgtId = tx.targetWalletId;

      setWallets((prev) =>
        prev.map((w) => {
          if (w.id === srcId) {
            return { ...w, balance: w.balance + tx.amount };
          }
          if (w.id === tgtId) {
            return { ...w, balance: Math.max(0, w.balance - tx.amount) };
          }
          return w;
        })
      );

      setTransactions((prev) => prev.filter((t) => t.id !== id));

      if (activeUserId) {
        deleteSubDocument(activeUserId, 'transactions', id);
        const srcW = wallets.find((w) => w.id === srcId);
        if (srcW) {
          saveSubDocument(activeUserId, 'wallets', {
            ...srcW,
            balance: srcW.balance + tx.amount,
          });
        }
        const tgtW = wallets.find((w) => w.id === tgtId);
        if (tgtW) {
          saveSubDocument(activeUserId, 'wallets', {
            ...tgtW,
            balance: Math.max(0, tgtW.balance - tx.amount),
          });
        }
      }
      return;
    }

    const isIncome = tx.type === 'income';

    setWallets((prev) =>
      prev.map((w) => {
        if (w.id === tx.walletId) {
          const newBal = isIncome
            ? Math.max(0, w.balance - tx.amount)
            : w.balance + tx.amount;
          return { ...w, balance: newBal };
        }
        return w;
      })
    );

    setTransactions((prev) => prev.filter((t) => t.id !== id));

    // Cloud sync
    if (activeUserId) {
      deleteSubDocument(activeUserId, 'transactions', id);
      const w = wallets.find((item) => item.id === tx.walletId);
      if (w) {
        const newBal = isIncome
          ? Math.max(0, w.balance - tx.amount)
          : w.balance + tx.amount;
        saveSubDocument(activeUserId, 'wallets', {
          ...w,
          balance: newBal,
        });
      }
    }
  };

  // Handler: Edit transaction (Điều chỉnh chênh lệch số dư ví tương ứng)
  const handleEditTransaction = (updatedTx: Transaction) => {
    const oldTx = transactions.find((t) => t.id === updatedTx.id);
    if (!oldTx) return;

    const newWorkHours = updatedTx.type === 'transfer' ? 0 : Number((updatedTx.amount / (hourlyWage || 1)).toFixed(1));
    const finalTx: Transaction = { ...updatedTx, workHours: newWorkHours };

    // Revert old effect and apply new effect on wallets
    setWallets((prev) =>
      prev.map((w) => {
        let bal = w.balance;

        // Revert old
        if (oldTx.type === 'transfer') {
          if (w.id === oldTx.walletId) bal += oldTx.amount;
          if (w.id === oldTx.targetWalletId) bal = Math.max(0, bal - oldTx.amount);
        } else if (oldTx.type === 'income') {
          if (w.id === oldTx.walletId) bal = Math.max(0, bal - oldTx.amount);
        } else {
          if (w.id === oldTx.walletId) bal += oldTx.amount;
        }

        // Apply new
        if (updatedTx.type === 'transfer') {
          if (w.id === updatedTx.walletId) bal = Math.max(0, bal - updatedTx.amount);
          if (w.id === updatedTx.targetWalletId) bal += updatedTx.amount;
        } else if (updatedTx.type === 'income') {
          if (w.id === updatedTx.walletId) bal += updatedTx.amount;
        } else {
          if (w.id === updatedTx.walletId) bal = Math.max(0, bal - updatedTx.amount);
        }

        return { ...w, balance: Math.max(0, bal) };
      })
    );

    setTransactions((prev) =>
      prev.map((t) => (t.id === updatedTx.id ? finalTx : t))
    );

    if (activeUserId) {
      saveSubDocument(activeUserId, 'transactions', finalTx);
      wallets.forEach((w) => {
        let bal = w.balance;
        if (oldTx.type === 'transfer') {
          if (w.id === oldTx.walletId) bal += oldTx.amount;
          if (w.id === oldTx.targetWalletId) bal = Math.max(0, bal - oldTx.amount);
        } else if (oldTx.type === 'income') {
          if (w.id === oldTx.walletId) bal = Math.max(0, bal - oldTx.amount);
        } else {
          if (w.id === oldTx.walletId) bal += oldTx.amount;
        }

        if (updatedTx.type === 'transfer') {
          if (w.id === updatedTx.walletId) bal = Math.max(0, bal - updatedTx.amount);
          if (w.id === updatedTx.targetWalletId) bal += updatedTx.amount;
        } else if (updatedTx.type === 'income') {
          if (w.id === updatedTx.walletId) bal += updatedTx.amount;
        } else {
          if (w.id === updatedTx.walletId) bal = Math.max(0, bal - updatedTx.amount);
        }

        saveSubDocument(activeUserId, 'wallets', { ...w, balance: Math.max(0, bal) });
      });
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
    if (activeUserId) {
      saveSubDocument(activeUserId, 'recurring', newRec);
    }
  };

  const handleToggleRecurringExpense = (id: string) => {
    setRecurringExpenses((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const updated = { ...r, isActive: !r.isActive };
          if (activeUserId) {
            saveSubDocument(activeUserId, 'recurring', updated);
          }
          return updated;
        }
        return r;
      })
    );
  };

  const handleDeleteRecurringExpense = (id: string) => {
    setRecurringExpenses((prev) => prev.filter((r) => r.id !== id));
    if (activeUserId) {
      deleteSubDocument(activeUserId, 'recurring', id);
    }
  };

  // Handler: Subcategory quick click to scan
  const handleSelectSubcategoryForScan = (jarId: string, subCategory: string) => {
    setScanPrefillJar(jarId);
    setScanPrefillSub(subCategory);
    setScanMode('expense');
    setTab('scanner');
  };

  // Handler: Navigate to scanner in Income mode (with optional prefilled wallet)
  const handleNavigateToIncome = (walletId?: string) => {
    if (walletId) setScanPrefillWalletId(walletId);
    setScanMode('income');
    setTab('scanner');
  };

  // Handler: Navigate to scanner in Transfer mode (chuyển tiền giữa 2 ví)
  const handleNavigateToTransfer = (sourceWalletId?: string, targetWalletId?: string) => {
    if (sourceWalletId) setScanPrefillWalletId(sourceWalletId);
    if (targetWalletId) setScanPrefillTargetWalletId(targetWalletId);
    setScanMode('transfer');
    setTab('scanner');
  };

  // Handler: Update Jar Limit
  const handleUpdateJarLimit = (jarId: string, newLimit: number) => {
    setJars((prev) =>
      prev.map((j) => {
        if (j.id === jarId) {
          const updated = { ...j, limit: newLimit };
          if (activeUserId) {
            saveSubDocument(activeUserId, 'jars', updated);
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
          if (activeUserId) {
            saveSubDocument(activeUserId, 'jars', updated);
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
    if (activeUserId) {
      saveSubDocument(activeUserId, 'wishlist', newItem);
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
          if (activeUserId) {
            saveSubDocument(activeUserId, 'wishlist', updated);
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
    if (activeUserId) {
      deleteSubDocument(activeUserId, 'wishlist', item.id);
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
    if (activeUserId) {
      saveSubDocument(activeUserId, 'diary', entry);
      deleteSubDocument(activeUserId, 'wishlist', item.id);
    }
    alert(`Chúc mừng bạn! Bạn đã giữ lại được ${item.price.toLocaleString('vi-VN')} đ vào túi thay vì tiêu bốc đồng! 🐷🎉`);
  };

  const handleDeleteWishlistItem = (id: string) => {
    setWishlist((prev) => prev.filter((w) => w.id !== id));
    if (activeUserId) {
      deleteSubDocument(activeUserId, 'wishlist', id);
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
    if (activeUserId) {
      saveSubDocument(activeUserId, 'songs', newSong);
    }
  };

  const handleEditSong = (id: string, updatedFields: Partial<FavoriteSong>) => {
    setSongs((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const updated = { ...s, ...updatedFields };
          if (activeUserId) {
            saveSubDocument(activeUserId, 'songs', updated);
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
          if (activeUserId) {
            saveSubDocument(activeUserId, 'songs', updated);
          }
          return updated;
        }
        return s;
      })
    );
  };

  const handleDeleteSong = (id: string) => {
    setSongs((prev) => prev.filter((s) => s.id !== id));
    if (activeUserId) {
      deleteSubDocument(activeUserId, 'songs', id);
    }
  };

  // Handler: Asset Depreciation actions
  const handleAddAsset = (assetData: Omit<AssetDepreciation, 'id'>) => {
    const newAsset: AssetDepreciation = {
      ...assetData,
      id: `asset-${Date.now()}`,
    };
    setAssets((prev) => [newAsset, ...prev]);
    if (activeUserId) {
      saveSubDocument(activeUserId, 'assets', newAsset);
    }
  };

  const handleIncrementAssetUsage = (id: string, days: number) => {
    setAssets((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          const updated = { ...a, daysUsed: a.daysUsed + days };
          if (activeUserId) {
            saveSubDocument(activeUserId, 'assets', updated);
          }
          return updated;
        }
        return a;
      })
    );
  };

  const handleDeleteAsset = (id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
    if (activeUserId) {
      deleteSubDocument(activeUserId, 'assets', id);
    }
  };

  // Handler: Financial Diary
  const handleAddDiaryEntry = (entryData: Omit<DiaryEntry, 'id'>) => {
    const newEntry: DiaryEntry = {
      ...entryData,
      id: `diary-${Date.now()}`,
    };
    setDiaryEntries((prev) => [newEntry, ...prev]);
    if (activeUserId) {
      saveSubDocument(activeUserId, 'diary', newEntry);
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
      if (activeUserId) {
        saveUserProfileToFirestore(activeUserId, updatedProfile, hourlyWage, rolloverSavings);
      }
    }
  };

  const handleDeleteDiaryEntry = (id: string) => {
    setDiaryEntries((prev) => prev.filter((d) => d.id !== id));
    if (activeUserId) {
      deleteSubDocument(activeUserId, 'diary', id);
    }
  };

  // Settings & Wallet Management
  const handleUpdateWalletBalance = (id: string, newBalance: number) => {
    setWallets((prev) =>
      prev.map((w) => {
        if (w.id === id) {
          const updated = { ...w, balance: newBalance };
          if (activeUserId) {
            saveSubDocument(activeUserId, 'wallets', updated);
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
    if (activeUserId) {
      saveSubDocument(activeUserId, 'wallets', newW);
    }
  };

  const handleDeleteWallet = (id: string) => {
    setWallets((prev) => prev.filter((w) => w.id !== id));
    if (activeUserId) {
      deleteSubDocument(activeUserId, 'wallets', id);
    }
  };

  // Handlers: Savings Funds (Quỹ tiết kiệm mục tiêu con - Tự động trích định kỳ hàng tháng)
  const handleAddSavingsFund = (
    fundData: Omit<SavingsFund, 'id' | 'createdAt'>,
    initialTransferAmount?: number
  ) => {
    const initialSaved = (fundData.currentSaved || 0) + (initialTransferAmount || 0);
    const newFund: SavingsFund = {
      ...fundData,
      id: `fund-${Date.now()}`,
      createdAt: Date.now(),
      currentSaved: initialSaved,
      isCompleted: initialSaved >= fundData.targetAmount,
    };
    setSavingsFunds((prev) => [newFund, ...prev]);

    // If an initial transfer was requested from sourceWalletId to target walletId
    if (
      initialTransferAmount &&
      initialTransferAmount > 0 &&
      fundData.sourceWalletId &&
      fundData.walletId &&
      fundData.sourceWalletId !== fundData.walletId
    ) {
      const srcId = fundData.sourceWalletId;
      const tgtId = fundData.walletId;
      const srcName = wallets.find((w) => w.id === srcId)?.name || 'Ví chuyển';
      const tgtName = wallets.find((w) => w.id === tgtId)?.name || 'Ví nhận';

      // Deduct source wallet, credit target wallet
      setWallets((prev) =>
        prev.map((w) => {
          if (w.id === srcId) {
            return { ...w, balance: Math.max(0, w.balance - initialTransferAmount) };
          }
          if (w.id === tgtId) {
            return { ...w, balance: w.balance + initialTransferAmount };
          }
          return w;
        })
      );

      // Create a transfer transaction record
      const transferTx: Transaction = {
        id: `tx-${Date.now()}`,
        amount: initialTransferAmount,
        jarId: 'ltss',
        subCategory: `Tiết kiệm: ${fundData.name}`,
        walletId: srcId,
        targetWalletId: tgtId,
        mood: 'love',
        note: `Trích tiền tiết kiệm ban đầu cho quỹ "${fundData.name}" (${srcName} ➔ ${tgtName})`,
        date: new Date().toISOString().split('T')[0],
        workHours: 0,
        createdAt: Date.now(),
        type: 'transfer',
        source: `${srcName} ➔ ${tgtName}`,
      };

      setTransactions((prev) => [transferTx, ...prev]);

      if (activeUserId) {
        saveSubDocument(activeUserId, 'transactions', transferTx);
        const srcW = wallets.find((w) => w.id === srcId);
        if (srcW) {
          saveSubDocument(activeUserId, 'wallets', {
            ...srcW,
            balance: Math.max(0, srcW.balance - initialTransferAmount),
          });
        }
        const tgtW = wallets.find((w) => w.id === tgtId);
        if (tgtW) {
          saveSubDocument(activeUserId, 'wallets', {
            ...tgtW,
            balance: tgtW.balance + initialTransferAmount,
          });
        }
      }
    }

    if (activeUserId) {
      saveSubDocument(activeUserId, 'savings_funds', newFund);
    }
  };

  const handleUpdateSavingsFund = (updatedFund: SavingsFund) => {
    setSavingsFunds((prev) =>
      prev.map((f) => (f.id === updatedFund.id ? updatedFund : f))
    );
    if (activeUserId) {
      saveSubDocument(activeUserId, 'savings_funds', updatedFund);
    }
  };

  const handleDeleteSavingsFund = (id: string) => {
    setSavingsFunds((prev) => prev.filter((f) => f.id !== id));
    if (activeUserId) {
      deleteSubDocument(activeUserId, 'savings_funds', id);
    }
  };

  const handleDepositSavingsFund = (
    fundId: string,
    amount: number,
    sourceWalletId?: string,
    targetWalletId?: string
  ) => {
    const fund = savingsFunds.find((f) => f.id === fundId);
    if (!fund) return;
    const newSaved = fund.currentSaved + amount;
    const updated: SavingsFund = {
      ...fund,
      currentSaved: newSaved,
      isCompleted: newSaved >= fund.targetAmount,
    };
    setSavingsFunds((prev) =>
      prev.map((f) => (f.id === fundId ? updated : f))
    );

    const srcId = sourceWalletId || fund.sourceWalletId;
    const tgtId = targetWalletId || fund.walletId;

    if (srcId && tgtId && srcId !== tgtId) {
      const srcName = wallets.find((w) => w.id === srcId)?.name || 'Ví chuyển';
      const tgtName = wallets.find((w) => w.id === tgtId)?.name || 'Ví nhận';

      setWallets((prev) =>
        prev.map((w) => {
          if (w.id === srcId) {
            return { ...w, balance: Math.max(0, w.balance - amount) };
          }
          if (w.id === tgtId) {
            return { ...w, balance: w.balance + amount };
          }
          return w;
        })
      );

      const transferTx: Transaction = {
        id: `tx-${Date.now()}`,
        amount,
        jarId: 'ltss',
        subCategory: `Tiết kiệm: ${fund.name}`,
        walletId: srcId,
        targetWalletId: tgtId,
        mood: 'love',
        note: `Nạp tiền tích lũy vào quỹ "${fund.name}" (${srcName} ➔ ${tgtName})`,
        date: new Date().toISOString().split('T')[0],
        workHours: 0,
        createdAt: Date.now(),
        type: 'transfer',
        source: `${srcName} ➔ ${tgtName}`,
      };

      setTransactions((prev) => [transferTx, ...prev]);

      if (activeUserId) {
        saveSubDocument(activeUserId, 'transactions', transferTx);
        const srcW = wallets.find((w) => w.id === srcId);
        if (srcW) {
          saveSubDocument(activeUserId, 'wallets', {
            ...srcW,
            balance: Math.max(0, srcW.balance - amount),
          });
        }
        const tgtW = wallets.find((w) => w.id === tgtId);
        if (tgtW) {
          saveSubDocument(activeUserId, 'wallets', {
            ...tgtW,
            balance: tgtW.balance + amount,
          });
        }
      }
    }

    if (activeUserId) {
      saveSubDocument(activeUserId, 'savings_funds', updated);
    }
  };

  const handleRelocateSavingsFundWallet = (
    fundId: string,
    fromWalletId: string,
    toWalletId: string,
    amountToMove: number
  ) => {
    const fund = savingsFunds.find((f) => f.id === fundId);
    if (!fund) return;
    if (fromWalletId === toWalletId || amountToMove <= 0) return;

    const fromWallet = wallets.find((w) => w.id === fromWalletId);
    const toWallet = wallets.find((w) => w.id === toWalletId);
    const fromName = fromWallet?.name || 'Ví chuyển';
    const toName = toWallet?.name || 'Ví nhận';

    // 1. Update wallet balances: deduct from fromWallet, credit to toWallet
    setWallets((prev) =>
      prev.map((w) => {
        if (w.id === fromWalletId) {
          return { ...w, balance: Math.max(0, w.balance - amountToMove) };
        }
        if (w.id === toWalletId) {
          return { ...w, balance: w.balance + amountToMove };
        }
        return w;
      })
    );

    // 2. Update fund's destination/holding wallet
    const updatedFund: SavingsFund = {
      ...fund,
      walletId: toWalletId,
    };
    setSavingsFunds((prev) =>
      prev.map((f) => (f.id === fundId ? updatedFund : f))
    );

    // 3. Create transfer transaction record
    const transferTx: Transaction = {
      id: `tx-${Date.now()}`,
      amount: amountToMove,
      jarId: 'ltss',
      subCategory: `Đổi ví tiết kiệm: ${fund.name}`,
      walletId: fromWalletId,
      targetWalletId: toWalletId,
      mood: 'love',
      note: `Chuyển đổi nguồn tiền cất giữ quỹ "${fund.name}" từ ${fromName} sang ${toName}`,
      date: new Date().toISOString().split('T')[0],
      workHours: 0,
      createdAt: Date.now(),
      type: 'transfer',
      source: `${fromName} ➔ ${toName}`,
    };
    setTransactions((prev) => [transferTx, ...prev]);

    // 4. Cloud sync to Firestore
    if (activeUserId) {
      saveSubDocument(activeUserId, 'savings_funds', updatedFund);
      saveSubDocument(activeUserId, 'transactions', transferTx);
      if (fromWallet) {
        saveSubDocument(activeUserId, 'wallets', {
          ...fromWallet,
          balance: Math.max(0, fromWallet.balance - amountToMove),
        });
      }
      if (toWallet) {
        saveSubDocument(activeUserId, 'wallets', {
          ...toWallet,
          balance: toWallet.balance + amountToMove,
        });
      }
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
      songs,
      savingsFunds,
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
    if (data.songs) setSongs(data.songs);
    if (data.savingsFunds) setSavingsFunds(data.savingsFunds);
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
    setSongs(INITIAL_SONGS);
    setSavingsFunds(INITIAL_SAVINGS_FUNDS);
    alert('Đã khôi phục toàn bộ dữ liệu về mặc định ban đầu!');
  };

  const unlockedBadgeCount = badges.filter((b) => b.isUnlocked).length;

  const warningJarsCount = useMemo(() => {
    const jarSpentMap: Record<string, number> = {};
    jars.forEach((j) => (jarSpentMap[j.id] = 0));
    transactions.forEach((t) => {
      if (t.type !== 'income' && jarSpentMap[t.jarId] !== undefined) {
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
            savingsFunds={savingsFunds}
            rolloverSavings={rolloverSavings}
            setRolloverSavings={handleUpdateRolloverSavings}
            hourlyWage={hourlyWage}
            onSelectSubcategoryForScan={handleSelectSubcategoryForScan}
            onNavigateToIncome={handleNavigateToIncome}
            onNavigateToTransfer={handleNavigateToTransfer}
            onUpdateJarLimit={handleUpdateJarLimit}
            onAddSubCategory={handleAddSubCategory}
            onAddSavingsFund={handleAddSavingsFund}
            onUpdateSavingsFund={handleUpdateSavingsFund}
            onDeleteSavingsFund={handleDeleteSavingsFund}
            onDepositSavingsFund={handleDepositSavingsFund}
            onRelocateSavingsFundWallet={handleRelocateSavingsFundWallet}
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
            initialWalletId={scanPrefillWalletId}
            initialTargetWalletId={scanPrefillTargetWalletId}
            initialMode={scanMode}
            onModeChange={setScanMode}
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
            savingsFunds={savingsFunds}
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
