import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Entry, ContentItem, SavedInsight, AiAccessState } from '../types';

// TODO: REPLACE WITH YOUR FIREBASE CONFIGURATION
// Go to Firebase Console -> Project Settings -> General -> Your apps -> SDK setup and configuration
const firebaseConfig = {
  apiKey: "AIzaSyAxHBOxB7aPlvzcRjqag3hxXiYbHJcwRKs",
  authDomain: "solo-insight-4f8aa.firebaseapp.com",
  projectId: "solo-insight-4f8aa",
  storageBucket: "solo-insight-4f8aa.firebasestorage.app",
  messagingSenderId: "564943929532",
  appId: "1:564943929532:web:0864e35b990c40c60cd0b9",
  measurementId: "G-Y5W9SERQ9R"
};

// Initialize only if config is valid (prevent crash during dev before config)
let app, auth, db;
try {
    if (firebaseConfig.apiKey !== "YOUR_API_KEY_HERE") {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
    }
} catch (e) {
    console.warn("Firebase initialization failed. Check config.", e);
}

export const FirebaseService = {
  auth,
  db,
  
  signIn: async () => {
    if (!auth) throw new Error("Firebase not configured");
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  },

  signOut: async () => {
    if (!auth) return;
    return firebaseSignOut(auth);
  },

  // One-time sync: Upload local data to cloud on first login
  mergeLocalData: async (userId: string, localData: any) => {
    if (!db) return;
    const userRef = doc(db, 'users', userId);
    
    // Check if cloud data exists
    const docSnap = await getDoc(userRef);
    
    if (!docSnap.exists()) {
        // First time user, upload everything
        await setDoc(userRef, {
            entries: localData.entries || [],
            tags: localData.tags || [],
            library: localData.library || [],
            insights: localData.insights || [],
            achievements: localData.achievements || {},
            aiAccess: localData.aiAccess || { unlocked: false, attempts: 0 },
            createdAt: Date.now()
        });
        return true; // Data uploaded
    }
    return false; // User already had cloud data, didn't overwrite with local
  },

  // Save specific collections
  saveEntry: async (userId: string, entries: Entry[]) => {
    if (!db) return;
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { entries });
  },

  saveTags: async (userId: string, tags: string[]) => {
    if (!db) return;
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { tags });
  },

  saveLibrary: async (userId: string, library: ContentItem[]) => {
    if (!db) return;
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { library });
  },
  
  saveInsights: async (userId: string, insights: SavedInsight[]) => {
    if (!db) return;
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { insights });
  },

  saveAchievements: async (userId: string, achievements: Record<string, number>) => {
    if (!db) return;
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { achievements });
  },
  
  saveAiAccess: async (userId: string, aiAccess: AiAccessState) => {
    if (!db) return;
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { aiAccess });
  }
};