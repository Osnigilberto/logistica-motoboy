'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthProvider';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { db } from '../../../firebase/firebaseClient';
import styles from './motoboys.module.css';

export default function Motoboys() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [motoboys, setMotoboys] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      const q = query(
        collection(db, 'vinculados'),
        where('clienteId', '==', user.uid),
        where('status', '==', 'ativo')
      );

      const unsubscribe = onSnapshot(q, async (snapshot) => {
        const motoboysData = await Promise.all(snapshot.docs.map(async (docSnap) => {
          const vinculado = docSnap.data();
          const motoboyRef = doc(db, 'users', vinculado.motoboyID);
          const motoboySnap = await getDoc(motoboyRef);
          return motoboySnap.exists() ? { id: motoboySnap.id, ...motoboySnap.data() } : null;
        }));

        setMotoboys(motoboysData.filter(Boolean));
        setLoadingData(false);
      }, (error) => {
        console.error('Erro ao buscar motoboys:', error);
        setLoadingData(false);
      });

      return () => unsubscribe();
    }
  }, [user, loading, router]);

  if (loading || loadingData) {
    return <main className={styles.container}><p>Carregando motoboys vinculados...</p></main>;
  }

  return (
    <main className={styles.container}>
      <h1>Motoboys Vinculados</h1>
      {motoboys.length === 0 && <p>Você não tem motoboys vinculados.</p>}
      <ul className={styles.list}>
        {motoboys.map(motoboy => (
          <li key={motoboy.id} className={styles.item}>
            <p><strong>Nome:</strong> {motoboy.nome}</p>
            <p><strong>Telefone:</strong> {motoboy.telefone}</p>
            <p><strong>Status:</strong> {motoboy.statusMotoboy || '—'}</p>
          </li>
        ))}
      </ul>
      <button className={styles.button} onClick={() => router.back()}>
        Voltar
      </button>
    </main>
  );
}
