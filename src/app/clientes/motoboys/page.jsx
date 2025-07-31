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

  // Estado para lista de motoboys vinculados ao cliente
  const [motoboys, setMotoboys] = useState([]);
  // Controle de loading dos dados
  const [loadingData, setLoadingData] = useState(true);
  // Email para vincular motoboy novo
  const [emailMotoboy, setEmailMotoboy] = useState('');
  // Loading específico para a ação de vincular motoboy
  const [loadingVinculo, setLoadingVinculo] = useState(false);

  // Protege rota: redireciona para login se não estiver autenticado
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      setLoadingData(true);

      // Query para pegar vínculos ativos do cliente
      const q = query(
        collection(db, 'vinculos'),
        where('clienteId', '==', user.uid),
        where('status', '==', 'ativo')
      );

      // Escuta em tempo real as mudanças na coleção vínculos
      const unsubscribe = onSnapshot(
        q,
        async (snapshot) => {
          // Para cada vínculo ativo, busca o usuário motoboy relacionado
          const motoboysData = await Promise.all(
            snapshot.docs.map(async (docSnap) => {
              const vinculoId = docSnap.id;
              const vinculoData = docSnap.data();

              // IMPORTANTE: aqui usamos motoboyId (minúsculo) para acessar o documento do motoboy
              const motoboyRef = doc(db, 'users', vinculoData.motoboyId);
              const motoboySnap = await getDoc(motoboyRef);

              if (motoboySnap.exists()) {
                return {
                  id: motoboySnap.id,
                  ...motoboySnap.data(),
                  vinculoId, // armazenamos o id do vínculo para operações futuras
                };
              }

              return null;
            })
          );

          // Atualiza estado somente com motoboys válidos (sem null)
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

  // Função para vincular motoboy pelo e-mail fornecido
  async function handleVincularMotoboy() {
    if (!emailMotoboy.trim()) {
      toast.error('Por favor, informe o e-mail do motoboy.');
      return;
    }

    setLoadingVinculo(true);

    try {
      // Busca usuário do tipo motoboy com email informado
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
      const motoboyId = motoboyDoc.id; // CORRIGIDO: motoboyId minúsculo

      // Cria novo vínculo na coleção com status 'ativo'
      await addDoc(collection(db, 'vinculos'), {
        clienteId: user.uid,
        motoboyId, // CORRIGIDO: campo motoboyId minúsculo
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

  // Função para "remover" vínculo: atualiza status para 'removido'
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

  // Exibe loading enquanto carrega dados
  if (loading || loadingData) {
    return (
      <main className={styles.container}>
        <div className={styles.skeleton}></div>
        <div className={styles.skeleton}></div>
        <div className={styles.skeleton}></div>
      </main>
    );
  }

  // Renderização principal da página
  return (
    <main className={styles.container}>
      <h1 className={styles.h1}>Motoboys Vinculados</h1>

      {/* Form para vincular novo motoboy */}
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

      {/* Lista de motoboys vinculados */}
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
