'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthProvider';
import { useRouter } from 'next/navigation';
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../firebase/firebaseClient';
import { toast } from 'react-toastify';
import styles from './entregasDisponiveis.module.css';

export default function EntregasDisponiveis() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [entregas, setEntregas] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [aceitandoId, setAceitandoId] = useState(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      async function fetchEntregasDisponiveis() {
        setLoadingData(true);

        try {
          const vinculosRef = collection(db, 'vinculos');
          const vinculosQuery = query(
            vinculosRef,
            where('motoboyId', '==', user.uid),
            where('status', '==', 'ativo')
          );
          const vinculosSnapshot = await getDocs(vinculosQuery);

          const clienteIds = vinculosSnapshot.docs.map(doc => doc.data().clienteId);

          if (clienteIds.length === 0) {
            setEntregas([]);
            setLoadingData(false);
            return;
          }

          const entregasRef = collection(db, 'entregas');

          const chunks = [];
          for (let i = 0; i < clienteIds.length; i += 10) {
            chunks.push(clienteIds.slice(i, i + 10));
          }

          let entregasTemp = [];
          for (const chunk of chunks) {
            const entregasQuery = query(
              entregasRef,
              where('clienteId', 'in', chunk),
              where('status', '==', 'ativo'),
              where('motoboyId', '==', '')
            );
            const entregasSnapshot = await getDocs(entregasQuery);

            entregasTemp = entregasTemp.concat(
              entregasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            );
          }

          setEntregas(entregasTemp);
        } catch (error) {
          toast.error('Erro ao carregar entregas disponíveis');
        }

        setLoadingData(false);
      }

      fetchEntregasDisponiveis();
    }
  }, [user, loading, router]);

  async function podeAceitarMaisEntregas() {
    try {
      const entregasRef = collection(db, 'entregas');
      const q = query(
        entregasRef,
        where('motoboyId', '==', user.uid),
        where('status', '==', 'em andamento')
      );
      const snapshot = await getDocs(q);
      return snapshot.size < 5;
    } catch (err) {
      toast.error('Erro ao verificar limite de entregas');
      return false;
    }
  }

  async function aceitarEntrega(entregaId) {
    setAceitandoId(entregaId);

    const podeAceitar = await podeAceitarMaisEntregas();

    if (!podeAceitar) {
      toast.error('Você já atingiu o limite máximo de 5 entregas em andamento.');
      setAceitandoId(null);
      return;
    }

    try {
      const entregaRef = doc(db, 'entregas', entregaId);

      await updateDoc(entregaRef, {
        motoboyId: user.uid,
        status: 'em andamento',
        aceitaEm: serverTimestamp(),
      });

      toast.success('Entrega aceita com sucesso!');

      setEntregas(prev => prev.filter(e => e.id !== entregaId));
    } catch (error) {
      toast.error('Erro ao aceitar a entrega. Tente novamente.');
    }

    setAceitandoId(null);
  }

  if (loading || loadingData) {
    return (
      <main className={styles.container}>
        <h1 className={styles.title}>Entregas Disponíveis</h1>
        <p>Carregando entregas disponíveis...</p>
      </main>
    );
  }

  if (entregas.length === 0) {
    return (
      <main className={styles.container}>
        <h1 className={styles.title}>Entregas Disponíveis</h1>

        <button
          type="button"
          onClick={() => router.back()}
          className={styles.buttonBack}
        >
          ← Voltar
        </button>

        <p>Não há entregas disponíveis no momento.</p>
      </main>
    );
  }

  return (
    <main className={styles.container} role="main">
      <h1 className={styles.title}>Entregas Disponíveis</h1>

      <button
        type="button"
        onClick={() => router.back()}
        className={styles.buttonBack}
      >
        ← Voltar
      </button>

      <ul className={styles.list} aria-live="polite">
        {entregas.map((entrega) => (
          <li
            key={entrega.id}
            className={styles.item}
            tabIndex={0}
            aria-label={`Entrega ${entrega.id}`}
          >
            <p><strong>ID:</strong> {entrega.id}</p>
            <p><strong>Descrição:</strong> {entrega.descricao || '—'}</p>
            <p><strong>Origem:</strong> {entrega.origem || entrega.origemTexto || '—'}</p>
            <p><strong>Destino:</strong> {entrega.destino || entrega.destinoTexto || '—'}</p>
            <p><strong>Status:</strong> {entrega.status || '—'}</p>
            <p>
              <strong>Valor que você receberá:</strong>{' '}
              {typeof entrega.valorMotoboy === 'number' && !isNaN(entrega.valorMotoboy)
                ? `R$ ${entrega.valorMotoboy.toFixed(2)}`
                : '—'}
            </p>
            <p><strong>Destinatário:</strong> {entrega.destinatario || entrega.contatoEntrega?.nome || '—'}</p>
            <p><strong>Telefone:</strong> {entrega.telefoneDestinatario || entrega.contatoEntrega?.telefone || '—'}</p>
            <p>
              <strong>Distância:</strong>{' '}
              {typeof entrega.distanciaKm === 'number' && !isNaN(entrega.distanciaKm)
                ? `${entrega.distanciaKm.toFixed(2)} km`
                : '—'}
            </p>
            <p>
              <strong>Tempo estimado:</strong>{' '}
              {typeof entrega.tempoMin === 'number' && !isNaN(entrega.tempoMin)
                ? `${Math.round(entrega.tempoMin)} min`
                : '—'}
            </p>
            <button
              className={styles.button}
              onClick={() => aceitarEntrega(entrega.id)}
              disabled={aceitandoId === entrega.id}
              aria-disabled={aceitandoId === entrega.id}
              aria-live="polite"
            >
              {aceitandoId === entrega.id ? 'Aceitando...' : 'Aceitar Entrega'}
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
