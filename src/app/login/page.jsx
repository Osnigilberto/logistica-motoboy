"use client";

import { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/firebase/firebaseClient";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, setDoc } from "firebase/firestore";
import styles from "./login.module.css";

export default function LoginPage() {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const router = useRouter();
  const params = useSearchParams();
  const role = params.get("role") || "cliente";

  async function handleLogin(e) {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch {
      alert("Credenciais inválidas");
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    if (password !== confirm) return alert("Senhas não conferem");

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Criar perfil básico no Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        name,
        email,
        role,
        perfilCompleto: false,
      });
      alert("Cadastro realizado! Faça login.");
      setMode("login");
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1>{mode === "login" ? `Login do ${role}` : `Cadastro do ${role}`}</h1>
        <div className={styles.toggle}>
          <button onClick={() => setMode("login")} className={mode === "login" ? styles.active : ""}>Entrar</button>
          <button onClick={() => setMode("cadastro")} className={mode === "cadastro" ? styles.active : ""}>Cadastrar</button>
        </div>
        <form onSubmit={mode === "login" ? handleLogin : handleRegister} className={styles.form}>
          {mode === "cadastro" && (
            <input placeholder="Nome" value={name} onChange={e => setName(e.target.value)} required className={styles.input} />
          )}
          <input placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className={styles.input} />
          <input placeholder="Senha" type="password" value={password} onChange={e => setPassword(e.target.value)} required className={styles.input} />
          {mode === "cadastro" && (
            <input placeholder="Confirme a senha" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required className={styles.input} />
          )}
          <button type="submit" className={styles.button}>{mode === "login" ? "Entrar" : "Cadastrar"}</button>
        </form>
      </div>
    </div>
  );
}
