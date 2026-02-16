// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA7J-CmCnkz3_iBt7yiZKbEATTjSsYqFxo",
  authDomain: "login-82e4e.firebaseapp.com",
  projectId: "login-82e4e",
  storageBucket: "login-82e4e.firebasestorage.app",
  messagingSenderId: "460275302326",
  appId: "1:460275302326:web:0ffaf28167ba2e00584b17",
  measurementId: "G-3SDDBJKYG3",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// const analytics = getAnalytics(app);

export default app;
