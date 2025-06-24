"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/firebase/firebaseConfig";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import styles from "./completarPerfil.module.css";

export default function CompletarPerfil() {
  const router = useRouter();
  const [dados, setDados] = useState({
    nome: "",
    cnpj: "",
    empresa: "",
    localizacao: "",
    telefone: "",
  });

  // Preencher dados existentes
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const carregarDados = async () => {
      const docRef = doc(db, "usuarios", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setDados((prev) => ({
          ...prev,
          ...docSnap.data(),
        }));
      }
    };

    carregarDados();
  }, []);

  const validarDocumento = (valor) => {
    const cnpjRegex = /^\d{14}$/;
    const cpfRegex = /^\d{11}$/;
    return cpfRegex.test(valor) || cnpjRegex.test(valor);
  };

  const handleChange = (e) => {
    setDados({ ...dados, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    if (!validarDocumento(dados.cnpj)) {
      alert("CPF ou CNPJ inválido. Use apenas números.");
      return;
    }

    await setDoc(doc(db, "usuarios", user.uid), {
      ...dados,
      uid: user.uid,
      email: user.email,
      role: new URLSearchParams(window.location.search).get("role") || "cliente",
    });

    alert("Perfil salvo com sucesso!");
    router.push("/dashboard");
  };

  return (
    <form onSubmit={handleSubmit} className={styles.formContainer}>
      <h2>Complete seu perfil</h2>
      <input
        name="nome"
        placeholder="Nome completo"
        required
        onChange={handleChange}
        value={dados.nome}
        className={styles.input}
      />
      <input
        name="cnpj"
        placeholder="CPF ou CNPJ (somente números)"
        required
        onChange={handleChange}
        value={dados.cnpj}
        className={styles.input}
      />
      <input
        name="empresa"
        placeholder="Nome da empresa"
        onChange={handleChange}
        value={dados.empresa}
        className={styles.input}
      />
      <input
        name="localizacao"
        placeholder="Cidade / Estado"
        onChange={handleChange}
        value={dados.localizacao}
        className={styles.input}
      />
      <input
        name="telefone"
        placeholder="Telefone"
        onChange={handleChange}
        value={dados.telefone}
        className={styles.input}
      />
      <button type="submit" className={styles.button}>
        Salvar
      </button>
    </form>
  );
}
