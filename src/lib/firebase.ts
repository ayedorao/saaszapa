import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDUbdZOB9kyrfXHIoKIa5e462kBbVp1i7Q",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "saaszapa.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "saaszapa",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "saaszapa.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "729060474472",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:729060474472:web:f165d6e7917a408f8505dd",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-3L"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
