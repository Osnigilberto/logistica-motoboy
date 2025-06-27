'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    // DEBUG 🔍
    console.log("🔥 Firebase AuthDomain atual:", auth.app.options.authDomain);
    console.log("🌐 Location hostname:", window.location.hostname);


    const result = await signInWithPopup(auth, provider);
    const userData = result.user;
    const docRef = doc(db, 'users', userData.uid);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      window.location.href = '/completar-perfil';
    } else {
      window.location.href = '/dashboard';
    }
  } catch (error) {
    console.error('❌ Erro no login com Google:', error);
  }
};


  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setProfile(null);
    window.location.href = '/';
  };

  const fetchProfile = async (uid) => {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      setProfile(docSnap.data());
    } else {
      setProfile(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        await fetchProfile(firebaseUser.uid);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signInWithGoogle, logout, fetchProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
