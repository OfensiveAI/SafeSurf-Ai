// Import required Firebase services
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';
import { getFunctions } from 'firebase/functions';
import { getMessaging } from 'firebase/messaging';

// Your Firebase configuration (from Firebase Console)
const firebaseConfig = {
  apiKey: "AIzaSyAAZnQHL35VWjrdHKKLnxy_l9v6d1vPymc",
  authDomain: "safesurf-d699c.firebaseapp.com",
  projectId: "safesurf-d699c",
  storageBucket: "safesurf-d699c.firebasestorage.app",
  messagingSenderId: "913786397635",
  appId: "1:913786397635:web:2506b9712558819b769376",
  measurementId: "G-0MB4C7FDVX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
const functions = getFunctions(app, 'us-central1'); // Specify region for better performance
const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;

// Function to verify Firebase setup
const verifyFirebaseSetup = async () => {
  try {
    // Check Authentication
    await auth.signInAnonymously();
    console.log('✅ Authentication initialized');

    // Check Firestore with timeout and persistence
    await db.enablePersistence({ synchronizeTabs: true });
    const testDoc = await Promise.race([
      db.collection('test').doc('test').get(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 5000))
    ]);
    console.log('✅ Firestore initialized');

    // Check Cloud Functions
    const isAvailable = functions.app.options;
    if (!isAvailable) throw new Error('Cloud Functions not available');
    console.log('✅ Cloud Functions initialized');

    // Check Analytics
    if (analytics && typeof window !== 'undefined') {
      analytics.setAnalyticsCollectionEnabled(true);
      console.log('✅ Analytics initialized');
    }

    // Check Messaging with permission request
    if (messaging && typeof window !== 'undefined') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('✅ Cloud Messaging initialized');
      } else {
        console.warn('⚠️ Cloud Messaging permission denied');
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Firebase initialization error:', error.message);
    return false;
  }
};

// Export initialized services
export {
  app,
  auth,
  db,
  analytics,
  functions,
  messaging,
  verifyFirebaseSetup
};