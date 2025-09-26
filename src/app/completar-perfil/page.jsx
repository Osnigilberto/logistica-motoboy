'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthProvider';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase/firebaseClient';
import styles from './completarPerfil.module.css';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function CompletarPerfil() {
  const { user, profile, loading, fetchProfile } = useAuth();
  const router = useRouter();

  // Estado do formulário com todos os campos
  const [dados, setDados] = useState({
    nome: '',
    nomeEmpresa: '',
    tipo: 'cliente',
    documento: '',
    telefone: '',
    rua: '',
    numero: '',
    cidade: '',
    estado: '',
    pais: '',
    responsavel: '',
    contatoResponsavel: '',
  });

  const [saving, setSaving] = useState(false);

  // Redireciona para dashboard se o perfil já estiver completo
  useEffect(() => {
    if (!loading && profile?.statusPerfil === 'completo') {
      router.push('/dashboard');
    }
  }, [loading, profile, router]);

  // Preenche dados caso existam parcialmente
  useEffect(() => {
    if (profile) {
      setDados({
        nome: profile.nome || '',
        nomeEmpresa: profile.nomeEmpresa || '',
        tipo: profile.tipo || 'cliente',
        documento: profile.documento || '',
        telefone: profile.telefone || '',
        rua: profile.endereco?.rua || '',
        numero: profile.endereco?.numero || '',
        cidade: profile.endereco?.cidade || '',
        estado: profile.endereco?.estado || '',
        pais: profile.endereco?.pais || '',
        responsavel: profile.responsavel || '',
        contatoResponsavel: profile.contatoResponsavel || '',
      });
    }
  }, [profile]);

  // ---------------------------
  // Máscaras
  // ---------------------------
  const aplicarMascaraDocumento = (value) => {
    const v = value.replace(/\D/g, '');
    return dados.tipo === 'cliente'
      ? v.replace(/^(\d{2})(\d)/, '$1.$2')
         .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
         .replace(/\.(\d{3})(\d)/, '.$1/$2')
         .replace(/(\d{4})(\d)/, '$1-$2')
         .slice(0, 18)
      : v.replace(/(\d{3})(\d)/, '$1.$2')
         .replace(/(\d{3})(\d)/, '$1.$2')
         .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
         .slice(0, 14);
  };

  const aplicarMascaraTelefone = (value) => {
    const v = value.replace(/\D/g, '');
    return v.length > 10
      ? v.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3')
      : v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
  };

  // ---------------------------
  // Handle change
  // ---------------------------
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'documento') {
      setDados((prev) => ({ ...prev, documento: aplicarMascaraDocumento(value) }));
    } else if (name === 'telefone' || name === 'contatoResponsavel') {
      setDados((prev) => ({ ...prev, [name]: aplicarMascaraTelefone(value) }));
    } else {
      setDados((prev) => ({ ...prev, [name]: value }));
    }
  };

  // ---------------------------
  // Validação CPF/CNPJ
  // ---------------------------
  const validarDocumento = (valor) => {
    const apenasDigitos = valor.replace(/\D/g, '');
    return dados.tipo === 'cliente' ? apenasDigitos.length === 14 : apenasDigitos.length === 11;
  };

  // ---------------------------
  // Submit do formulário
  // ---------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    // Validações
    if (dados.tipo === 'cliente' && !dados.nomeEmpresa.trim()) {
      toast.error('Nome da empresa é obrigatório.');
      return;
    }
    if (dados.tipo === 'motoboy' && !dados.nome.trim()) {
      toast.error('Nome é obrigatório.');
      return;
    }
    if (!validarDocumento(dados.documento)) {
      toast.error(dados.tipo === 'cliente' ? 'CNPJ inválido.' : 'CPF inválido.');
      return;
    }

    setSaving(true);

    try {
      // Salva os dados no Firestore
      await setDoc(
        doc(db, 'users', user.uid),
        {
          email: user.email,
          tipo: dados.tipo,
          nome: dados.tipo === 'motoboy' ? dados.nome : '',
          nomeEmpresa: dados.tipo === 'cliente' ? dados.nomeEmpresa : '',
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
          statusPerfil: 'completo',
        },
        { merge: true }
      );

      // Atualiza o contexto
      await fetchProfile(user.uid);

      toast.success('Perfil criado com sucesso!');
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar perfil.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className={styles.spinnerWrapper}>
        <div className={styles.spinner}></div>
        <p>Carregando...</p>
      </main>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className={styles.formContainer}>
        <h2 className={styles.title}>Completar Perfil</h2>

        {/* Tipo de usuário */}
        <div className={styles.radioGroup}>
          <label>
            <input
              type="radio"
              name="tipo"
              value="cliente"
              checked={dados.tipo === 'cliente'}
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
              checked={dados.tipo === 'motoboy'}
              onChange={handleChange}
              disabled={saving}
            />
            Motoboy
          </label>
        </div>

        {/* Nome / Nome da empresa */}
        {dados.tipo === 'cliente' ? (
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

        {/* Documento */}
        <input
          name="documento"
          placeholder={dados.tipo === 'cliente' ? 'CNPJ' : 'CPF'}
          value={dados.documento}
          onChange={handleChange}
          className={styles.input}
          required
          maxLength={18}
          disabled={saving}
        />

        {/* Telefone */}
        <input
          name="telefone"
          placeholder="Telefone"
          value={dados.telefone}
          onChange={handleChange}
          className={styles.input}
          maxLength={15}
          disabled={saving}
        />

        {/* Endereço */}
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Endereço</legend>
          {['rua', 'numero', 'cidade', 'estado', 'pais'].map((field) => (
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

        {/* Responsável */}
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

        {/* Botões */}
        <button type="submit" className={styles.button} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar Perfil'}
        </button>

        <button
          type="button"
          className={styles.voltar}
          onClick={() => router.push('/')}
        >
          ← Voltar
        </button>
      </form>

      <ToastContainer position="top-right" autoClose={3000} />
    </>
  );
}
