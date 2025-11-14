import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBX5SVEf5ss8BjqHh1gY",
  authDomain: "alloneapp.com",
  projectId: "allo59",
  storageBucket: "allonee.app",
  messagingSenderId: "368651413",
  appId: "1:368464651a553279c",
  measurementId: "G-W5M408"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

export default app;