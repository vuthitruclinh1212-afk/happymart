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
    // 1. Try to find user document by canonicalId (e.g. u_vuongnguyet65_gmail_com)
    let sourceId = canonicalId;
    let userDocRef = doc(db, 'users', canonicalId);
    let userSnap = await getDoc(userDocRef);

    // Fallback 1: check if raw email without prefix was used
    if (!userSnap.exists() && email) {
      const emailDocRef = doc(db, 'users', email);
      const emailSnap = await getDoc(emailDocRef);
      if (emailSnap.exists()) {
        userDocRef = emailDocRef;
        userSnap = emailSnap;
        sourceId = email;
      }
    }

    // Fallback 2: check if Firebase UID was used
    if (!userSnap.exists() && userObj.uid && userObj.uid !== canonicalId) {
      const legacyRef = doc(db, 'users', userObj.uid);
      const legacySnap = await getDoc(legacyRef);
      if (legacySnap.exists()) {
        userDocRef = legacyRef;
        userSnap = legacySnap;
        sourceId = userObj.uid;
      }
    }

    // 2. Fetch all subcollections from sourceId (or canonicalId)
    // Run queries safely
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
      getDocs(collection(db, 'users', sourceId, 'jars')).catch(() => ({ docs: [] } as any)),
      getDocs(collection(db, 'users', sourceId, 'wallets')).catch(() => ({ docs: [] } as any)),
      getDocs(collection(db, 'users', sourceId, 'transactions')).catch(() => ({ docs: [] } as any)),
      getDocs(collection(db, 'users', sourceId, 'recurring')).catch(() => ({ docs: [] } as any)),
      getDocs(collection(db, 'users', sourceId, 'wishlist')).catch(() => ({ docs: [] } as any)),
      getDocs(collection(db, 'users', sourceId, 'assets')).catch(() => ({ docs: [] } as any)),
      getDocs(collection(db, 'users', sourceId, 'diary')).catch(() => ({ docs: [] } as any)),
      getDocs(collection(db, 'users', sourceId, 'songs')).catch(() => ({ docs: [] } as any)),
      getDocs(collection(db, 'users', sourceId, 'savings_funds')).catch(() => ({ docs: [] } as any)),
    ]);

    const jars: Jar[] = jarsSnap.docs.map((d: any) => d.data() as Jar);
    const wallets: Wallet[] = walletsSnap.docs.map((d: any) => d.data() as Wallet);
    const transactions: Transaction[] = txsSnap.docs.map((d: any) => d.data() as Transaction);
    const recurringExpenses: RecurringExpense[] = recSnap.docs.map((d: any) => d.data() as RecurringExpense);
    const wishlist: WishlistItem[] = wishSnap.docs.map((d: any) => d.data() as WishlistItem);
    const assets: AssetDepreciation[] = assetsSnap.docs.map((d: any) => d.data() as AssetDepreciation);
    const diaryEntries: DiaryEntry[] = diarySnap.docs.map((d: any) => d.data() as DiaryEntry);
    const songs: FavoriteSong[] = songsSnap.docs.map((d: any) => d.data() as FavoriteSong);
    const savingsFunds: SavingsFund[] = savingsSnap.docs.map((d: any) => d.data() as SavingsFund);

    // Sort transactions by date/createdAt desc
    transactions.sort((a: Transaction, b: Transaction) => (b.createdAt || 0) - (a.createdAt || 0));

    const emailPrefix = email ? email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase() : '';
    const memberCode = emailPrefix ? `HM-${emailPrefix}` : `HM-${canonicalId.slice(0, 6).toUpperCase()}`;

    // 3. If the user document exists, extract stored profile
    if (userSnap.exists()) {
      const userData = userSnap.data();
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
        transactions, // Keep ALL loaded transactions, never overwrite
        recurringExpenses: recurringExpenses.length > 0 ? recurringExpenses : INITIAL_RECURRING,
        wishlist,
        assets,
        diaryEntries,
        songs: songs.length > 0 ? songs : INITIAL_SONGS,
        savingsFunds: savingsFunds.length > 0 ? savingsFunds : INITIAL_SAVINGS_FUNDS,
        canonicalId,
      };

      console.log(`[firebaseSync] Loaded existing user data for ${canonicalId}:`, {
        transactionsCount: transactions.length,
        jarsCount: jars.length,
        walletsCount: wallets.length,
        recurringCount: recurringExpenses.length,
      });

      return resultData;
    }

    // 4. Case where userSnap does NOT exist, but subcollections DO exist
    const hasExistingSubcollections = jars.length > 0 || wallets.length > 0 || transactions.length > 0;
    if (hasExistingSubcollections) {
      const recoveredProfile: UserProfile = {
        uid: canonicalId,
        email: email,
        name: userObj.displayName || currentUser?.displayName || (email ? email.split('@')[0] : 'Thành Viên Siêu Thị'),
        avatar: '🥑',
        memberId: memberCode,
        joinedDate: new Date().toLocaleDateString('vi-VN'),
        monthlyWorkHours: 160,
        currentStreakDays: 1,
        longestStreakDays: 1,
        lastActiveDate: new Date().toISOString().split('T')[0],
      };

      // Create root user document so it exists for next time, but DO NOT overwrite subcollections
      await setDoc(doc(db, 'users', canonicalId), {
        uid: canonicalId,
        email,
        displayName: recoveredProfile.name,
        avatar: recoveredProfile.avatar,
        memberId: memberCode,
        joinedDate: recoveredProfile.joinedDate,
        monthlyWorkHours: 160,
        currentStreakDays: 1,
        longestStreakDays: 1,
        lastActiveDate: recoveredProfile.lastActiveDate,
        hourlyWage: 50000,
        rolloverSavings: 0,
        updatedAt: Date.now(),
      }, { merge: true });

      return {
        userProfile: recoveredProfile,
        hourlyWage: 50000,
        rolloverSavings: 0,
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
    }

    // 5. True first-time user (Brand new account, zero existing subcollections)
    const initialProfile: UserProfile = {
      uid: canonicalId,
      email,
      name: userObj.displayName || currentUser?.displayName || (email ? email.split('@')[0] : 'Thành Viên Mới'),
      avatar: '🥑',
      memberId: memberCode,
      joinedDate: new Date().toLocaleDateString('vi-VN'),
      monthlyWorkHours: 160,
      currentStreakDays: 1,
      longestStreakDays: 1,
      lastActiveDate: new Date().toISOString().split('T')[0],
    };

    const initialData: FullUserData = {
      userProfile: initialProfile,
      hourlyWage: 50000,
      rolloverSavings: 0,
      jars: INITIAL_JARS,
      wallets: INITIAL_WALLETS,
      transactions: [],
      recurringExpenses: INITIAL_RECURRING,
      wishlist: [],
      assets: [],
      diaryEntries: [],
      songs: INITIAL_SONGS,
      savingsFunds: INITIAL_SAVINGS_FUNDS,
      canonicalId,
    };

    // Save initial profile & basic collections only for true first-time user
    await saveFullUserDataToFirestore(canonicalId, initialData);
    return initialData;
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
      batch.set(doc(db, 'users', userId, 'jars', jar.id), jar);
    });

    // Wallets
    data.wallets.forEach((wallet) => {
      batch.set(doc(db, 'users', userId, 'wallets', wallet.id), wallet);
    });

    // Recurring
    data.recurringExpenses.forEach((rec) => {
      batch.set(doc(db, 'users', userId, 'recurring', rec.id), rec);
    });

    // Favorite Songs
    data.songs.forEach((song) => {
      batch.set(doc(db, 'users', userId, 'songs', song.id), song);
    });

    // Savings Funds
    if (data.savingsFunds) {
      data.savingsFunds.forEach((fund) => {
        batch.set(doc(db, 'users', userId, 'savings_funds', fund.id), fund);
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Helper to save a single subcollection document (e.g. transaction, jar, wallet).
 */
export async function saveSubDocument<T extends { id: string }>(
  userId: string,
  subcollection: string,
  item: T
): Promise<void> {
  const path = `users/${userId}/${subcollection}/${item.id}`;
  try {
    await setDoc(doc(db, 'users', userId, subcollection, item.id), item);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
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
