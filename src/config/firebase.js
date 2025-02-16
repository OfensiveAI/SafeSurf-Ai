import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDoc, setDoc, doc } from 'firebase/firestore';
import { signInWithPopup } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAAZnQHL35VWjrdHKKLnxy_l9v6d1vPymc",
  authDomain: "safesurf-d699c.firebaseapp.com",
  projectId: "safesurf-d699c",
  storageBucket: "safesurf-d699c.firebasestorage.app",
  messagingSenderId: "913786397635",
  appId: "1:913786397635:web:2506b9712558819b769376",
  measurementId: "G-0MB4C7FDVX"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Optional: Add initialization status check
export const checkFirebaseInitialization = () => {
  try {
    if (auth && db) {
      return true;
    }
    return false;
  } catch (error) {
    console.error('Firebase initialization error:', error);
    return false;
  }
};

// Enhanced Google Sign-In function with user data storage
const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Store user data in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      lastLogin: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }, { merge: true });

    return user;
  } catch (error) {
    console.error('Google Sign-In Error:', error.message);
    throw error;
  }
};

// Enhanced logout function
const signOutUser = async () => {
  try {
    const userId = auth.currentUser?.uid;
    if (userId) {
      // Update last logout time
      await setDoc(doc(db, 'users', userId), {
        lastLogout: new Date().toISOString()
      }, { merge: true });
    }
    await auth.signOut();
  } catch (error) {
    console.error('Sign Out Error:', error.message);
    throw error;
  }
};

// Check for existing session
const checkExistingSession = async () => {
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

export {
  // ... existing exports ...
  signOutUser,
  checkExistingSession
};