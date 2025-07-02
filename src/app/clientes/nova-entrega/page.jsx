'use client';

import { useState, useEffect, useRef } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../../context/AuthProvider';
import { useRouter } from 'next/navigation';
import { db } from '../../../firebase/firebaseClient';
import VMasker from 'vanilla-masker';
import styles from './novaEntrega.module.css';
import { FiArrowLeft, FiCheck } from 'react-icons/fi';

export default function NovaEntrega() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    origem: '',
    destino: '',
    descricao: '',
    contatoRetiradaNome: '',
    contatoRetiradaTelefone: '',
    contatoEntregaNome: '',
    contatoEntregaTelefone: '',
    tipoServico: 'normal', // valor padrão
  });

  // refs para inputs de telefone
  const contatoRetiradaTelefoneRef = useRef(null);
  const contatoEntregaTelefoneRef = useRef(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/dashboard');
    }
  }, [loading, user, router]);

  // Aplica máscara nos inputs de telefone sempre que o valor mudar
  useEffect(() => {
    if (contatoRetiradaTelefoneRef.current) {
      VMasker(contatoRetiradaTelefoneRef.current).maskPattern('(99) 99999-9999');
    }
  }, [form.contatoRetiradaTelefone]);

  useEffect(() => {
    if (contatoEntregaTelefoneRef.current) {
      VMasker(contatoEntregaTelefoneRef.current).maskPattern('(99) 99999-9999');
    }
  }, [form.contatoEntregaTelefone]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validatePhone = (phone) => {
    // Remove tudo que não for número
    const digits = phone.replace(/\D/g, '');
    // Valida se tem 10 ou 11 dígitos (DDD + número)
    return digits.length === 10 || digits.length === 11;
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
    if (!form.contatoRetiradaNome.trim()) {
      setError('Nome do contato para retirada é obrigatório');
      return false;
    }
    if (!validatePhone(form.contatoRetiradaTelefone)) {
      setError('Telefone do contato para retirada é inválido');
      return false;
    }
    if (!form.contatoEntregaNome.trim()) {
      setError('Nome do contato para entrega é obrigatório');
      return false;
    }
    if (!validatePhone(form.contatoEntregaTelefone)) {
      setError('Telefone do contato para entrega é inválido');
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
        clienteId: user.uid,
        origem: form.origem,
        destino: form.destino,
        descricao: form.descricao,
        contatoRetirada: {
          nome: form.contatoRetiradaNome,
          telefone: form.contatoRetiradaTelefone,
        },
        contatoEntrega: {
          nome: form.contatoEntregaNome,
          telefone: form.contatoEntregaTelefone,
        },
        tipoServico: form.tipoServico,
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
    return (
      <main className={styles.container}>
        <p>Carregando...</p>
      </main>
    );
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
            placeholder="Endereço de origem"
            required
            disabled={saving}
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
            placeholder="Endereço de destino"
            required
            disabled={saving}
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
            disabled={saving}
          />
        </label>

        <fieldset style={{ border: 'none', padding: 0 }}>
          <legend style={{ fontWeight: '700', color: '#5d4037', marginBottom: '0.75rem' }}>
            Contato para Retirada*
          </legend>
          <label className={styles.label}>
            Nome
            <input
              type="text"
              name="contatoRetiradaNome"
              value={form.contatoRetiradaNome}
              onChange={handleChange}
              className={styles.input}
              placeholder="Nome do responsável pela retirada"
              required
              disabled={saving}
            />
          </label>
          <label className={styles.label}>
            Telefone
            <input
              type="tel"
              name="contatoRetiradaTelefone"
              value={form.contatoRetiradaTelefone}
              onChange={handleChange}
              className={styles.input}
              placeholder="Telefone do contato para retirada"
              required
              disabled={saving}
              ref={contatoRetiradaTelefoneRef}
            />
          </label>
        </fieldset>

        <fieldset style={{ border: 'none', padding: 0 }}>
          <legend style={{ fontWeight: '700', color: '#5d4037', marginBottom: '0.75rem' }}>
            Contato para Entrega*
          </legend>
          <label className={styles.label}>
            Nome
            <input
              type="text"
              name="contatoEntregaNome"
              value={form.contatoEntregaNome}
              onChange={handleChange}
              className={styles.input}
              placeholder="Nome do responsável pela entrega"
              required
              disabled={saving}
            />
          </label>
          <label className={styles.label}>
            Telefone
            <input
              type="tel"
              name="contatoEntregaTelefone"
              value={form.contatoEntregaTelefone}
              onChange={handleChange}
              className={styles.input}
              placeholder="Telefone do contato para entrega"
              required
              disabled={saving}
              ref={contatoEntregaTelefoneRef}
            />
          </label>
        </fieldset>

        <label className={styles.label}>
          Tipo de Serviço*
          <select
            name="tipoServico"
            value={form.tipoServico}
            onChange={handleChange}
            className={styles.select}
            required
            disabled={saving}
          >
            <option value="normal">Normal</option>
            <option value="urgente">Urgente</option>
            <option value="agendado">Agendado</option>
            <option value="documentos">Documentos</option>
            <option value="volumes">Volumes</option>
          </select>
        </label>

        <div className={styles.buttons}>
          <button
            type="button"
            className={styles.buttonSecondary}
            onClick={() => router.back()}
            disabled={saving}
          >
            <FiArrowLeft style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Voltar
          </button>

          <button type="submit" className={styles.buttonPrimary} disabled={saving}>
            {saving ? (
              'Salvando...'
            ) : (
              <>
                <FiCheck style={{ marginRight: 6, verticalAlign: 'middle' }} />
                Criar Pedido
              </>
            )}
          </button>
        </div>
      </form>
    </main>
  );
}
