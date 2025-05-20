// src/lib/firebase.ts
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// TODO: Replace with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyCdFi3p3pkWK9UkZc0xrceQIkyzQdNLa24",
  authDomain: "bestbrain-39ce7.firebaseapp.com",
  databaseURL: "https://bestbrain-39ce7-default-rtdb.firebaseio.com",
  projectId: "bestbrain-39ce7",
  storageBucket: "bestbrain-39ce7.firebasestorage.app",
  messagingSenderId: "68303113625",
  appId: "1:68303113625:web:eef53bfe025dd482add708",
  measurementId: "G-WD3S9Y98MR"
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const database = getDatabase(app);

export { app, database };
