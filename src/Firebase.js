// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth,GoogleAuthProvider } from "firebase/auth/web-extension";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAH_XLdleNkGNEGfjuwwQSvi58p0Tw8SX0",
  authDomain: "reactloginsignup-69aef.firebaseapp.com",
  projectId: "reactloginsignup-69aef",
  storageBucket: "reactloginsignup-69aef.firebasestorage.app",
  messagingSenderId: "539602189881",
  appId: "1:539602189881:web:0f62addb51a9c28cfa57e8",
  measurementId: "G-LM6RDG1M01"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
export const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider };



