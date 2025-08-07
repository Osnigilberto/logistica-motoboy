'use client';

import { useEffect, useState } from 'react';
import styles from './status.module.css'; // Importa o CSS Module
import { useAuth } from '@/context/AuthProvider';
import { db } from '@/firebase/firebaseClient';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  FaArrowLeft,
  FaBox,
  FaMoneyBillWave,
} from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import { startOfWeek, endOfWeek } from 'date-fns';

export default function StatusPage() {
  const { user } = useAuth(); // Dados do usuário autenticado
  const [dados, setDados] = useState(null);
  const [totalEntregas, setTotalEntregas] = useState(0);
  const [saldoPendente, setSaldoPendente] = useState(0);
  const router = useRouter();

  // Busca dados do perfil no Firestore
  async function buscarDados() {
    try {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setDados(docSnap.data());
      } else {
        toast.error('Perfil não encontrado.');
      }
    } catch (error) {
      toast.error('Erro ao carregar perfil.');
      console.error(error);
    }
  }

  // Busca estatísticas da semana atual
  async function buscarEstatisticas() {
    if (!user?.uid) return;

    try {
      const entregasRef = collection(db, 'entregas');

      // 1. Total de entregas finalizadas do motoboy (sem filtro de data ou pagamento)
      const qTotal = query(
        entregasRef,
        where('motoboyId', '==', user.uid),
        where('status', '==', 'finalizada')
      );

      const snapTotal = await getDocs(qTotal);
      setTotalEntregas(snapTotal.size);

      // 2. Saldo pendente da semana atual
      const inicioSemana = startOfWeek(new Date(), { weekStartsOn: 1 }); // segunda
      const fimSemana = endOfWeek(new Date(), { weekStartsOn: 1 });     // domingo

      const qPendentes = query(
        entregasRef,
        where('motoboyId', '==', user.uid),
        where('status', '==', 'finalizada'),
        where('pago', '==', false),
        where('criadoEm', '>=', Timestamp.fromDate(inicioSemana)),
        where('criadoEm', '<=', Timestamp.fromDate(fimSemana))
      );

      const snapPendentes = await getDocs(qPendentes);
      let total = 0;
      snapPendentes.forEach(doc => {
        const dados = doc.data();
        total += dados.valorMotoboy || 0;
      });

      setSaldoPendente(total);
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      toast.error('Erro ao carregar estatísticas.');
    }
  }

  useEffect(() => {
    if (user?.uid) {
      buscarDados();
      buscarEstatisticas();
    }
  }, [user]);

  if (!dados) {
    return (
      <main className={styles.loadingContainer}>
        <p>Carregando perfil...</p>
      </main>
    );
  }

  const progressoPercent = (dados.progressoXP ?? 0) * 100;

  return (
    <main className={styles.container}>
      {/* Botão de voltar */}
      <button
        className={styles.buttonBack}
        onClick={() => router.back()}
        aria-label="Voltar para a tela anterior"
      >
        <FaArrowLeft /> Voltar
      </button>

      {/* Perfil do motoboy */}
      <section className={styles.perfil}>
        <img
          src={user.photoURL || '/avatar-padrao.png'}
          alt="Foto de perfil"
          className={styles.fotoPerfil}
        />

        <h1 className={styles.nome}>{dados.nome || 'Motoboy'}</h1>

        <p className={styles.dadosXp}>
          Nível {dados.nivel || 1} • {Math.floor(progressoPercent)}% XP
        </p>

        {/* Barra de progresso XP */}
        <div
          className={styles.xpContainer}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.floor(progressoPercent)}
        >
          <div className={styles.progressBar}>
            <div
              className={styles.progress}
              style={{ width: `${progressoPercent}%` }}
            />
          </div>
        </div>

        {/* Medalhas */}
        <div className={styles.badges}>
          {dados.medalhas?.length > 0 ? (
            dados.medalhas.map((medalha, idx) => (
              <div key={idx} className={styles.badge}>
                🏅 {medalha}
              </div>
            ))
          ) : (
            <p className={styles.semBadges}>Nenhuma medalha ainda</p>
          )}
        </div>
      </section>

      {/* Estatísticas */}
      <section className={styles.estatisticas}>
        <div className={styles.statCard}>
          <FaBox size={20} /> Entregas finalizadas: <strong>{totalEntregas}</strong>
        </div>
        <div className={styles.statCard}>
          <FaMoneyBillWave size={20} /> Saldo pendente:{' '}
          <strong>R$ {saldoPendente.toFixed(2)}</strong>
        </div>
      </section>
    </main>
  );
}
