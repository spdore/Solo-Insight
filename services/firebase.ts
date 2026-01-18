import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged, 
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously as firebaseSignInAnonymously
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { Entry, ContentItem, SavedInsight, AiAccessState } from '../types';

// Updated configuration
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
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export const FirebaseService = {
  auth,
  db,

  // --- Auth Methods ---
  
  signUp: async (email, password) => {
    return createUserWithEmailAndPassword(auth, email, password);
  },

  signIn: async (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  },

  signInWithGoogle: async () => {
    return signInWithPopup(auth, googleProvider);
  },

  signInAnonymously: async () => {
    return firebaseSignInAnonymously(auth);
  },

  signOut: async () => {
    return firebaseSignOut(auth);
  },

  observeAuth: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
  },

  // --- Data Sync Methods ---

  // Initialize User Document if it doesn't exist
  initUserDoc: async (userId: string) => {
    if (!userId) return false;
    try {
        const userRef = doc(db, 'users', userId);
        const docSnap = await getDoc(userRef);
        
        if (!docSnap.exists()) {
          await setDoc(userRef, {
            entries: [],
            tags: [],
            library: [],
            insights: [],
            achievements: {},
            aiAccess: { unlocked: false, attempts: 0 },
            createdAt: Date.now()
          });
          return true; // Created new
        }
        return false; // Existed
    } catch (error) {
        console.error("Error initializing user doc:", error);
        // Throw error so App.tsx can handle it and stop loading
        throw error;
    }
  },

  // Real-time listener for user data
  subscribeToUserData: (
      userId: string, 
      onData: (data: any) => void, 
      onError?: (error: any) => void
  ) => {
    const userRef = doc(db, 'users', userId);
    return onSnapshot(userRef, 
      (doc) => {
        if (doc.exists()) {
            onData(doc.data());
        } else {
            // Document might have been deleted or not created yet
            // Pass null to indicate "no data found but sync is working"
            onData(null); 
        }
      },
      (error) => {
        console.error("Firestore sync error:", error);
        if (onError) onError(error);
      }
    );
  },

  // Overwrite specific fields in Firestore
  updateUserField: async (userId: string, field: string, data: any) => {
    if (!userId) return;
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
        [field]: data
        });
    } catch (e) {
        console.error(`Error updating field ${field}:`, e);
    }
  },

  // Helper to sync all local data to cloud (e.g. after first signup)
  syncLocalToCloud: async (userId: string, localData: any) => {
    const userRef = doc(db, 'users', userId);
    // Use setDoc with merge to ensure we don't lose the document structure but overwrite content
    await setDoc(userRef, {
      entries: localData.entries || [],
      tags: localData.tags || [],
      library: localData.library || [],
      achievements: localData.achievements || {},
      aiAccess: localData.aiAccess || { unlocked: false, attempts: 0 }
    }, { merge: true });
  }
};