import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut as firebaseSignOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { StorageService } from './storageService';
import { Entry, ContentItem, SavedInsight, AiAccessState } from './types';

const firebaseConfig = {
  apiKey: "AIzaSyATLYZAbzFnwry9BLV9zEnbs8ZlXl790OU",
  authDomain: "soloinsightv1.firebaseapp.com",
  projectId: "soloinsightv1",
  storageBucket: "soloinsightv1.firebasestorage.app",
  messagingSenderId: "619553909754",
  appId: "1:619553909754:web:fed30ff28d6ee510c4d243",
  measurementId: "G-CL3HFK8PTH"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const FirebaseService = {
  auth,
  db,
  
  // Auth Methods
  signInGoogle: async () => {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  },

  signInEmail: async (email: string, pass: string) => {
    return signInWithEmailAndPassword(auth, email, pass);
  },

  signUpEmail: async (email: string, pass: string) => {
    return createUserWithEmailAndPassword(auth, email, pass);
  },

  signInAnon: async () => {
    return signInAnonymously(auth);
  },

  signOut: async () => {
    return firebaseSignOut(auth);
  },

  // Data Sync: Merges LocalStorage data into Firestore upon login
  syncLocalDataToCloud: async (user: User) => {
    const localData = StorageService.getFullBackupData();
    const userRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userRef);

    if (!docSnap.exists()) {
      // New cloud user: Upload local data immediately
      await setDoc(userRef, {
        entries: localData.entries || [],
        tags: localData.tags || [],
        library: localData.library || [],
        achievements: localData.achievements || {},
        aiAccess: localData.aiAccess || { unlocked: false, attempts: 0 },
        language: localData.language || 'en',
        createdAt: Date.now()
      });
    } else {
      // Existing cloud user: Intelligent Merge
      const cloudData = docSnap.data();
      
      // Merge Entries (Avoid duplicates by ID)
      const cloudEntryIds = new Set((cloudData.entries || []).map((e: any) => e.id));
      const newLocalEntries = localData.entries.filter(e => !cloudEntryIds.has(e.id));
      const mergedEntries = [...(cloudData.entries || []), ...newLocalEntries];

      // Merge Library
      const cloudLibIds = new Set((cloudData.library || []).map((i: any) => i.id));
      const newLocalLib = localData.library.filter(i => !cloudLibIds.has(i.id));
      const mergedLibrary = [...(cloudData.library || []), ...newLocalLib];
      
      // Merge Tags (Unique)
      const mergedTags = Array.from(new Set([...(cloudData.tags || []), ...localData.tags]));

      // Update Cloud
      if (newLocalEntries.length > 0 || newLocalLib.length > 0) {
        await updateDoc(userRef, {
          entries: mergedEntries,
          library: mergedLibrary,
          tags: mergedTags
        });
      }
    }
  },

  // Real-time Listeners
  subscribeToUserData: (userId: string, callback: (data: any) => void) => {
    return onSnapshot(doc(db, 'users', userId), (doc) => {
      if (doc.exists()) {
        callback(doc.data());
      } else {
        // Initialize empty if not exists (handling edge case)
        callback(null);
      }
    });
  },

  // Save methods (used when user is online)
  updateUserData: async (userId: string, data: any) => {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, data);
  }
};