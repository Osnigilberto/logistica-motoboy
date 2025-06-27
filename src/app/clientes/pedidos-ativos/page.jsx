'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthProvider';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase/firebaseClient';
import styles from './pedidosAtivos.module.css';

export default function PedidosAtivos() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [pedidos, setPedidos] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      const q = query(
        collection(db, 'entregas'),
        where('clientId', '==', user.uid),
        where('status', '==', 'ativo')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const pedidosData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPedidos(pedidosData);
        setLoadingData(false);
      }, (error) => {
        console.error('Erro ao buscar pedidos ativos:', error);
        setLoadingData(false);
      });

      return () => unsubscribe();
    }
  }, [user, loading, router]);

  if (loading || loadingData) {
    return <main className={styles.container}><p>Carregando pedidos ativos...</p></main>;
  }

  return (
    <main className={styles.container}>
      <h1>Pedidos Ativos</h1>
      {pedidos.length === 0 && <p>Você não tem pedidos ativos.</p>}
      <ul className={styles.list}>
        {pedidos.map(pedido => (
          <li key={pedido.id} className={styles.item}>
            <p><strong>Origem:</strong> {pedido.origem}</p>
            <p><strong>Destino:</strong> {pedido.destino}</p>
            <p><strong>Status:</strong> {pedido.status}</p>
            <p><strong>Data Entrega:</strong> {pedido.dataEntrega?.toDate().toLocaleString()}</p>
            <p><strong>Descrição:</strong> {pedido.descricao || '—'}</p>
          </li>
        ))}
      </ul>
      <button className={styles.button} onClick={() => router.back()}>
        Voltar
      </button>
    </main>
  );
}
