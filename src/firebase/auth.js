// src/firebase/auth.js
import { auth } from "./firebaseClient";
import { onAuthStateChanged, signOut } from "firebase/auth";

/**
 * Escuta mudanças no estado do usuário (login/logout)
 * e chama o callback com o usuário ou null.
 */
export function verificarUsuario(callback) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Retorna uma Promise que resolve com o usuário atual ou null se não houver.
 */
export function getUser() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

/**
 * Desloga o usuário atual.
 */
export async function logout() {
  try {
    await signOut(auth);
    console.log("Usuário deslogado com sucesso.");
  } catch (error) {
    console.error("Erro ao deslogar:", error);
    throw error;
  }
}
