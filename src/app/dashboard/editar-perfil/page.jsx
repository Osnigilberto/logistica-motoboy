"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/firebase/firebaseClient";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import styles from "../../completar-perfil/completarPerfil.module.css";
import VMasker from "vanilla-masker";

export default function EditarPerfil() {
  const router = useRouter();
  const [dados, setDados] = useState({
    nome: "",
    cnpj: "",
    empresa: "",
    localizacao: "",
    telefone: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return router.push("/login");

    const carregarPerfil = async () => {
      const ref = doc(db, "usuarios", user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setDados((prev) => ({ ...prev, ...snap.data() }));
      }
      setLoading(false);
    };

    carregarPerfil();
  }, [router]);

  const aplicarMascara = (name, value) => {
    if (name === "cnpj") {
      const digitos = value.replace(/\D/g, "");
      if (digitos.length <= 11) return VMasker.toPattern(digitos, "999.999.999-99");
      return VMasker.toPattern(digitos, "99.999.999/9999-99");
    }

    if (name === "telefone") {
      const digitos = value.replace(/\D/g, "");
      if (digitos.length <= 10) return VMasker.toPattern(digitos, "(99) 9999-9999");
      return VMasker.toPattern(digitos, "(99) 99999-9999");
    }

    return value;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDados({ ...dados, [name]: aplicarMascara(name, value) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return router.push("/login");

    await setDoc(
      doc(db, "usuarios", user.uid),
      { ...dados },
      { merge: true }
    );

    alert("Perfil atualizado com sucesso!");
    router.push("/dashboard");
  };

  if (loading) {
    return (
      <div className={styles.spinnerWrapper}>
        <div className={styles.spinner}></div>
        <p>Carregando perfil...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.formContainer}>
      <h2 className={styles.title}>Editar Perfil</h2>

      <input
        name="nome"
        placeholder="Nome completo"
        onChange={handleChange}
        value={dados.nome}
        className={styles.input}
        required
      />
      <input
        name="cnpj"
        placeholder="CPF ou CNPJ"
        onChange={handleChange}
        value={dados.cnpj}
        className={styles.input}
        required
      />
      <input
        name="empresa"
        placeholder="Empresa"
        onChange={handleChange}
        value={dados.empresa}
        className={styles.input}
      />
      <input
        name="localizacao"
        placeholder="Localização"
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
        Salvar Alterações
      </button>

      <a href="/dashboard" className={styles.voltar}>
        ← Voltar
      </a>
    </form>
  );
}
