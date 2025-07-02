'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthProvider';
import { useRouter } from 'next/navigation';
import styles from './completarPerfil.module.css';

export default function CompletarPerfil() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
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
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!loading && user && profile) {
      setForm({
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
  }, [loading, user, profile]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  const maskDocumento = (value) => {
    let v = value.replace(/\D/g, '');
    if (form.tipo === 'cliente') {
      v = v
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
      return v.slice(0, 18);
    } else {
      v = v
        .replace(/^(\d{3})(\d)/, '$1.$2')
        .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1-$2');
      return v.slice(0, 14);
    }
  };

  const maskTelefone = (value) => {
    let v = value.replace(/\D/g, '');
    return v.length > 10
      ? v.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3')
      : v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
  };

  const handleChange = (e) => {
    let { name, value } = e.target;
    if (name === 'documento') value = maskDocumento(value);
    if (name === 'telefone' || name === 'contatoResponsavel') value = maskTelefone(value);
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (form.tipo === 'cliente' && !form.nomeEmpresa.trim()) {
      setError('Nome da empresa é obrigatório');
      return false;
    }
    if (form.tipo === 'motoboy' && !form.nome.trim()) {
      setError('Nome é obrigatório');
      return false;
    }
    if (!form.documento.trim()) {
      setError(form.tipo === 'cliente' ? 'CNPJ é obrigatório' : 'CPF é obrigatório');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('../../firebase/firebaseClient');

      await setDoc(doc(db, 'users', user.uid), {
        tipo: form.tipo,
        nome: form.tipo === 'motoboy' ? form.nome : '',
        nomeEmpresa: form.tipo === 'cliente' ? form.nomeEmpresa : '',
        documento: form.documento,
        telefone: form.telefone,
        endereco: {
          rua: form.rua,
          numero: form.numero,
          cidade: form.cidade,
          estado: form.estado,
          pais: form.pais,
        },
        responsavel: form.responsavel,
        contatoResponsavel: form.contatoResponsavel,
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        router.push('/dashboard');
      }, 1800);
    } catch (err) {
      setError('Erro ao salvar os dados. Tente novamente.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
    return (
      <main className={styles.spinnerWrapper}>
        <div className={styles.spinner} />
        <p>Carregando...</p>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <h1 className={styles.h1}>Complete seu perfil</h1>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>Perfil salvo com sucesso!</div>}

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Campo condicional: nomeEmpresa para cliente */}
        {form.tipo === 'cliente' && (
          <label className={styles.label}>
            Nome da empresa*
            <input
              className={styles.input}
              name="nomeEmpresa"
              value={form.nomeEmpresa}
              onChange={handleChange}
              required
              disabled={saving}
            />
          </label>
        )}

        {/* Campo condicional: nome para motoboy */}
        {form.tipo === 'motoboy' && (
          <label className={styles.label}>
            Nome completo*
            <input
              className={styles.input}
              name="nome"
              value={form.nome}
              onChange={handleChange}
              required
              disabled={saving}
            />
          </label>
        )}

        <div className={styles.radioGroup}>
          <label className={styles.radioLabel}>
            <input
              type="radio"
              name="tipo"
              value="cliente"
              checked={form.tipo === 'cliente'}
              onChange={handleChange}
              disabled={saving}
            />
            Cliente
          </label>
          <label className={styles.radioLabel}>
            <input
              type="radio"
              name="tipo"
              value="motoboy"
              checked={form.tipo === 'motoboy'}
              onChange={handleChange}
              disabled={saving}
            />
            Motoboy
          </label>
        </div>

        <label className={styles.label}>
          {form.tipo === 'cliente' ? 'CNPJ*' : 'CPF*'}
          <input
            className={styles.input}
            name="documento"
            value={form.documento}
            onChange={handleChange}
            required
            maxLength={form.tipo === 'cliente' ? 18 : 14}
            disabled={saving}
          />
        </label>

        <label className={styles.label}>
          Telefone
          <input
            className={styles.input}
            name="telefone"
            value={form.telefone}
            onChange={handleChange}
            disabled={saving}
          />
        </label>

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Endereço</legend>
          {['rua', 'numero', 'cidade', 'estado', 'pais'].map((field) => (
            <label key={field} className={styles.label}>
              {field.charAt(0).toUpperCase() + field.slice(1)}
              <input
                className={styles.input}
                name={field}
                value={form[field]}
                onChange={handleChange}
                disabled={saving}
              />
            </label>
          ))}
        </fieldset>

        <label className={styles.label}>
          Responsável
          <input
            className={styles.input}
            name="responsavel"
            value={form.responsavel}
            onChange={handleChange}
            disabled={saving}
          />
        </label>

        <label className={styles.label}>
          Contato do responsável
          <input
            className={styles.input}
            name="contatoResponsavel"
            value={form.contatoResponsavel}
            onChange={handleChange}
            disabled={saving}
          />
        </label>

        <button className={styles.button} type="submit" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar perfil'}
        </button>
      </form>
    </main>
  );
}
