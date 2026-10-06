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
 * If user doc doesn't exist, initializes fresh defaults for this user.
 * Guarantees cross-device sync for the same email!
 */
export async function loadUserDataFromFirestore(
  userParam: string | { uid: string; email?: string | null; displayName?: string | null }
): Promise<FullUserData> {
  const currentUser = auth.currentUser;
  const userObj = typeof userParam === 'string'
    ? { uid: userParam, email: currentUser?.email || '', displayName: currentUser?.displayName || '' }
    : userParam;

  const canonicalId = getCanonicalUserId(userObj);
  const userDocPath = `users/${canonicalId}`;

  try {
    let userDocRef = doc(db, 'users', canonicalId);
    let userSnap = await getDoc(userDocRef);

    // If canonical doc doesn't exist yet, check if there's legacy data under user.uid
    let sourceId = canonicalId;
    if (!userSnap.exists() && userObj.uid && userObj.uid !== canonicalId) {
      const legacyRef = doc(db, 'users', userObj.uid);
      const legacySnap = await getDoc(legacyRef);
      if (legacySnap.exists()) {
        userSnap = legacySnap;
        sourceId = userObj.uid;
      }
    }

    if (!userSnap.exists()) {
      // First-time user for this email: initialize their profile and isolated subcollections
      const email = userObj.email || currentUser?.email || '';
      const emailPrefix = email ? email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase() : '';
      const memberCode = emailPrefix ? `HM-${emailPrefix}` : `HM-${canonicalId.slice(0, 6).toUpperCase()}`;

      const initialProfile: UserProfile = {
        uid: canonicalId,
        email: email,
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
        rolloverSavings: 1200000,
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

      // Save initial state to Firestore under canonicalId
      await saveFullUserDataToFirestore(canonicalId, initialData);
      return initialData;
    }

    const userData = userSnap.data();
    const email = userData.email || userObj.email || auth.currentUser?.email || '';
    const emailPrefix = email ? email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase() : '';
    const memberCode = userData.memberId || (emailPrefix ? `HM-${emailPrefix}` : `HM-${canonicalId.slice(0, 6).toUpperCase()}`);

    const userProfile: UserProfile = {
      uid: canonicalId,
      email: email,
      name: userData.displayName || userObj.displayName || auth.currentUser?.displayName || 'Thành Viên Siêu Thị',
      avatar: userData.avatar || '🥑',
      memberId: memberCode,
      joinedDate: userData.joinedDate || new Date().toLocaleDateString('vi-VN'),
      monthlyWorkHours: Number(userData.monthlyWorkHours) || 160,
      currentStreakDays: Number(userData.currentStreakDays) || 1,
      longestStreakDays: Number(userData.longestStreakDays) || 1,
      lastActiveDate: userData.lastActiveDate || new Date().toISOString().split('T')[0],
    };

    const hourlyWage = Number(userData.hourlyWage) || 50000;
    const rolloverSavings = Number(userData.rolloverSavings) || 0;

    // Fetch subcollections from sourceId (or canonicalId)
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
      getDocs(collection(db, 'users', sourceId, 'jars')),
      getDocs(collection(db, 'users', sourceId, 'wallets')),
      getDocs(collection(db, 'users', sourceId, 'transactions')),
      getDocs(collection(db, 'users', sourceId, 'recurring')),
      getDocs(collection(db, 'users', sourceId, 'wishlist')),
      getDocs(collection(db, 'users', sourceId, 'assets')),
      getDocs(collection(db, 'users', sourceId, 'diary')),
      getDocs(collection(db, 'users', sourceId, 'songs')),
      getDocs(collection(db, 'users', sourceId, 'savings_funds')),
    ]);

    const jars = jarsSnap.docs.map((d) => d.data() as Jar);
    const wallets = walletsSnap.docs.map((d) => d.data() as Wallet);
    const transactions = txsSnap.docs.map((d) => d.data() as Transaction);
    const recurringExpenses = recSnap.docs.map((d) => d.data() as RecurringExpense);
    const wishlist = wishSnap.docs.map((d) => d.data() as WishlistItem);
    const assets = assetsSnap.docs.map((d) => d.data() as AssetDepreciation);
    const diaryEntries = diarySnap.docs.map((d) => d.data() as DiaryEntry);
    const songs = songsSnap.docs.map((d) => d.data() as FavoriteSong);
    const savingsFunds = savingsSnap.docs.map((d) => d.data() as SavingsFund);

    // Sort transactions by date/createdAt desc
    transactions.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

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

    // If sourceId was legacy UID and canonicalId is different, migrate to canonicalId
    if (sourceId !== canonicalId) {
      try {
        await saveFullUserDataToFirestore(canonicalId, resultData);
      } catch (migrateErr) {
        console.warn('Migration to canonicalId warning:', migrateErr);
      }
    }

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
