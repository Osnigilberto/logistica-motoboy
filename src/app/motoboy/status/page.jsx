'use client';

import { useEffect, useState } from 'react';
import styles from './status.module.css';
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
  updateDoc,
} from 'firebase/firestore';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import {
  FaArrowLeft,
  FaBox,
  FaMoneyBillWave,
  FaRoute,
  FaClock,
  FaStar,
  FaMedal,
} from 'react-icons/fa';
import { startOfWeek, endOfWeek, subDays, isSameDay } from 'date-fns';

export default function StatusPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Estados para dados do usuário e estatísticas
  const [dados, setDados] = useState(null);
  const [totalEntregas, setTotalEntregas] = useState(0);
  const [saldoPendente, setSaldoPendente] = useState(0);
  const [estatisticas, setEstatisticas] = useState({
    distancia: 0,
    tempoReal: 0,
    xpSemana: 0,
  });

  // 🔹 Buscar dados do perfil do motoboy no Firestore
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

  // 🔹 Buscar entregas finalizadas para cálculo de estatísticas e total de entregas
  async function buscarEstatisticas() {
    if (!user?.uid) return;

    try {
      const entregasRef = collection(db, 'entregas');

      // Total de entregas finalizadas
      const qTotal = query(
        entregasRef,
        where('motoboyId', '==', user.uid),
        where('status', '==', 'finalizada')
      );
      const snapTotal = await getDocs(qTotal);
      setTotalEntregas(snapTotal.size);

      // Semana atual (segunda a domingo)
      const inicioSemana = startOfWeek(new Date(), { weekStartsOn: 1 });
      const fimSemana = endOfWeek(new Date(), { weekStartsOn: 1 });

      const qSemana = query(
        entregasRef,
        where('motoboyId', '==', user.uid),
        where('status', '==', 'finalizada'),
        where('criadoEm', '>=', Timestamp.fromDate(inicioSemana)),
        where('criadoEm', '<=', Timestamp.fromDate(fimSemana))
      );

      const snapSemana = await getDocs(qSemana);

      let totalSaldo = 0;
      let distanciaTotal = 0;
      let tempoRealTotal = 0;

      snapSemana.forEach(doc => {
        const d = doc.data();
        totalSaldo += d.valorMotoboy || 0;
        distanciaTotal += d.distanciaKm || 0;
        tempoRealTotal += d.tempoRealMin || 0;
      });

      // XP híbrido = distância + tempo + quantidade
      const xpSemana =
        Math.round(distanciaTotal) +
        Math.floor(tempoRealTotal / 5) +
        snapSemana.size * 5;

      setSaldoPendente(totalSaldo);
      setEstatisticas({
        distancia: distanciaTotal,
        tempoReal: tempoRealTotal,
        xpSemana,
      });
    } catch (error) {
      toast.error('Erro ao carregar estatísticas.');
      console.error(error);
    }
  }

  // 🔹 Atribuir medalhas com base nas entregas e regras específicas
  async function atribuirMedalhas() {
    if (!user?.uid) return;

    try {
      const entregasRef = collection(db, 'entregas');

      // Buscar todas entregas finalizadas do motoboy
      const q = query(
        entregasRef,
        where('motoboyId', '==', user.uid),
        where('status', '==', 'finalizada')
      );
      const snap = await getDocs(q);

      const totalEntregas = snap.size;
      let distanciaTotal = 0;

      // Para regra de 5 dias seguidos entregando
      // Vamos coletar as datas distintas de entregas finalizadas
      const datasEntregas = [];

      // Para regra 50km em um dia - verificar se alguma entrega teve distância >= 50
      let entregouMais50km = false;

      snap.forEach(doc => {
        const d = doc.data();
        distanciaTotal += d.distanciaKm || 0;

        // Verifica distância >= 50 km em alguma entrega
        if ((d.distanciaKm || 0) >= 50) entregouMais50km = true;

        // Coleta datas distintas das entregas (usando só data, ignorando hora)
        if (d.criadoEm?.toDate) {
          const dataEntrega = d.criadoEm.toDate();
          // Adiciona a data sem hora
          datasEntregas.push(new Date(dataEntrega.getFullYear(), dataEntrega.getMonth(), dataEntrega.getDate()));
        }
      });

      // Filtra datas únicas (remove duplicadas)
      const datasUnicas = [...new Set(datasEntregas.map(d => d.getTime()))]
        .map(time => new Date(time))
        .sort((a, b) => a - b); // Ordena ascendente

      // Verifica se existem 5 dias consecutivos com entregas
      let diasSeguidos = 1;
      let maxDiasSeguidos = 1;

      for (let i = 1; i < datasUnicas.length; i++) {
        const diff = (datasUnicas[i] - datasUnicas[i - 1]) / (1000 * 60 * 60 * 24);
        if (diff === 1) {
          diasSeguidos++;
          if (diasSeguidos > maxDiasSeguidos) maxDiasSeguidos = diasSeguidos;
        } else {
          diasSeguidos = 1;
        }
      }

      // Define medalhas conforme regras
      const novasMedalhas = [];

      if (totalEntregas >= 1) novasMedalhas.push('Primeira entrega');
      if (totalEntregas >= 10) novasMedalhas.push('10 entregas na semana');
      if (entregouMais50km) novasMedalhas.push('50km em um dia');
      if (maxDiasSeguidos >= 5) novasMedalhas.push('5 dias seguidos entregando');

      // Pega medalhas atuais para evitar duplicação
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      const dadosUser = userSnap.data();
      const medalhasAtuais = dadosUser.medalhas || [];

      // Junta medalhas atuais com novas, sem duplicatas
      const todasMedalhas = Array.from(new Set([...medalhasAtuais, ...novasMedalhas]));

      // Atualiza Firestore e estado só se houver medalha nova
      if (todasMedalhas.length > medalhasAtuais.length) {
        await updateDoc(userRef, {
          medalhas: todasMedalhas,
        });
        setDados(prev => ({
          ...prev,
          medalhas: todasMedalhas,
        }));
        toast.success('Novas medalhas atribuídas!');
      }
    } catch (error) {
      console.error('Erro ao atribuir medalhas:', error);
      toast.error('Erro ao verificar medalhas.');
    }
  }

  // 🔹 useEffect para disparar as buscas e atribuir medalhas
  useEffect(() => {
    if (user?.uid) {
      buscarDados();
      buscarEstatisticas();
      atribuirMedalhas();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!dados) {
    return (
      <main className={styles.loadingContainer}>
        <p>Carregando perfil...</p>
      </main>
    );
  }

  // 🔹 Calcular porcentagem da barra de XP (0 a 100%)
  const progressoPercent = Math.floor((dados.progressoXP ?? 0) * 100);

  return (
    <main className={styles.container}>
      {/* 🔙 Botão Voltar */}
      <button className={styles.buttonBack} onClick={() => router.back()}>
        <FaArrowLeft /> Voltar
      </button>

      {/* 👤 Perfil e Nível */}
      <section className={styles.perfil}>
        <img
          src={user.photoURL || '/avatar-padrao.png'}
          alt="Foto de perfil"
          className={styles.fotoPerfil}
        />
        <h1 className={styles.nome}>{dados.nome || 'Motoboy'}</h1>
        <p className={styles.dadosXp}>
          Nível {dados.nivel || 1} • {progressoPercent}% XP
        </p>

        {/* 📊 Barra de XP animada */}
        <div className={styles.progressBar}>
          <div
            className={styles.progress}
            style={{ width: `${progressoPercent}%` }}
          />
        </div>

        {/* 🏅 Medalhas */}
        <div className={styles.medalhasContainer}>
          {dados.medalhas?.length > 0 ? (
            dados.medalhas.map((medalha, idx) => (
              <div key={idx} className={styles.medalhaCard}>
                <FaMedal className={styles.medalhaIcon} />
                <span>{medalha}</span>
              </div>
            ))
          ) : (
            <p className={styles.semMedalhas}>Nenhuma medalha ainda</p>
          )}
        </div>
      </section>

      {/* 📈 Estatísticas da semana */}
      <section className={styles.estatisticas}>
        <div className={styles.statCard}>
          <FaBox size={20} /> Entregas finalizadas:{' '}
          <strong>{totalEntregas}</strong>
        </div>
        <div className={styles.statCard}>
          <FaMoneyBillWave size={20} /> Saldo pendente:{' '}
          <strong>R$ {saldoPendente.toFixed(2)}</strong>
        </div>
        <div className={styles.statCard}>
          <FaRoute size={20} /> Distância na semana:{' '}
          <strong>{estatisticas.distancia.toFixed(2)} km</strong>
        </div>
        <div className={styles.statCard}>
          <FaClock size={20} /> Tempo de entrega:{' '}
          <strong>{estatisticas.tempoReal} min</strong>
        </div>
        <div className={styles.statCard}>
          <FaStar size={20} /> XP ganho na semana:{' '}
          <strong>{estatisticas.xpSemana} XP</strong>
        </div>
      </section>
    </main>
  );
}
