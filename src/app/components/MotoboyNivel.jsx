'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { FaStar, FaChartLine } from 'react-icons/fa';
import styles from './MotoboyNivel.module.css';

const db = getFirestore();

export default function MotoboyNivel() {
  const { user } = useAuth();
  const [xp, setXp] = useState(0);
  const [nivel, setNivel] = useState(0);
  const [loading, setLoading] = useState(true);

  // XP necessário por nível (cumulativo)
  const xpPorNivel = Array.from({ length: 11 }, (_, i) => (i + 1) * 100);

  useEffect(() => {
    if (user?.uid) {
      const fetchNivel = async () => {
        const docRef = doc(db, 'users', user.uid);
        const snapshot = await getDoc(docRef);

        if (snapshot.exists()) {
          const data = snapshot.data();
          setXp(data?.xp || 0);
          setNivel(data?.nivel || 0);
        }

        setLoading(false);
      };

      fetchNivel();
    }
  }, [user]);

  if (loading) {
    return <p>Carregando nível...</p>;
  }

  const xpAtual = xp;
  const xpNecessario = xpPorNivel[nivel] || 1000;
  const progresso = Math.min((xpAtual / xpNecessario) * 100, 100);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <FaStar className={styles.icon} />
        <h2>Nível {nivel}</h2>
      </div>
      <p>{xpAtual} XP / {xpNecessario} XP</p>
      <div className={styles.progressBar}>
        <div className={styles.progress} style={{ width: `${progresso}%` }}></div>
      </div>
      <p className={styles.proximaMeta}>
        Faltam {Math.max(xpNecessario - xpAtual, 0)} XP para o próximo nível
      </p>
      <div className={styles.bonusInfo}>
        <FaChartLine /> <span>Ganhos aumentam com o nível!</span>
      </div>
    </div>
  );
}
