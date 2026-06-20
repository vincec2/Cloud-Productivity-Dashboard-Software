// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// For analytics later:
// import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDyOpF3ubNmTeVWxWk_wZYoANILtmeTwDA",
  authDomain: "cloud-productivity-dashboard.firebaseapp.com",
  projectId: "cloud-productivity-dashboard",
  storageBucket: "cloud-productivity-dashboard.firebasestorage.app",
  messagingSenderId: "57526516530",
  appId: "1:57526516530:web:308af2ddea79acb1db752b",
  measurementId: "G-K07R6LVVKF",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the services
export const auth = getAuth(app);
export const db = getFirestore(app);
