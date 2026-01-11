import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";
// import { getFunctions } from "firebase/functions";

// TODO: Replace with your actual Firebase project configuration
export const firebaseConfig = {
    apiKey: "AIzaSyDBj3TzFWvJC1Bm7BJEWAbViE9olHSH9qs",
    authDomain: "vnit-girls-safety.firebaseapp.com",
    projectId: "vnit-girls-safety",
    storageBucket: "vnit-girls-safety.firebasestorage.app",
    messagingSenderId: "40553570166",
    appId: "1:40553570166:web:418694082d0ed1fb356457",
    databaseURL: "https://vnit-girls-safety-default-rtdb.firebaseio.com/"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const storage = getStorage(app);
// export const functions = getFunctions(app);

export default app;
