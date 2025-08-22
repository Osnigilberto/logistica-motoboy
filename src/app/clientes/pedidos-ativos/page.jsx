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
      <button
        type="button"
        onClick={() => router.push('/dashboard')}
        className={styles.buttonBack}
      >
        ← Voltar
      </button>

      <h1 className={styles.title}>Entregas Ativas</h1>

      {entregas.length === 0 && <p className={styles.empty}>Você não tem entregas ativas.</p>}

      <ul className={styles.lista}>
        {entregas.map(entrega => (
          <li key={entrega.id} className={styles.item}>
            <div className={styles.cardHeader}>
              <span className={`${styles.status} ${getStatusClass(entrega.status)}`}>
                {entrega.status || '-'}
              </span>
              <span className={styles.date}>{formatDate(entrega.criadoEm)}</span>
            </div>

            <div className={styles.cardBody}>
              <p><strong>Origem:</strong> {entrega.origem || '-'}</p>

              <p><strong>Paradas:</strong></p>
              <div className={styles.paradasWrapper}>
                {entrega.destinos && entrega.destinos.length > 0 ? (
                  entrega.destinos.map((endereco, i) => (
                    <div key={i} className={styles.paradaItem}>
                      <p>📍 {endereco}</p>
                      <p><strong>Destinatário:</strong> {entrega.destinatarios?.[i]?.nome || '-'}</p>
                      <p><strong>Telefone:</strong> {entrega.destinatarios?.[i]?.telefone || '-'}</p>
                    </div>
                  ))
                ) : (
                  <p>-</p>
                )}
              </div>

              <p><strong>Descrição:</strong> {entrega.descricao || '-'}</p>
            </div>
          </li>
        ))}
      </ul>

      <ToastContainer />
    </main>
  );
}
