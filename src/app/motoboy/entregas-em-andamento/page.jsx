'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/firebaseClient';
import { useAuth } from '@/context/AuthProvider';
import { useRouter } from 'next/navigation';
import MapaEntregaMotoboy from '@/app/components/MapaEntregaMotoboy';
import styles from './entregasEmAndamento.module.css';

export default function EntregasEmAndamento() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [entrega, setEntrega] = useState(null);
  const [loadingEntrega, setLoadingEntrega] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/dashboard');
    }
  }, [loading, user, router]);

  useEffect(() => {
    const fetchEntrega = async () => {
      if (!user) return;

      try {
        const entregasRef = collection(db, 'entregas');
        const q = query(entregasRef, where('motoboyId', '==', user.uid), where('status', '==', 'ativo'));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          setEntrega({ id: doc.id, ...doc.data() });
        } else {
          setEntrega(null);
        }
      } catch (err) {
        console.error('Erro ao buscar entrega em andamento:', err);
      } finally {
        setLoadingEntrega(false);
      }
    };

    fetchEntrega();
  }, [user]);

  if (loading || loadingEntrega) {
    return (
      <main className={styles.container}>
        <p>Carregando...</p>
      </main>
    );
  }

  if (!entrega) {
    return (
      <main className={styles.container}>
        <h1 className={styles.title}>Entregas em Andamento</h1>
        <p>Nenhuma entrega em andamento.</p>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Entrega em Andamento</h1>

      <MapaEntregaMotoboy
        origemCoords={entrega.origemCoords}
        destinoCoords={entrega.destinoCoords}
      />

      <section className={styles.info}>
        <p><strong>Origem:</strong> {entrega.origem}</p>
        <p><strong>Destino:</strong> {entrega.destino}</p>
        <p><strong>Descrição:</strong> {entrega.descricao || 'Sem observações'}</p>
      </section>
    </main>
  );
}
