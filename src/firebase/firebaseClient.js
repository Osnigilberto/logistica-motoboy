// SDK cliente para usar em React (login, logout, etc)
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDVE2vtBA23YIvWHzA6c7-LXgO0xTnwIIo",
    authDomain: "turboexpress-2f71a.firebaseapp.com",
    projectId: "turboexpress-2f71a",
    storageBucket: "turboexpress-2f71a.firebasestorage.app",
    messagingSenderId: "339110778126",
    appId: "1:339110778126:web:e377b049e9f1b3d2bef35f",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
