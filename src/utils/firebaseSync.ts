import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from './firestoreErrors';
import {
  Jar,
  Wallet,
  Transaction,
  WishlistItem,
  AssetDepreciation,
  DiaryEntry,
  RecurringExpense,
  UserProfile,
  FavoriteSong,
  SavingsFund,
} from '../types';
import {
  INITIAL_JARS,
  INITIAL_WALLETS,
  INITIAL_RECURRING,
  INITIAL_BADGES,
  INITIAL_SONGS,
  INITIAL_SAVINGS_FUNDS,
} from './storage';

export interface FullUserData {
  userProfile: UserProfile;
  hourlyWage: number;
  rolloverSavings: number;
  jars: Jar[];
  wallets: Wallet[];
  transactions: Transaction[];
  recurringExpenses: RecurringExpense[];
  wishlist: WishlistItem[];
  assets: AssetDepreciation[];
  diaryEntries: DiaryEntry[];
  songs: FavoriteSong[];
  savingsFunds: SavingsFund[];
  canonicalId?: string;
}

/**
 * Computes a deterministic canonical document ID for a user.
 * If user has an email, it is keyed by their normalized email address.
 * This guarantees that signing in with the same email across multiple devices,
 * browsers, or sessions ALWAYS maps to the exact same account and data!
 */
export function getCanonicalUserId(userOrUid: string | { uid: string; email?: string | null }): string {
  if (typeof userOrUid === 'string') {
    return userOrUid;
  }
  if (userOrUid.email && userOrUid.email.trim()) {
    return 'u_' + userOrUid.email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  }
  return userOrUid.uid;
}

/**
 * Loads all data for a specific user ID from Firestore.
 * Always resolves document ID based on normalized email (e.g. u_vuongnguyet65_gmail_com).
 * Fetches all subcollections (jars, wallets, transactions, recurring, etc.).
 * Strictly NEVER overwrites existing data with empty defaults!
 */
export async function loadUserDataFromFirestore(
  userParam: string | { uid: string; email?: string | null; displayName?: string | null }
): Promise<FullUserData> {
  const currentUser = auth.currentUser;
  const userObj = typeof userParam === 'string'
    ? { uid: userParam, email: currentUser?.email || '', displayName: currentUser?.displayName || '' }
    : userParam;

  const email = (userObj.email || currentUser?.email || '').trim().toLowerCase();
  const canonicalId = getCanonicalUserId({ uid: userObj.uid, email });
  const userDocPath = `users/${canonicalId}`;

  try {
    // 1. Gather all candidate IDs associated with this user
    const candidateIds = Array.from(new Set([canonicalId, email, userObj.uid].filter(Boolean)));
    
    // Find first existing user document among candidates
    let primarySnap: any = null;
    let foundProfileData: any = null;

    for (const cid of candidateIds) {
      try {
        const snap = await getDoc(doc(db, 'users', cid));
        if (snap.exists()) {
          primarySnap = snap;
          foundProfileData = snap.data();
          break;
        }
      } catch (e) {
        // Continue fallback
      }
    }

    // 2. Query subcollections across ALL candidates and merge uniquely so no data is ever lost
    const txMap = new Map<string, Transaction>();
    const walletMap = new Map<string, Wallet>();
    const jarMap = new Map<string, Jar>();
    const recMap = new Map<string, RecurringExpense>();
    const wishMap = new Map<string, WishlistItem>();
    const assetMap = new Map<string, AssetDepreciation>();
    const diaryMap = new Map<string, DiaryEntry>();
    const songMap = new Map<string, FavoriteSong>();
    const savingsMap = new Map<string, SavingsFund>();

    await Promise.all(
      candidateIds.map(async (cid) => {
        try {
          const [
            jarsSnap,
            walletsSnap,
            txsSnap,
            recSnap,
            wishSnap,
            assetsSnap,
            diarySnap,
            songsSnap,
            savingsSnap,
          ] = await Promise.all([
            getDocs(collection(db, 'users', cid, 'jars')).catch(() => ({ docs: [] } as any)),
            getDocs(collection(db, 'users', cid, 'wallets')).catch(() => ({ docs: [] } as any)),
            getDocs(collection(db, 'users', cid, 'transactions')).catch(() => ({ docs: [] } as any)),
            getDocs(collection(db, 'users', cid, 'recurring')).catch(() => ({ docs: [] } as any)),
            getDocs(collection(db, 'users', cid, 'wishlist')).catch(() => ({ docs: [] } as any)),
            getDocs(collection(db, 'users', cid, 'assets')).catch(() => ({ docs: [] } as any)),
            getDocs(collection(db, 'users', cid, 'diary')).catch(() => ({ docs: [] } as any)),
            getDocs(collection(db, 'users', cid, 'songs')).catch(() => ({ docs: [] } as any)),
            getDocs(collection(db, 'users', cid, 'savings_funds')).catch(() => ({ docs: [] } as any)),
          ]);

          jarsSnap.docs.forEach((d: any) => { const item = d.data() as Jar; if (item && item.id) jarMap.set(item.id, item); });
          walletsSnap.docs.forEach((d: any) => { const item = d.data() as Wallet; if (item && item.id) walletMap.set(item.id, item); });
          txsSnap.docs.forEach((d: any) => { const item = d.data() as Transaction; if (item && item.id) txMap.set(item.id, item); });
          recSnap.docs.forEach((d: any) => { const item = d.data() as RecurringExpense; if (item && item.id) recMap.set(item.id, item); });
          wishSnap.docs.forEach((d: any) => { const item = d.data() as WishlistItem; if (item && item.id) wishMap.set(item.id, item); });
          assetsSnap.docs.forEach((d: any) => { const item = d.data() as AssetDepreciation; if (item && item.id) assetMap.set(item.id, item); });
          diarySnap.docs.forEach((d: any) => { const item = d.data() as DiaryEntry; if (item && item.id) diaryMap.set(item.id, item); });
          songsSnap.docs.forEach((d: any) => { const item = d.data() as FavoriteSong; if (item && item.id) songMap.set(item.id, item); });
          savingsSnap.docs.forEach((d: any) => { const item = d.data() as SavingsFund; if (item && item.id) savingsMap.set(item.id, item); });
        } catch (err) {
          console.warn(`[firebaseSync] Error reading subcollections for candidate ${cid}:`, err);
        }
      })
    );

    const jars: Jar[] = Array.from(jarMap.values());
    const wallets: Wallet[] = Array.from(walletMap.values());
    const transactions: Transaction[] = Array.from(txMap.values());
    const recurringExpenses: RecurringExpense[] = Array.from(recMap.values());
    const wishlist: WishlistItem[] = Array.from(wishMap.values());
    const assets: AssetDepreciation[] = Array.from(assetMap.values());
    const diaryEntries: DiaryEntry[] = Array.from(diaryMap.values());
    const songs: FavoriteSong[] = Array.from(songMap.values());
    const savingsFunds: SavingsFund[] = Array.from(savingsMap.values());

    // Sort transactions by createdAt/date desc
    transactions.sort((a: Transaction, b: Transaction) => (b.createdAt || 0) - (a.createdAt || 0));

    const emailPrefix = email ? email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase() : '';
    const memberCode = emailPrefix ? `HM-${emailPrefix}` : `HM-${canonicalId.slice(0, 6).toUpperCase()}`;

    // 3. User profile resolution
    const userData = foundProfileData || {};
    const userProfile: UserProfile = {
      uid: canonicalId,
      email: userData.email || email,
      name: userData.displayName || userObj.displayName || currentUser?.displayName || (email ? email.split('@')[0] : 'Thành Viên Siêu Thị'),
      avatar: userData.avatar || '🥑',
      memberId: userData.memberId || memberCode,
      joinedDate: userData.joinedDate || new Date().toLocaleDateString('vi-VN'),
      monthlyWorkHours: Number(userData.monthlyWorkHours) || 160,
      currentStreakDays: Number(userData.currentStreakDays) || 1,
      longestStreakDays: Number(userData.longestStreakDays) || 1,
      lastActiveDate: userData.lastActiveDate || new Date().toISOString().split('T')[0],
    };

    const hourlyWage = Number(userData.hourlyWage) || 50000;
    const rolloverSavings = Number(userData.rolloverSavings) || 0;

    const resultData: FullUserData = {
      userProfile,
      hourlyWage,
      rolloverSavings,
      jars: jars.length > 0 ? jars : INITIAL_JARS,
      wallets: wallets.length > 0 ? wallets : INITIAL_WALLETS,
      transactions,
      recurringExpenses: recurringExpenses.length > 0 ? recurringExpenses : INITIAL_RECURRING,
      wishlist,
      assets,
      diaryEntries,
      songs: songs.length > 0 ? songs : INITIAL_SONGS,
      savingsFunds: savingsFunds.length > 0 ? savingsFunds : INITIAL_SAVINGS_FUNDS,
      canonicalId,
    };

    // 4. Ensure canonical root user doc exists so future queries are instant
    await setDoc(doc(db, 'users', canonicalId), {
      uid: canonicalId,
      email,
      displayName: userProfile.name,
      avatar: userProfile.avatar,
      memberId: userProfile.memberId,
      joinedDate: userProfile.joinedDate,
      monthlyWorkHours: userProfile.monthlyWorkHours,
      currentStreakDays: userProfile.currentStreakDays,
      longestStreakDays: userProfile.longestStreakDays,
      lastActiveDate: userProfile.lastActiveDate,
      hourlyWage,
      rolloverSavings,
      updatedAt: Date.now(),
    }, { merge: true }).catch(() => {});

    console.log(`[firebaseSync] Loaded unified user data for ${canonicalId}:`, {
      transactionsCount: transactions.length,
      jarsCount: jars.length,
      walletsCount: wallets.length,
      recurringCount: recurringExpenses.length,
      diaryCount: diaryEntries.length,
      savingsFundsCount: savingsFunds.length,
    });

    return resultData;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userDocPath);
  }
}

/**
 * Saves or updates user document in Firestore.
 */
export async function saveUserProfileToFirestore(
  userId: string,
  profile: UserProfile,
  hourlyWage: number,
  rolloverSavings: number
): Promise<void> {
  const path = `users/${userId}`;
  try {
    await setDoc(
      doc(db, 'users', userId),
      {
        uid: userId,
        email: profile.email || auth.currentUser?.email || '',
        displayName: profile.name,
        avatar: profile.avatar,
        memberId: profile.memberId,
        joinedDate: profile.joinedDate,
        monthlyWorkHours: profile.monthlyWorkHours,
        currentStreakDays: profile.currentStreakDays,
        longestStreakDays: profile.longestStreakDays,
        lastActiveDate: profile.lastActiveDate,
        hourlyWage,
        rolloverSavings,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Saves initial full dataset for a newly created user.
 */
export async function saveFullUserDataToFirestore(
  userId: string,
  data: FullUserData
): Promise<void> {
  const path = `users/${userId}`;
  try {
    // 1. Commit User Profile Doc first so that security rules can verify ownership on subcollections
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      uid: userId,
      email: data.userProfile.email || auth.currentUser?.email || '',
      displayName: data.userProfile.name,
      avatar: data.userProfile.avatar,
      memberId: data.userProfile.memberId,
      joinedDate: data.userProfile.joinedDate,
      monthlyWorkHours: data.userProfile.monthlyWorkHours,
      currentStreakDays: data.userProfile.currentStreakDays,
      longestStreakDays: data.userProfile.longestStreakDays,
      lastActiveDate: data.userProfile.lastActiveDate,
      hourlyWage: data.hourlyWage,
      rolloverSavings: data.rolloverSavings,
      createdAt: new Date().toISOString(),
      updatedAt: Date.now(),
    }, { merge: true });

    // 2. Commit subcollections in batch
    const batch = writeBatch(db);

    // Jars
    data.jars.forEach((jar) => {
      batch.set(doc(db, 'users', userId, 'jars', jar.id), cleanForFirestore(jar));
    });

    // Wallets
    data.wallets.forEach((wallet) => {
      batch.set(doc(db, 'users', userId, 'wallets', wallet.id), cleanForFirestore(wallet));
    });

    // Recurring
    data.recurringExpenses.forEach((rec) => {
      batch.set(doc(db, 'users', userId, 'recurring', rec.id), cleanForFirestore(rec));
    });

    // Favorite Songs
    data.songs.forEach((song) => {
      batch.set(doc(db, 'users', userId, 'songs', song.id), cleanForFirestore(song));
    });

    // Savings Funds
    if (data.savingsFunds) {
      data.savingsFunds.forEach((fund) => {
        batch.set(doc(db, 'users', userId, 'savings_funds', fund.id), cleanForFirestore(fund));
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Strips all undefined fields recursively to prevent Firestore 'Unsupported field value: undefined' errors
 */
export function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) {
    return data.map((item) => cleanForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    const clean: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
      if (val !== undefined) {
        clean[key] = cleanForFirestore(val);
      }
    }
    return clean as unknown as T;
  }
  return data;
}

/**
 * Helper to save a single subcollection document (e.g. transaction, jar, wallet).
 * Sanitizes data so undefined values never crash the write.
 */
export async function saveSubDocument<T extends { id: string }>(
  userId: string,
  subcollection: string,
  item: T
): Promise<void> {
  const path = `users/${userId}/${subcollection}/${item.id}`;
  try {
    const cleaned = cleanForFirestore(item);
    await setDoc(doc(db, 'users', userId, subcollection, item.id), cleaned);
    // Touch parent user document with merge to ensure it exists
    await setDoc(doc(db, 'users', userId), { updatedAt: Date.now() }, { merge: true }).catch(() => {});
  } catch (error) {
    console.warn(`[saveSubDocument warning at ${path}]:`, error);
  }
}

/**
 * Helper to delete a single subcollection document.
 */
export async function deleteSubDocument(
  userId: string,
  subcollection: string,
  itemId: string
): Promise<void> {
  const path = `users/${userId}/${subcollection}/${itemId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, subcollection, itemId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
