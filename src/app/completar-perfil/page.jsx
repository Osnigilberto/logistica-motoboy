"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthProvider";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/firebaseClient";
import styles from "./completarPerfil.module.css";

export default function CompletarPerfil() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    empresa: "",
    cnpjCpf: "",
    telefone: "",
    rua: "",
    numero: "",
    cidade: "",
    estado: "",
    pais: "",
    responsavel: "",
    contatoResponsavel: "",
  });

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading]);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setForm(docSnap.data());
      }
    }
    loadData();
  }, [user]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function save(e) {
    e.preventDefault();
    if (!user) return;
    const docRef = doc(db, "users", user.uid);
    await updateDoc(docRef, { ...form, perfilCompleto: true });
    router.push("/dashboard");
  }

  if (loading || !user) return <p>Carregando...</p>;

  return (
    <form onSubmit={save} className={styles.formContainer}>
      <h2>Complete seu perfil</h2>

      <input name="empresa" placeholder="Empresa" value={form.empresa} onChange={handleChange} required className={styles.input} />
      <input name="cnpjCpf" placeholder="CNPJ ou CPF" value={form.cnpjCpf} onChange={handleChange} required className={styles.input} />
      <input name="telefone" placeholder="Telefone" value={form.telefone} onChange={handleChange} required className={styles.input} />
      <input name="rua" placeholder="Rua" value={form.rua} onChange={handleChange} required className={styles.input} />
      <input name="numero" placeholder="Número" value={form.numero} onChange={handleChange} required className={styles.input} />
      <input name="cidade" placeholder="Cidade" value={form.cidade} onChange={handleChange} required className={styles.input} />
      <input name="estado" placeholder="Estado" value={form.estado} onChange={handleChange} required className={styles.input} />
      <input name="pais" placeholder="País" value={form.pais} onChange={handleChange} required className={styles.input} />
      <input name="cep" placeholder="CEP" value={form.cep} onChange={handleChange} required className={styles.input} />
      <input name="responsavel" placeholder="Responsável" value={form.responsavel} onChange={handleChange} required className={styles.input} />
      <input name="contatoResponsavel" placeholder="Contato do responsável" value={form.contatoResponsavel} onChange={handleChange} required className={styles.input} />
      <input name="email" placeholder="Email" value={form.email} onChange={handleChange} required className={styles.input} />


      <button type="submit" className={styles.button}>Salvar</button>
    </form>
  );
}
