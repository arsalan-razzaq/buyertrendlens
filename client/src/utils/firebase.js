import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCA3eXHMOBUl63jtRUhdqBWHuyC7YinFHA',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'sales-3074e.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'sales-3074e',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'sales-3074e.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '171146220512',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:171146220512:web:5e51c14398270a19109185',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-4KTEGRYMPB'
};

export const hasFirebaseGoogleConfig = ['apiKey', 'authDomain', 'projectId', 'appId'].every((key) => {
  const value = firebaseConfig[key];
  return typeof value === 'string' && value.trim().length > 0;
});

const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const signInWithGooglePopup = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);

  if (!credential?.idToken) {
    throw new Error('Google ID token was not returned by Firebase.');
  }

  return credential.idToken;
};

export default firebaseApp;
