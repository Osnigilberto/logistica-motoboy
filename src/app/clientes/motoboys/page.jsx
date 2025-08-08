'use client';

import { useEffect, useState, useRef } from 'react';
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
  const emailInputRef = useRef(null);

  const [motoboys, setMotoboys] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [emailMotoboy, setEmailMotoboy] = useState('');
  const [loadingVinculo, setLoadingVinculo] = useState(false);

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

      const unsubscribe = onSnapshot(
        q,
        async (snapshot) => {
          const motoboysData = await Promise.all(
            snapshot.docs.map(async (docSnap) => {
              const vinculoId = docSnap.id;
              const vinculoData = docSnap.data();
              const motoboyRef = doc(db, 'users', vinculoData.motoboyId);
              const motoboySnap = await getDoc(motoboyRef);

              if (motoboySnap.exists()) {
                return {
                  id: motoboySnap.id,
                  ...motoboySnap.data(),
                  vinculoId,
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

  async function handleVincularMotoboy() {
    if (!emailMotoboy.trim()) {
      toast.error('Por favor, informe o e-mail do motoboy.');
      emailInputRef.current?.focus();
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
        emailInputRef.current?.focus();
        return;
      }

      const motoboyDoc = querySnapshot.docs[0];
      const motoboyId = motoboyDoc.id;

      // Verifica se vínculo já existe para evitar duplicidade
      const vinculosQuery = query(
        collection(db, 'vinculos'),
        where('clienteId', '==', user.uid),
        where('motoboyId', '==', motoboyId),
        where('status', '==', 'ativo')
      );
      const vinculosSnap = await getDocs(vinculosQuery);
      if (!vinculosSnap.empty) {
        toast.info('Esse motoboy já está vinculado.');
        setLoadingVinculo(false);
        setEmailMotoboy('');
        return;
      }

      await addDoc(collection(db, 'vinculos'), {
        clienteId: user.uid,
        motoboyId,
        status: 'ativo',
        criadoEm: new Date(),
      });

      toast.success('Motoboy vinculado com sucesso!');
      setEmailMotoboy('');
      emailInputRef.current?.focus();
    } catch (error) {
      console.error('Erro ao vincular motoboy:', error);
      toast.error('Erro ao vincular motoboy. Tente novamente.');
    } finally {
      setLoadingVinculo(false);
    }
  }

  async function handleRemoverVinculo(vinculoId) {
    if (!confirm('Tem certeza que deseja remover este motoboy?')) return;

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
      <button
        type="button"
        onClick={() => router.back()}
        className={styles.buttonBack}
        aria-label="Voltar"
      >
        ← Voltar
      </button>

      <h1 className={styles.title}>Motoboys Vinculados</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!loadingVinculo) handleVincularMotoboy();
        }}
        className={styles.vincularContainer}
        noValidate
      >
        <label htmlFor="emailMotoboy" className={styles.label}>
          E-mail do motoboy
        </label>
        <input
          id="emailMotoboy"
          type="email"
          placeholder="email@exemplo.com"
          value={emailMotoboy}
          onChange={(e) => setEmailMotoboy(e.target.value)}
          disabled={loadingVinculo}
          className={styles.inputEmail}
          ref={emailInputRef}
          required
          autoComplete="email"
        />
        <button
          type="submit"
          className={styles.button}
          disabled={loadingVinculo}
          aria-busy={loadingVinculo}
        >
          {loadingVinculo ? <span className={styles.spinner}></span> : 'Vincular Motoboy'}
        </button>
      </form>

      {motoboys.length === 0 ? (
        <p className={styles.empty}>Você não tem motoboys vinculados.</p>
      ) : (
        <ul className={styles.list}>
          {motoboys.map((motoboy) => (
            <li key={motoboy.id} className={styles.item}>
              <p><strong>Nome:</strong> {motoboy.nome || '—'}</p>
              <p><strong>E-mail:</strong> {motoboy.email || '—'}</p>
              <p><strong>Telefone:</strong> {motoboy.telefone || '—'}</p>
              <button
                className={styles.removeButton}
                onClick={() => handleRemoverVinculo(motoboy.vinculoId)}
                aria-label={`Remover motoboy ${motoboy.nome}`}
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
