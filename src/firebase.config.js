import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAz6VXWy_ANL4xMjxrHynCwc6iMfROfPQM",
  authDomain: "smartpatientorder.firebaseapp.com",
  projectId: "smartpatientorder",
  storageBucket: "smartpatientorder.appspot.com",
  messagingSenderId: "917123489319",
  appId: "1:917123489319:web:abc01bdd82df28a9353802",
};

console.log('Firebase Config:', firebaseConfig);

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };