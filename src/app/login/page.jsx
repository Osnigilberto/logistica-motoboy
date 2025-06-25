"use client";

import React, { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import styles from "./login.module.css";
import { auth, db } from "@/firebase/firebaseConfig";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { FcGoogle } from "react-icons/fc";
import SocialButton from "./SocialButton";

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const role = searchParams.get("role") || "cliente";
  const isMotoboy = role === "motoboy";

  const [mode, setMode] = useState("login");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmaSenha, setConfirmaSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const redirecionarConformePerfil = async (uid) => {
    const ref = doc(db, "usuarios", uid);
    const snap = await getDoc(ref);
    const data = snap.data();
    if (snap.exists() && data?.perfilCompleto) {
      router.push("/dashboard");
    } else {
      router.push("/completar-perfil");
    }
  };

  const fazerLoginGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      await redirecionarConformePerfil(user.uid);
    } catch (error) {
      alert(error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (mode === "cadastro") {
        if (senha !== confirmaSenha) {
          alert("As senhas não conferem.");
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
        await updateProfile(userCredential.user, { displayName: nome });
        alert("Cadastro realizado com sucesso!");
        setMode("login");
        await redirecionarConformePerfil(userCredential.user.uid);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, senha);
        alert("Login realizado com sucesso!");
        await redirecionarConformePerfil(userCredential.user.uid);
      }
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>
          {mode === "login"
            ? isMotoboy
              ? "Login do Motoboy"
              : "Login do Cliente"
            : isMotoboy
            ? "Cadastro do Motoboy"
            : "Cadastro do Cliente"}
        </h1>

        <SocialButton
          onClick={fazerLoginGoogle}
          icon={FcGoogle}
          text="Entrar com Google"
        />

        <div className={styles.divisor}><span>ou use seu e-mail</span></div>

        <div className={styles.toggle}>
          <button
            onClick={() => setMode("login")}
            className={`${styles.toggleButton} ${mode === "login" ? styles.active : ""}`}
          >
            Entrar
          </button>
          <button
            onClick={() => setMode("cadastro")}
            className={`${styles.toggleButton} ${mode === "cadastro" ? styles.active : ""}`}
          >
            Cadastrar
          </button>
        </div>

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

        <p className={styles.switch}>
          {isMotoboy ? (
            mode === "login" ? (
              <>
                Não é motoboy?{" "}
                <a href="/login?role=cliente" className={styles.link}>
                  Login como cliente
                </a>
              </>
            ) : (
              <>
                Já tem conta?{" "}
                <a href="/login?role=motoboy" className={styles.link}>
                  Login motoboy
                </a>
              </>
            )
          ) : mode === "login" ? (
            <>
              É motoboy?{" "}
              <a href="/login?role=motoboy" className={styles.link}>
                Login motoboy
              </a>
            </>
          ) : (
            <>
              Já tem conta?{" "}
              <a href="/login?role=cliente" className={styles.link}>
                Login cliente
              </a>
            </>
          )}
        </p>

        <a href="/" className={styles.homeLink}>← Voltar para a home</a>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p>Carregando...</p>}>
      <LoginContent />
    </Suspense>
  );
}
