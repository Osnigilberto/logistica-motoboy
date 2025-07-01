'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthProvider';
import { useRouter } from 'next/navigation';
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../../../firebase/firebaseClient';
import { toast } from 'react-toastify';
import styles from './motoboys.module.css';

export default function Motoboys() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [motoboys, setMotoboys] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [emailMotoboy, setEmailMotoboy] = useState('');
  const [loadingVinculo, setLoadingVinculo] = useState(false);

  // Protege a rota e busca vínculos ativos do cliente
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      setLoadingData(true);

      const q = query(
        collection(db, 'vinculos'),
        where('clienteId', '==', user.uid),
        where('status', '==', 'ativo')
      );

      // Escuta em tempo real os vínculos
      const unsubscribe = onSnapshot(
        q,
        async (snapshot) => {
          // Para cada vínculo, busca o motoboy vinculado
          const motoboysData = await Promise.all(
            snapshot.docs.map(async (docSnap) => {
              const vinculoId = docSnap.id;
              const vinculoData = docSnap.data();

              // Busca o documento do motoboy
              const motoboyRef = doc(db, 'users', vinculoData.motoboyID);
              const motoboySnap = await getDoc(motoboyRef);

              if (motoboySnap.exists()) {
                return {
                  id: motoboySnap.id,
                  ...motoboySnap.data(),
                  vinculoId, // Para ações como remover vínculo
                };
              }

              return null;
            })
          );

          setMotoboys(motoboysData.filter(Boolean));
          setLoadingData(false);
        },
        (error) => {
          console.error('Erro ao buscar motoboys:', error);
          toast.error('Erro ao carregar motoboys vinculados.');
          setLoadingData(false);
        }
      );

      return () => unsubscribe();
    }
  }, [user, loading, router]);

  // Função para vincular motoboy pelo e-mail
  async function handleVincularMotoboy() {
    if (!emailMotoboy.trim()) {
      toast.error('Por favor, informe o e-mail do motoboy.');
      return;
    }

    setLoadingVinculo(true);

    try {
      const q = query(
        collection(db, 'users'),
        where('email', '==', emailMotoboy.trim().toLowerCase()),
        where('tipo', '==', 'motoboy')
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast.error('Nenhum motoboy encontrado com esse e-mail.');
        setLoadingVinculo(false);
        return;
      }

      const motoboyDoc = querySnapshot.docs[0];
      const motoboyID = motoboyDoc.id;

      await addDoc(collection(db, 'vinculos'), {
        clienteId: user.uid,
        motoboyID,
        status: 'ativo',
        criadoEm: new Date(),
      });

      toast.success('Motoboy vinculado com sucesso!');
      setEmailMotoboy('');
    } catch (error) {
      console.error('Erro ao vincular motoboy:', error);
      toast.error('Erro ao vincular motoboy. Tente novamente.');
    } finally {
      setLoadingVinculo(false);
    }
  }

  // Função para remover vínculo (atualiza status para 'removido')
  async function handleRemoverVinculo(vinculoId) {
    try {
      const vinculoRef = doc(db, 'vinculos', vinculoId);
      await updateDoc(vinculoRef, { status: 'removido' });
      toast.success('Motoboy removido com sucesso.');
    } catch (error) {
      console.error('Erro ao remover vínculo:', error);
      toast.error('Erro ao remover o motoboy.');
    }
  }

  if (loading || loadingData) {
    return (
      <main className={styles.container}>
        <div className={styles.skeleton}></div>
        <div className={styles.skeleton}></div>
        <div className={styles.skeleton}></div>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <h1 className={styles.h1}>Motoboys Vinculados</h1>

      <div className={styles.vincularContainer}>
        <input
          type="email"
          placeholder="E-mail do motoboy"
          value={emailMotoboy}
          onChange={(e) => setEmailMotoboy(e.target.value)}
          disabled={loadingVinculo}
          className={styles.inputEmail}
        />
        <button
          className={styles.button}
          onClick={handleVincularMotoboy}
          disabled={loadingVinculo}
        >
          {loadingVinculo ? (
            <span className={styles.spinner}></span>
          ) : (
            'Vincular Motoboy'
          )}
        </button>
      </div>

      {motoboys.length === 0 && <p>Você não tem motoboys vinculados.</p>}
      <ul className={styles.list}>
        {motoboys.map((motoboy) => (
          <li key={motoboy.id} className={styles.item}>
            <p>
              <strong>Nome:</strong> {motoboy.nome}
            </p>
            <p>
              <strong>Telefone:</strong> {motoboy.telefone}
            </p>
            <p>
              <strong>Status:</strong> {motoboy.statusMotoboy || '—'}
            </p>
            <button
              className={styles.removeButton}
              onClick={() => handleRemoverVinculo(motoboy.vinculoId)}
            >
              Remover
            </button>
          </li>
        ))}
      </ul>

      <button className={styles.button} onClick={() => router.back()}>
        Voltar
      </button>
    </main>
  );
}
