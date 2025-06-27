'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useAuth } from '../../../context/AuthProvider';
import { db } from '../../../firebase/firebaseClient';
import { useRouter } from 'next/navigation';
import styles from './historico.module.css';

export default function Historico() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [pedidos, setPedidos] = useState([]);
  const [error, setError] = useState('');
  const [loadingPedidos, setLoadingPedidos] = useState(true);

  useEffect(() => {
    if (!loading && user) {
      const entregasRef = collection(db, 'entregas');
      const q = query(
        entregasRef,
        where('clientId', '==', user.uid),
        where('status', 'in', ['entregue', 'cancelado']),
        orderBy('dataEntrega', 'desc')
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const lista = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          setPedidos(lista);
          setLoadingPedidos(false);
        },
        (err) => {
          console.error(err);
          setError('Erro ao carregar histórico');
          setLoadingPedidos(false);
        }
      );

      return () => unsubscribe();
    }
  }, [user, loading]);

  if (loading || loadingPedidos) {
    return (
      <main className={styles.container}>
        <p>Carregando histórico...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className={styles.container}>
        <p className={styles.error}>{error}</p>
      </main>
    );
  }

  if (pedidos.length === 0) {
    return (
      <main className={styles.container}>
        <h1 className={styles.title}>Histórico de Entregas</h1>
        <p>Você ainda não possui entregas concluídas.</p>
        <button className={styles.button} onClick={() => router.back()}>Voltar</button>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Histórico de Entregas</h1>
      <ul className={styles.list}>
        {pedidos.map((pedido) => (
          <li key={pedido.id} className={styles.card}>
            <p><strong>Origem:</strong> {pedido.origem}</p>
            <p><strong>Destino:</strong> {pedido.destino}</p>
            <p><strong>Data de Entrega:</strong> {pedido.dataEntrega?.toDate ? pedido.dataEntrega.toDate().toLocaleString() : new Date(pedido.dataEntrega).toLocaleString()}</p>
            <p><strong>Status:</strong> {pedido.status}</p>
            <p><strong>Descrição:</strong> {pedido.descricao || '-'}</p>
          </li>
        ))}
      </ul>
      <button className={styles.button} onClick={() => router.back()}>
        Voltar
        </button>

    </main>
  );
}
