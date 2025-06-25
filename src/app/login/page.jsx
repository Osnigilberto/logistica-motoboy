"use client";
import React, { useState } from "react";
import { auth, db } from "@/firebase/firebaseConfig";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./login.module.css";

export default function LoginPage() {
  const [mode, setMode] = useState("login");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmaSenha, setConfirmaSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get("role") || "cliente";

  const googleProvider = new GoogleAuthProvider();

  async function checarPerfil(uid) {
    const docRef = doc(db, "usuarios", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists() && docSnap.data().perfilCompleto) {
      router.push("/dashboard");
    } else {
      router.push("/completar-perfil");
    }
  }

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Verifica se já existe no Firestore
      const userRef = doc(db, "usuarios", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // Cria perfil inicial
        await setDoc(userRef, {
          nome: user.displayName || "",
          email: user.email,
          role,
          perfilCompleto: false,
        });
      }

      await checarPerfil(user.uid);
    } catch (error) {
      alert("Erro no login Google: " + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (mode === "cadastro") {
      if (senha !== confirmaSenha) {
        alert("As senhas não conferem.");
        return;
      }

      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
        await updateProfile(userCredential.user, { displayName: nome });

        const userRef = doc(db, "usuarios", userCredential.user.uid);
        await setDoc(userRef, {
          nome,
          email,
          role,
          perfilCompleto: false,
        });

        alert("Cadastro realizado com sucesso! Complete seu perfil.");
        router.push("/completar-perfil");
      } catch (error) {
        alert(error.message);
      }
    } else {
      // Login email/senha
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, senha);
        await checarPerfil(userCredential.user.uid);
      } catch (error) {
        alert(error.message);
      }
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>
          {mode === "login" ? `Login do ${role}` : `Cadastro do ${role}`}
        </h1>

        <div className={styles.toggle}>
          <button
            onClick={() => setMode("login")}
            className={mode === "login" ? styles.active : ""}
          >
            Entrar
          </button>
          <button
            onClick={() => setMode("cadastro")}
            className={mode === "cadastro" ? styles.active : ""}
          >
            Cadastrar
          </button>
        </div>

        <button onClick={handleGoogleLogin} className={styles.googleButton} aria-label="Login com Google">
          {/* Ícone real do Google */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 533.5 544.3"
            width="20"
            height="20"
            style={{ verticalAlign: "middle", marginRight: 8 }}
          >
            <path fill="#4285F4" d="M533.5 278.4c0-17.6-1.5-34.5-4.5-50.9H272v96.4h146.9c-6.4 34.7-25.9 64.1-55.4 83.8v69.7h89.5c52.2-48 82.5-119 82.5-198.9z" />
            <path fill="#34A853" d="M272 544.3c74.1 0 136.3-24.5 181.7-66.3l-89.5-69.7c-24.9 16.7-56.7 26.5-92.2 26.5-70.9 0-131-47.9-152.5-112.2H27.3v70.6C72.3 490 166 544.3 272 544.3z" />
            <path fill="#FBBC05" d="M119.5 324.6c-6.2-18.7-6.2-38.7 0-57.4v-70.6H27.3c-24.9 49.5-24.9 108.7 0 158.2l92.2-30.2z" />
            <path fill="#EA4335" d="M272 213.7c39.2 0 74.2 13.5 101.9 39.8l76.3-76.3C402.9 129 344.6 96 272 96c-106 0-196.1 76.1-227.9 178.7l92.2 30.2c21.5-64.3 81.6-112.2 152.5-112.2z" />
          </svg>
          Entrar com Google
        </button>

        <form onSubmit={handleSubmit} className={styles.form}>
          {mode === "cadastro" && (
            <input
              type="text"
              placeholder="Seu nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              className={styles.input}
            />
          )}

          <input
            type="email"
            placeholder="Seu email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={styles.input}
          />

          <div className={styles.passwordWrapper}>
            <input
              type={mostrarSenha ? "text" : "password"}
              placeholder="Sua senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              className={styles.input}
            />
            <button
              type="button"
              className={styles.toggleSenha}
              onClick={() => setMostrarSenha((prev) => !prev)}
              aria-label={mostrarSenha ? "Esconder senha" : "Mostrar senha"}
            >
              {mostrarSenha ? "🙈" : "👁️"}
            </button>
          </div>

          {mode === "cadastro" && (
            <div className={styles.passwordWrapper}>
              <input
                type={mostrarSenha ? "text" : "password"}
                placeholder="Confirme a senha"
                value={confirmaSenha}
                onChange={(e) => setConfirmaSenha(e.target.value)}
                required
                className={styles.input}
              />
              <button
                type="button"
                className={styles.toggleSenha}
                onClick={() => setMostrarSenha((prev) => !prev)}
                aria-label={mostrarSenha ? "Esconder senha" : "Mostrar senha"}
              >
                {mostrarSenha ? "🙈" : "👁️"}
              </button>
            </div>
          )}

          <button type="submit" className={styles.button}>
            {mode === "login" ? "Entrar" : "Cadastrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
