// Firestore service for direct database operations
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Helper to convert Firestore timestamp to ISO string
const toISO = (timestamp) => {
  if (!timestamp) return new Date().toISOString();
  if (timestamp.toDate) return timestamp.toDate().toISOString();
  if (timestamp instanceof Timestamp) return timestamp.toDate().toISOString();
  return timestamp;
};

// Users
export const getUser = async (userId) => {
  const docRef = doc(db, 'users', userId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { userId, ...docSnap.data() };
  }
  return null;
};

export const createUser = async (userData) => {
  const docRef = doc(db, 'users', userData.userId);
  await setDoc(docRef, userData);
  return userData;
};

export const updateUser = async (userId, updates) => {
  const docRef = doc(db, 'users', userId);
  await updateDoc(docRef, updates);
};

// Passwords
export const getPasswords = async (userId, spaceId = null) => {
  let q = query(collection(db, 'passwords'), where('userId', '==', userId));
  if (spaceId) {
    q = query(q, where('spaceId', '==', spaceId));
  }
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    passwordId: doc.id,
    ...doc.data(),
    createdAt: toISO(doc.data().createdAt),
    updatedAt: toISO(doc.data().updatedAt),
    lastUsed: doc.data().lastUsed ? toISO(doc.data().lastUsed) : null
  }));
};

export const createPassword = async (passwordData) => {
  const passwordId = passwordData.passwordId || `pwd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = Timestamp.now();
  const docRef = doc(db, 'passwords', passwordId);
  
  const data = {
    ...passwordData,
    createdAt: now,
    updatedAt: now,
    lastUsed: null
  };
  delete data.passwordId;
  
  await setDoc(docRef, data);
  return { passwordId, ...data, createdAt: toISO(now), updatedAt: toISO(now) };
};

export const updatePassword = async (passwordId, updates) => {
  const docRef = doc(db, 'passwords', passwordId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.now()
  });
};

export const deletePassword = async (passwordId) => {
  const docRef = doc(db, 'passwords', passwordId);
  await deleteDoc(docRef);
};

// TOTP
export const getTOTPs = async (userId, spaceId = null) => {
  let q = query(collection(db, 'totpSecrets'), where('userId', '==', userId));
  if (spaceId) {
    q = query(q, where('spaceId', '==', spaceId));
  }
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    totpId: doc.id,
    ...doc.data(),
    createdAt: toISO(doc.data().createdAt)
  }));
};

export const createTOTP = async (totpData) => {
  const totpId = totpData.totpId || `totp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = Timestamp.now();
  const docRef = doc(db, 'totpSecrets', totpId);
  
  const data = {
    ...totpData,
    createdAt: now
  };
  delete data.totpId;
  
  await setDoc(docRef, data);
  return { totpId, ...data, createdAt: toISO(now) };
};

export const deleteTOTP = async (totpId) => {
  const docRef = doc(db, 'totpSecrets', totpId);
  await deleteDoc(docRef);
};

// Spaces
export const getSpaces = async (ownerId) => {
  const q = query(collection(db, 'spaces'), where('ownerId', '==', ownerId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    spaceId: doc.id,
    ...doc.data(),
    createdAt: toISO(doc.data().createdAt)
  }));
};

export const createSpace = async (spaceData) => {
  const spaceId = spaceData.spaceId || `space_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = Timestamp.now();
  const docRef = doc(db, 'spaces', spaceId);
  
  const data = {
    ...spaceData,
    createdAt: now
  };
  delete data.spaceId;
  
  await setDoc(docRef, data);
  return { spaceId, ...data, createdAt: toISO(now) };
};

// Notifications
export const getNotifications = async (userId, readFilter = null) => {
  let q = query(collection(db, 'notifications'), where('userId', '==', userId));
  if (readFilter !== null) {
    q = query(q, where('read', '==', readFilter));
  }
  const querySnapshot = await getDocs(q);
  const notifications = querySnapshot.docs.map(doc => ({
    notificationId: doc.id,
    ...doc.data(),
    createdAt: toISO(doc.data().createdAt)
  }));
  // Sort by createdAt descending
  notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return notifications.slice(0, 50);
};

export const createNotification = async (notificationData) => {
  const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = Timestamp.now();
  const docRef = doc(db, 'notifications', notificationId);
  
  const data = {
    ...notificationData,
    createdAt: now
  };
  
  await setDoc(docRef, data);
  return { notificationId, ...data, createdAt: toISO(now) };
};

export const markNotificationRead = async (notificationId) => {
  const docRef = doc(db, 'notifications', notificationId);
  await updateDoc(docRef, { read: true });
};

export const deleteNotification = async (notificationId) => {
  const docRef = doc(db, 'notifications', notificationId);
  await deleteDoc(docRef);
};

// Search
export const searchPasswords = async (userId, searchText) => {
  const passwords = await getPasswords(userId);
  const query = searchText.toLowerCase();
  return passwords.filter(p => 
    p.displayName?.toLowerCase().includes(query) ||
    p.username?.toLowerCase().includes(query) ||
    p.website?.toLowerCase().includes(query) ||
    p.category?.toLowerCase().includes(query)
  );
};

export const searchTOTPs = async (userId, searchText) => {
  const totps = await getTOTPs(userId);
  const query = searchText.toLowerCase();
  return totps.filter(t => 
    t.serviceName?.toLowerCase().includes(query) ||
    t.account?.toLowerCase().includes(query)
  );
};

