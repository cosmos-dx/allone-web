import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBX5SVEf5ss8lbuJ0A2Y9TSfV9BjqHh1gY",
  authDomain: "allone-90859.firebaseapp.com",
  projectId: "allone-90859",
  storageBucket: "allone-90859.firebasestorage.app",
  messagingSenderId: "368464651413",
  appId: "1:368464651413:web:67de20aa5fd0c0a553279c",
  measurementId: "G-W5G03WM408"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

export default app;