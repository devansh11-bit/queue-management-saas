import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCGRhtCyHEjIwa6rZX7D8uKYhaqs_FU2Dg",
  authDomain: "queue-city-32796.firebaseapp.com",
  projectId: "queue-city-32796",
  storageBucket: "queue-city-32796.firebasestorage.app",
  messagingSenderId: "994636696379",
  appId: "1:994636696379:web:cd9d6177556c64f746851e"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);