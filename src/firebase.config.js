import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAH2ViuDrQgUYubuxPIUAqmE8sw-N8fgfw",
  authDomain: "order-smart-patient.firebaseapp.com",
  projectId: "order-smart-patient",
  storageBucket: "order-smart-patient.firebasestorage.app",
  messagingSenderId: "566889203229",
  appId: "1:566889203229:web:0ced7a365092ba077f28f4",
};

console.log('Firebase Config:', firebaseConfig);

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };