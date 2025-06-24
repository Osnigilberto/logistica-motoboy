"use client";
export const dynamic = 'force-dynamic';

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./login.module.css";
import { auth } from "../../firebase/firebaseConfig"; // ajuste o caminho conforme sua estrutura
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";

export default function LoginPage() {
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
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");
    setMensagem("");

    try {
      if (mode === "cadastro") {
        if (senha !== confirmaSenha) {
          setErro("As senhas não conferem.");
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
        await updateProfile(userCredential.user, { displayName: nome });

        setMensagem("Cadastro realizado com sucesso!");
        setMode("login");
        router.push("/dashboard");
      } else {
        await signInWithEmailAndPassword(auth, email, senha);
        setMensagem("Login realizado com sucesso!");
        router.push("/dashboard");
      }
    } catch (error) {
      setErro(error.message);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>
          {mode === "login"
            ? isMotoboy ? "Login do Motoboy" : "Login do Cliente"
            : isMotoboy ? "Cadastro do Motoboy" : "Cadastro do Cliente"}
        </h1>

        <div className={styles.toggle}>
          <button
            onClick={() => {
              setMode("login");
              setMensagem("");
              setErro("");
            }}
            className={mode === "login" ? styles.active : ""}
          >
            Entrar
          </button>
          <button
            onClick={() => {
              setMode("cadastro");
              setMensagem("");
              setErro("");
            }}
            className={mode === "cadastro" ? styles.active : ""}
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

          {mensagem && <p className={styles.successMsg}>{mensagem}</p>}
          {erro && <p className={styles.errorMsg}>{erro}</p>}
        </form>

        <p className={styles.switch}>
          {isMotoboy ? (
            <>
              {mode === "login" ? (
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
              )}
            </>
          ) : (
            <>
              {mode === "login" ? (
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
            </>
          )}
        </p>
      </div>
    </div>
  );
}
