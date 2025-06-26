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

  // Máscaras simples
  const maskDocumento = (value) => {
    // Remove tudo que não for número
    let v = value.replace(/\D/g, '');
    if (form.tipo === 'cliente') {
      // CNPJ: 00.000.000/0000-00
      v = v
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
      v = v.slice(0, 18);
    } else {
      // CPF: 000.000.000-00
      v = v
        .replace(/^(\d{3})(\d)/, '$1.$2')
        .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1-$2');
      v = v.slice(0, 14);
    }
    return v;
  };

  const maskTelefone = (value) => {
    let v = value.replace(/\D/g, '');
    if (v.length > 10) {
      // (00) 00000-0000
      v = v.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
    } else {
      // (00) 0000-0000
      v = v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
    }
    return v;
  };

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (profile) {
        router.push('/dashboard');
      }
    }
  }, [loading, user, profile, router]);

  const handleChange = (e) => {
    let { name, value } = e.target;

    if (name === 'documento') {
      value = maskDocumento(value);
    } else if (name === 'telefone' || name === 'contatoResponsavel') {
      value = maskTelefone(value);
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!form.nome.trim()) {
      setError('Nome é obrigatório');
      return false;
    }
    if (!form.documento.trim()) {
      setError(form.tipo === 'cliente' ? 'CNPJ é obrigatório' : 'CPF é obrigatório');
      return false;
    }
    // Pode adicionar validação mais robusta de CPF/CNPJ aqui
    setError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);

    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('../../firebase/config');


      await setDoc(doc(db, 'users', user.uid), {
        nome: form.nome,
        tipo: form.tipo,
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

      router.push('/dashboard');
    } catch (err) {
      setError('Erro ao salvar dados. Tente novamente.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className={styles.container}>
      <h1>Complete seu perfil</h1>

      {error && <div className={styles.error}>{error}</div>}

      <form onSubmit={handleSubmit} className={styles.form}>
        <label>
          Nome completo*
          <input
            type="text"
            name="nome"
            value={form.nome}
            onChange={handleChange}
            required
          />
        </label>

        <label>
          Tipo de usuário*
          <select name="tipo" value={form.tipo} onChange={handleChange}>
            <option value="cliente">Cliente</option>
            <option value="motoboy">Motoboy</option>
          </select>
        </label>

        <label>
          {form.tipo === 'cliente' ? 'CNPJ*' : 'CPF*'}
          <input
            type="text"
            name="documento"
            value={form.documento}
            onChange={handleChange}
            maxLength={form.tipo === 'cliente' ? 18 : 14}
            required
          />
        </label>

        <label>
          Telefone
          <input
            type="tel"
            name="telefone"
            value={form.telefone}
            onChange={handleChange}
          />
        </label>

        <fieldset className={styles.fieldset}>
          <legend>Endereço</legend>

          <label>
            Rua
            <input
              type="text"
              name="rua"
              value={form.rua}
              onChange={handleChange}
            />
          </label>

          <label>
            Número
            <input
              type="text"
              name="numero"
              value={form.numero}
              onChange={handleChange}
            />
          </label>

          <label>
            Cidade
            <input
              type="text"
              name="cidade"
              value={form.cidade}
              onChange={handleChange}
            />
          </label>

          <label>
            Estado
            <input
              type="text"
              name="estado"
              value={form.estado}
              onChange={handleChange}
            />
          </label>

          <label>
            País
            <input
              type="text"
              name="pais"
              value={form.pais}
              onChange={handleChange}
            />
          </label>
        </fieldset>

        <label>
          Responsável
          <input
            type="text"
            name="responsavel"
            value={form.responsavel}
            onChange={handleChange}
          />
        </label>

        <label>
          Contato do responsável
          <input
            type="tel"
            name="contatoResponsavel"
            value={form.contatoResponsavel}
            onChange={handleChange}
          />
        </label>

        <button type="submit" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar perfil'}
        </button>
      </form>
    </main>
  );
}
