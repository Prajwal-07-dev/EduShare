
import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import { getAuth } from
  "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import { getFirestore } from
  "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import { getStorage } from
  "https://www.gstatic.com/firebasejs/12.19.0/firebase-storage.js";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC8mqAdTN9rA5NtcXDczkebrYtoEtJCN1g",
  authDomain: "edushare-2cb5d.firebaseapp.com",
  projectId: "edushare-2cb5d",
  storageBucket: "edushare-2cb5d.firebasestorage.app",
  messagingSenderId: "357905487113",
  appId: "1:357905487113:web:685d42d52301b2623d2fd8",
  measurementId: "G-XSNJCVP3VM"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);