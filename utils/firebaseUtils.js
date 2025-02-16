import { doc, getDoc, setDoc, collection, query, where, getDocs, writeBatch, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms

// Helper function for retry logic
const withRetry = async (operation, maxRetries = MAX_RETRIES) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      console.warn(`Operation failed, attempt ${attempt}/${maxRetries}. Retrying...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
    }
  }
};

// User Settings
export const getUserSettings = async (userId) => {
  if (!userId) return null;
  return withRetry(async () => {
    const settingsRef = doc(db, 'userSettings', userId);
    const settingsDoc = await getDoc(settingsRef);
    return settingsDoc.exists() ? settingsDoc.data() : null;
  });
};

export const updateUserSettings = async (userId, settings) => {
  if (!userId) return;
  return withRetry(async () => {
    const settingsRef = doc(db, 'userSettings', userId);
    await setDoc(settingsRef, {
      ...settings,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  });
};

// Activity Logs
export const getActivityLogs = async (userId, limit = 100) => {
  if (!userId) return [];
  return withRetry(async () => {
    const logsQuery = query(
      collection(db, 'activityLogs'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(limit)
    );
    const logsSnapshot = await getDocs(logsQuery);
    return logsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  });
};

export const logActivity = async (userId, activities) => {
  if (!userId) return;
  return withRetry(async () => {
    const batch = writeBatch(db);
    const timestamp = serverTimestamp();

    // Handle single activity or batch of activities
    const activitiesToLog = Array.isArray(activities) ? activities : [activities];
    
    activitiesToLog.forEach(activity => {
      const newLogRef = doc(collection(db, 'activityLogs'));
      batch.set(newLogRef, {
        userId,
        timestamp,
        ...activity,
        createdAt: timestamp
      });
    });

    await batch.commit();
  });
};

// Whitelist Management with caching
const whitelistCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const getWhitelist = async (userId) => {
  if (!userId) return [];
  
  // Check cache first
  const cached = whitelistCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.sites;
  }

  return withRetry(async () => {
    const whitelistRef = doc(db, 'whitelists', userId);
    const whitelistDoc = await getDoc(whitelistRef);
    const sites = whitelistDoc.exists() ? whitelistDoc.data().sites : [];
    
    // Update cache
    whitelistCache.set(userId, {
      sites,
      timestamp: Date.now()
    });
    
    return sites;
  });
};

export const updateWhitelist = async (userId, sites) => {
  if (!userId) return;
  return withRetry(async () => {
    const whitelistRef = doc(db, 'whitelists', userId);
    await setDoc(whitelistRef, { 
      sites,
      updatedAt: serverTimestamp()
    });
    
    // Update cache
    whitelistCache.set(userId, {
      sites,
      timestamp: Date.now()
    });
  });
};

// Cleanup function for tests or component unmounting
export const clearWhitelistCache = () => {
  whitelistCache.clear();
};