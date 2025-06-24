// src/firebase/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDVE2vtBA23YIvWHzA6c7-LXgO0xTnwIIo",
  authDomain: "turboexpress-2f71a.firebaseapp.com",
  projectId: "turboexpress-2f71a",
  storageBucket: "turboexpress-2f71a.firebasestorage.app",
  messagingSenderId: "339110778126",
  appId: "1:339110778126:web:e377b049e6c7b3d2bef35f",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Ativa persistência offline do Firestore
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === "failed-precondition") {
    console.warn("Persistência offline não ativada: múltiplas abas abertas");
  } else if (err.code === "unimplemented") {
    console.warn("Persistência offline não suportada pelo navegador");
  }
});

export { auth, db };
