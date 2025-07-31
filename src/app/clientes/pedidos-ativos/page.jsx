'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthProvider';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase/firebaseClient';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import styles from './pedidosAtivos.module.css';

export default function PedidosAtivos() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [entregas, setEntregas] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      const q = query(
        collection(db, 'entregas'),
        where('clienteId', '==', user.uid),
        where('status', '==', 'ativo')
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const entregasData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setEntregas(entregasData);
          setLoadingData(false);
        },
        (error) => {
          console.error('Erro ao buscar entregas ativas:', error);
          toast.error('Erro ao carregar entregas ativas. Tente novamente.');
          setLoadingData(false);
        }
      );

      return () => unsubscribe();
    }
  }, [user, loading, router]);

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleString('pt-BR', { 
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    }
    try {
      return new Date(timestamp).toLocaleString('pt-BR', { 
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return '-';
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'ativo':
        return styles.statusAtivo;
      case 'entregue':
        return styles.statusEntregue;
      case 'cancelado':
        return styles.statusCancelado;
      default:
        return '';
    }
  };

  if (loading || loadingData) {
    return (
      <main className={styles.container}>
        <div className={styles.spinner}></div>
        <p className={styles.loadingText}>Carregando entregas ativas...</p>
        <ToastContainer />
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Entregas Ativas</h1>
      {entregas.length === 0 && <p className={styles.emptyMessage}>Você não tem entregas ativas.</p>}
      <ul className={styles.list}>
        {entregas.map(entrega => (
          <li key={entrega.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={`${styles.status} ${getStatusClass(entrega.status)}`}>
                {entrega.status || '-'}
              </span>
              <span className={styles.date}>{formatDate(entrega.dataEntrega)}</span>
            </div>
            <div className={styles.cardBody}>
              <p><strong>Destinatário:</strong> {entrega.destinatario || '-'}</p>
              <p><strong>Telefone:</strong> {entrega.telefone || '-'}</p>
              <p><strong>Origem:</strong> {entrega.origem || '-'}</p>
              <p><strong>Destino:</strong> {entrega.destino || '-'}</p>
              <p><strong>Descrição:</strong> {entrega.descricao || '—'}</p>

            </div>
          </li>
        ))}
      </ul>
      <button className={styles.button} onClick={() => router.push('/dashboard')}>
        Voltar ao dashboard
      </button>
      <ToastContainer />
    </main>
  );
}
