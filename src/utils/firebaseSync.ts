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
} from '../types';
import {
  INITIAL_JARS,
  INITIAL_WALLETS,
  INITIAL_RECURRING,
  INITIAL_BADGES,
  INITIAL_SONGS,
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
}

/**
 * Loads all data for a specific user ID from Firestore.
 * If user doc doesn't exist, initializes fresh defaults for this user.
 */
export async function loadUserDataFromFirestore(userId: string): Promise<FullUserData> {
  const userDocPath = `users/${userId}`;
  try {
    const userDocRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userDocRef);

    if (!userSnap.exists()) {
      // First-time user: initialize their profile and isolated subcollections
      const currentUser = auth.currentUser;
      const initialProfile: UserProfile = {
        uid: userId,
        email: currentUser?.email || '',
        name: currentUser?.displayName || 'Thành Viên Mới',
        avatar: '🥑',
        memberId: `HM-${userId.slice(0, 6).toUpperCase()}`,
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
      };

      // Save initial state to Firestore
      await saveFullUserDataToFirestore(userId, initialData);
      return initialData;
    }

    const userData = userSnap.data();
    const userProfile: UserProfile = {
      uid: userId,
      email: userData.email || auth.currentUser?.email || '',
      name: userData.displayName || auth.currentUser?.displayName || 'Thành Viên Siêu Thị',
      avatar: userData.avatar || '🥑',
      memberId: userData.memberId || `HM-${userId.slice(0, 6).toUpperCase()}`,
      joinedDate: userData.joinedDate || new Date().toLocaleDateString('vi-VN'),
      monthlyWorkHours: Number(userData.monthlyWorkHours) || 160,
      currentStreakDays: Number(userData.currentStreakDays) || 1,
      longestStreakDays: Number(userData.longestStreakDays) || 1,
      lastActiveDate: userData.lastActiveDate || new Date().toISOString().split('T')[0],
    };

    const hourlyWage = Number(userData.hourlyWage) || 50000;
    const rolloverSavings = Number(userData.rolloverSavings) || 0;

    // Fetch subcollections in parallel
    const [
      jarsSnap,
      walletsSnap,
      txsSnap,
      recSnap,
      wishSnap,
      assetsSnap,
      diarySnap,
      songsSnap,
    ] = await Promise.all([
      getDocs(collection(db, 'users', userId, 'jars')),
      getDocs(collection(db, 'users', userId, 'wallets')),
      getDocs(collection(db, 'users', userId, 'transactions')),
      getDocs(collection(db, 'users', userId, 'recurring')),
      getDocs(collection(db, 'users', userId, 'wishlist')),
      getDocs(collection(db, 'users', userId, 'assets')),
      getDocs(collection(db, 'users', userId, 'diary')),
      getDocs(collection(db, 'users', userId, 'songs')),
    ]);

    const jars = jarsSnap.docs.map((d) => d.data() as Jar);
    const wallets = walletsSnap.docs.map((d) => d.data() as Wallet);
    const transactions = txsSnap.docs.map((d) => d.data() as Transaction);
    const recurringExpenses = recSnap.docs.map((d) => d.data() as RecurringExpense);
    const wishlist = wishSnap.docs.map((d) => d.data() as WishlistItem);
    const assets = assetsSnap.docs.map((d) => d.data() as AssetDepreciation);
    const diaryEntries = diarySnap.docs.map((d) => d.data() as DiaryEntry);
    const songs = songsSnap.docs.map((d) => d.data() as FavoriteSong);

    // Sort transactions by date/createdAt desc
    transactions.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return {
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
    };
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
    const batch = writeBatch(db);

    // User Profile Doc
    const userRef = doc(db, 'users', userId);
    batch.set(userRef, {
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
    });

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
