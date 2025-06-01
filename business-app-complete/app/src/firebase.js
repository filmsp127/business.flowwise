import { initializeApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// แทนที่ config เดิมด้วยอันนี้
const firebaseConfig = {
  apiKey: "AIzaSyCZQxZULakPGQ9i7gNTMvwSxU9lcRCmEkI",
  authDomain: "business-byfilm.firebaseapp.com",
  projectId: "business-byfilm",
  storageBucket: "business-byfilm.firebasestorage.app",
  messagingSenderId: "1527842116693",
  appId: "1:1527842116693:web:4bb3385febd41d698f86e4",
  measurementId: "G-28NSZS6HTN",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);

export const db = getFirestore(app);
