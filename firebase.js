// firebase.js - Fixed with Real Firestore + Mock Auth
import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDGeVtNzNTgb3oxFIeEQ61_AIC1v2gLMzg",
  authDomain: "mycargo-6a427.firebaseapp.com",
  projectId: "mycargo-6a427",
  storageBucket: "mycargo-6a427.appspot.com",
  messagingSenderId: "902623042071",
  appId: "1:902623042071:web:83674c67d06a8d5f1e9a52",
  measurementId: "G-5EH6YR4SZQ"
};

// Initialize Firebase app
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  console.log('Firebase app initialized');
} else {
  app = getApps()[0];
}

// Initialize working services - REAL FIRESTORE
const db = getFirestore(app);
const storage = getStorage(app);

// Mock Auth since Firebase Auth has registration issues in Expo
console.log('Using Mock Auth + Real Firestore for development');

// Mock user data
const mockUsers = {
  'cargo@demo.com': {
    uid: 'cargo-demo-123',
    email: 'cargo@demo.com',
    displayName: 'Cargo Demo User',
    userType: 'cargo',
    name: 'John Cargo',
    companyName: 'Demo Logistics Co.'
  },
  'truck@demo.com': {
    uid: 'truck-demo-456',
    email: 'truck@demo.com',
    displayName: 'Truck Demo User',
    userType: 'truck',
    name: 'Mike Trucker'
  }
};

// Mock Auth object with additional Firebase Auth methods
const mockAuth = {
  currentUser: null,
  onAuthStateChanged: (callback) => {
    setTimeout(() => callback(mockAuth.currentUser), 100);
    return () => {};
  },
  // Add missing Firebase Auth methods to prevent errors
  _getRecaptchaConfig: () => Promise.resolve({}),
  _initializeRecaptchaConfig: () => Promise.resolve(),
  _delegate: {},
  config: {},
  name: 'mock-auth'
};

// Mock Auth functions
export const signInWithEmailAndPassword = async (auth, email, password) => {
  console.log('Mock sign in:', email);
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const user = mockUsers[email];
  if (user && password === 'Demo123!') {
    mockAuth.currentUser = user;
    
    // Save real user data to Firestore
    try {
      await setDoc(doc(db, 'users', user.uid), {
        name: user.name,
        email: user.email,
        userType: user.userType,
        companyName: user.companyName || null,
        lastLoginAt: serverTimestamp(),
        isActive: true,
        profileComplete: true
      }, { merge: true });
    } catch (error) {
      console.error('Error saving user to Firestore:', error);
    }
    
    return { user };
  } else {
    // Create a proper Firebase-like error
    const error = new Error('Invalid email or password');
    error.code = 'auth/invalid-credential';
    throw error;
  }
};

export const createUserWithEmailAndPassword = async (auth, email, password) => {
  console.log('Mock create user:', email);
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Check if user already exists
  if (mockUsers[email]) {
    const error = new Error('An account with this email already exists');
    error.code = 'auth/email-already-in-use';
    throw error;
  }
  
  const newUser = {
    uid: 'new-user-' + Date.now(),
    email,
    displayName: 'New User',
    userType: 'cargo',
    name: 'New User'
  };
  
  // Add to mock users for future logins
  mockUsers[email] = newUser;
  mockAuth.currentUser = newUser;
  
  // Save real user data to Firestore
  try {
    await setDoc(doc(db, 'users', newUser.uid), {
      name: newUser.name,
      email: newUser.email,
      userType: newUser.userType,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      isActive: true,
      profileComplete: true
    });
  } catch (error) {
    console.error('Error saving new user to Firestore:', error);
  }
  
  return { user: newUser };
};

export const signOut = async (auth) => {
  console.log('Mock sign out');
  mockAuth.currentUser = null;
  return Promise.resolve();
};

export const sendPasswordResetEmail = async (auth, email) => {
  console.log('Mock password reset for:', email);
  await new Promise(resolve => setTimeout(resolve, 500));
  return Promise.resolve();
};

export const updateProfile = async (user, profile) => {
  console.log('Mock update profile:', profile);
  if (mockAuth.currentUser) {
    Object.assign(mockAuth.currentUser, profile);
  }
  return Promise.resolve();
};

// Mock Google Auth
export const GoogleAuthProvider = {
  credential: (idToken) => ({ idToken })
};

export const signInWithCredential = async (auth, credential) => {
  console.log('Mock Google sign in');
  const googleUser = {
    uid: 'google-user-' + Date.now(),
    email: 'google@demo.com',
    displayName: 'Google User',
    userType: 'cargo',
    name: 'Google User'
  };
  mockAuth.currentUser = googleUser;
  
  // Save to real Firestore
  try {
    await setDoc(doc(db, 'users', googleUser.uid), {
      name: googleUser.name,
      email: googleUser.email,
      userType: googleUser.userType,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      isActive: true,
      profileComplete: true
    }, { merge: true });
  } catch (error) {
    console.error('Error saving Google user to Firestore:', error);
  }
  
  return { user: googleUser };
};

// Export REAL Firestore functions (not mocked)
export {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp
};

// Exports
export const auth = mockAuth;
export { db, storage };

export const getFirebaseAuth = () => auth;
export const getFirebaseDB = () => db;
export const getFirebaseStorage = () => storage;

export default app;

console.log('Firebase with Mock Auth + Real Firestore initialized successfully! ✅');
console.log('Demo accounts: cargo@demo.com / truck@demo.com (password: Demo123!)');