"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/firebase/firebaseClient";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import styles from "./editarPerfil.module.css";

export default function EditarPerfil() {
  const router = useRouter();
  const [dados, setDados] = useState({
    nome: "",
    nomeEmpresa: "",
    tipo: "cliente",
    documento: "",
    telefone: "",
    rua: "",
    numero: "",
    cidade: "",
    estado: "",
    pais: "",
    responsavel: "",
    contatoResponsavel: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return router.push("/login");

    const carregarPerfil = async () => {
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setDados({
          nome: data.nome || "",
          nomeEmpresa: data.nomeEmpresa || "",
          tipo: data.tipo || "cliente",
          documento: data.documento || "",
          telefone: data.telefone || "",
          rua: data.endereco?.rua || "",
          numero: data.endereco?.numero || "",
          cidade: data.endereco?.cidade || "",
          estado: data.endereco?.estado || "",
          pais: data.endereco?.pais || "",
          responsavel: data.responsavel || "",
          contatoResponsavel: data.contatoResponsavel || "",
        });
      }
      setLoading(false);
    };

    carregarPerfil();
  }, [router]);

  const aplicarMascaraDocumento = (value) => {
    const v = value.replace(/\D/g, "");
    if (dados.tipo === "cliente") {
      return v
        .slice(0, 14)
        .replace(/^(\d{2})(\d)/, "$1.$2")
        .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1/$2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    } else {
      return v
        .slice(0, 11)
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }
  };

  const aplicarMascaraTelefone = (value) => {
    const v = value.replace(/\D/g, "");
    return v.length > 10
      ? v.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3")
      : v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "documento") {
      setDados((prev) => ({ ...prev, documento: aplicarMascaraDocumento(value) }));
    } else if (name === "telefone" || name === "contatoResponsavel") {
      setDados((prev) => ({ ...prev, [name]: aplicarMascaraTelefone(value) }));
    } else if (name === "tipo") {
      setDados((prev) => ({ ...prev, tipo: value }));
    } else {
      setDados((prev) => ({ ...prev, [name]: value }));
    }
  };

  const validarDocumento = (valor) => {
    const apenasDigitos = valor.replace(/\D/g, "");
    return dados.tipo === "cliente"
      ? apenasDigitos.length === 14
      : apenasDigitos.length === 11;
  };

  const validarTelefone = (valor) => {
    const apenasDigitos = valor.replace(/\D/g, "");
    return apenasDigitos.length >= 10;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (dados.tipo === "cliente" && !dados.nomeEmpresa.trim()) {
      toast.error("Nome da empresa é obrigatório.");
      return;
    }

    if (dados.tipo === "motoboy" && !dados.nome.trim()) {
      toast.error("Nome é obrigatório.");
      return;
    }

    if (!validarDocumento(dados.documento)) {
      toast.error(dados.tipo === "cliente" ? "CNPJ inválido." : "CPF inválido.");
      return;
    }

    if (dados.telefone && !validarTelefone(dados.telefone)) {
      toast.error("Telefone inválido.");
      return;
    }

    setSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        toast.error("Usuário não autenticado.");
        router.push("/login");
        return;
      }

      await setDoc(
        doc(db, "users", user.uid),
        {
          tipo: dados.tipo,
          nome: dados.tipo === "motoboy" ? dados.nome : "",
          nomeEmpresa: dados.tipo === "cliente" ? dados.nomeEmpresa : "",
          documento: dados.documento,
          telefone: dados.telefone,
          endereco: {
            rua: dados.rua,
            numero: dados.numero,
            cidade: dados.cidade,
            estado: dados.estado,
            pais: dados.pais,
          },
          responsavel: dados.responsavel,
          contatoResponsavel: dados.contatoResponsavel,
        },
        { merge: true }
      );

      toast.success("Perfil atualizado com sucesso!");
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar perfil.");
    } finally {
      setSaving(false);
    }
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
    <>
      <form onSubmit={handleSubmit} className={styles.formContainer}>
        <h2 className={styles.title}>Editar Perfil</h2>

        <div className={styles.radioGroup}>
          <label>
            <input
              type="radio"
              name="tipo"
              value="cliente"
              checked={dados.tipo === "cliente"}
              onChange={handleChange}
              disabled={saving}
            />
            Cliente
          </label>
          <label>
            <input
              type="radio"
              name="tipo"
              value="motoboy"
              checked={dados.tipo === "motoboy"}
              onChange={handleChange}
              disabled={saving}
            />
            Motoboy
          </label>
        </div>

        {dados.tipo === "cliente" ? (
          <input
            name="nomeEmpresa"
            placeholder="Nome da empresa"
            value={dados.nomeEmpresa}
            onChange={handleChange}
            className={styles.input}
            required
            disabled={saving}
          />
        ) : (
          <input
            name="nome"
            placeholder="Seu nome completo"
            value={dados.nome}
            onChange={handleChange}
            className={styles.input}
            required
            disabled={saving}
          />
        )}

        <input
          name="documento"
          placeholder={dados.tipo === "cliente" ? "CNPJ" : "CPF"}
          value={dados.documento}
          onChange={handleChange}
          className={styles.input}
          required
          maxLength={18}
          disabled={saving}
        />

        <input
          name="telefone"
          placeholder="Telefone"
          value={dados.telefone}
          onChange={handleChange}
          className={styles.input}
          maxLength={15}
          disabled={saving}
        />

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Endereço</legend>
          {["rua", "numero", "cidade", "estado", "pais"].map((field) => (
            <input
              key={field}
              name={field}
              placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
              value={dados[field]}
              onChange={handleChange}
              className={styles.input}
              disabled={saving}
            />
          ))}
        </fieldset>

        <input
          name="responsavel"
          placeholder="Responsável"
          value={dados.responsavel}
          onChange={handleChange}
          className={styles.input}
          disabled={saving}
        />
        <input
          name="contatoResponsavel"
          placeholder="Contato do responsável"
          value={dados.contatoResponsavel}
          onChange={handleChange}
          className={styles.input}
          disabled={saving}
        />

        <button type="submit" className={styles.button} disabled={saving}>
          {saving ? "Salvando..." : "Salvar Alterações"}
        </button>

        <Link href="/dashboard" className={styles.voltar}>
          ← Voltar
        </Link>
      </form>

      <ToastContainer position="top-right" autoClose={3000} />
    </>
  );
}
