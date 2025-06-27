'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../../context/AuthProvider';
import { useRouter } from 'next/navigation';
import { db } from '../../../firebase/firebaseClient';
import styles from './novaEntrega.module.css';

export default function NovaEntrega() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    origem: '',
    destino: '',
    descricao: '',
    dataEntrega: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/dashboard');
    }
  }, [loading, user, router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!form.origem.trim()) {
      setError('Origem é obrigatória');
      return false;
    }
    if (!form.destino.trim()) {
      setError('Destino é obrigatório');
      return false;
    }
    if (!form.dataEntrega.trim()) {
      setError('Data da entrega é obrigatória');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    try {
      await addDoc(collection(db, 'entregas'), {
        clientId: user.uid,
        origem: form.origem,
        destino: form.destino,
        descricao: form.descricao,
        dataEntrega: new Date(form.dataEntrega),
        dataCriacao: serverTimestamp(),
        status: 'ativo',
        motoboyId: '',
      });
      router.push('/clientes/pedidos-ativos');
    } catch (err) {
      setError('Erro ao criar pedido. Tente novamente.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
    return <main className={styles.container}><p>Carregando...</p></main>;
  }

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Nova Entrega</h1>
      {error && <p className={styles.error}>{error}</p>}
      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.label}>
          Origem*
          <input
            type="text"
            name="origem"
            value={form.origem}
            onChange={handleChange}
            className={styles.input}
            required
            placeholder="Endereço de origem"
          />
        </label>
        <label className={styles.label}>
          Destino*
          <input
            type="text"
            name="destino"
            value={form.destino}
            onChange={handleChange}
            className={styles.input}
            required
            placeholder="Endereço de destino"
          />
        </label>
        <label className={styles.label}>
          Descrição / Observações
          <textarea
            name="descricao"
            value={form.descricao}
            onChange={handleChange}
            className={styles.textarea}
            placeholder="Detalhes adicionais (opcional)"
            rows={4}
          />
        </label>
        <label className={styles.label}>
          Data da Entrega*
          <input
            type="datetime-local"
            name="dataEntrega"
            value={form.dataEntrega}
            onChange={handleChange}
            className={styles.input}
            required
          />
        </label>
        <div className={styles.buttons}>
          <button
            type="button"
            className={styles.buttonSecondary}
            onClick={() => router.back()}
            disabled={saving}
          >
            Voltar
          </button>
          <button
            type="submit"
            className={styles.buttonPrimary}
            disabled={saving}
          >
            {saving ? 'Salvando...' : 'Criar Pedido'}
          </button>
        </div>
      </form>
    </main>
  );
}
