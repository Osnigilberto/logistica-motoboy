'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import {
  FaArrowLeft,
  FaBox,
  FaMoneyBillWave,
  FaRoute,
  FaClock,
  FaMedal,
} from 'react-icons/fa';
import { startOfWeek, endOfWeek } from 'date-fns';
import styles from './status.module.css';

export default function StatusPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [dados, setDados] = useState(null);
  const [totalEntregas, setTotalEntregas] = useState(0);
  const [saldoPendente, setSaldoPendente] = useState(0);
  const [estatisticas, setEstatisticas] = useState({
    distancia: 0,
    tempoReal: 0,
  });
  const [rankingSemana, setRankingSemana] = useState([]);

  // Buscar dados do perfil
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

  // Buscar estatísticas da semana
  async function buscarEstatisticas() {
    if (!user?.uid) return;

    try {
      const entregasRef = collection(db, 'entregas');
      const qSemana = query(
        entregasRef,
        where('motoboyId', '==', user.uid),
        where('status', '==', 'finalizada'),
        where(
          'criadoEm',
          '>=',
          Timestamp.fromDate(startOfWeek(new Date(), { weekStartsOn: 1 }))
        ),
        where(
          'criadoEm',
          '<=',
          Timestamp.fromDate(endOfWeek(new Date(), { weekStartsOn: 1 }))
        )
      );

      const snapSemana = await getDocs(qSemana);

      let totalSaldo = 0;
      let distanciaTotal = 0;
      let tempoRealTotal = 0;

      snapSemana.forEach((doc) => {
        const d = doc.data();
        totalSaldo += d.valorMotoboy || 0;
        distanciaTotal += d.distanciaKm || 0;
        tempoRealTotal += d.tempoRealMin || 0;
      });

      setTotalEntregas(snapSemana.size);
      setSaldoPendente(totalSaldo);
      setEstatisticas({ distancia: distanciaTotal, tempoReal: tempoRealTotal });
    } catch (error) {
      toast.error('Erro ao carregar estatísticas.');
      console.error(error);
    }
  }

  // Buscar ranking da semana
  async function buscarRankingSemana() {
    try {
      const semanaId = (() => {
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const semana = Math.ceil(
          ((hoje - new Date(ano, 0, 1)) / 86400000 + hoje.getDay() + 1) / 7
        );
        return `${ano}-W${semana}`;
      })();

      const rankingRef = doc(db, 'ranking', semanaId);
      const rankingSnap = await getDoc(rankingRef);

      if (rankingSnap.exists()) {
        const data = rankingSnap.data();
        // Aqui buscamos os nomes dos motoboys
        const listaComNomes = await Promise.all(
          (data.listaMotoboys || []).map(async (item) => {
            try {
              const motoboySnap = await getDoc(doc(db, 'users', item.motoboyId));
              const motoboyData = motoboySnap.exists() ? motoboySnap.data() : {};
              return {
                uid: item.motoboyId,
                nome: motoboyData.nome || 'Motoboy',
                km: item.km || 0,
                posicao: item.posicao,
              };
            } catch (err) {
              return { uid: item.motoboyId, nome: 'Motoboy', km: item.km || 0, posicao: item.posicao };
            }
          })
        );
        setRankingSemana(listaComNomes.sort((a, b) => a.posicao - b.posicao));
      } else {
        setRankingSemana([]);
      }
    } catch (error) {
      console.error('Erro ao buscar ranking:', error);
      setRankingSemana([]);
    }
  }

  // Atribuir medalhas
  async function atribuirMedalhas() {
    if (!user?.uid) return;

    try {
      const entregasRef = collection(db, 'entregas');
      const q = query(
        entregasRef,
        where('motoboyId', '==', user.uid),
        where('status', '==', 'finalizada')
      );
      const snap = await getDocs(q);

      const totalEntregas = snap.size;
      let distanciaTotal = 0;
      const datasEntregas = [];
      let entregouMais50km = false;

      snap.forEach((doc) => {
        const d = doc.data();
        distanciaTotal += d.distanciaKm || 0;
        if ((d.distanciaKm || 0) >= 50) entregouMais50km = true;
        if (d.criadoEm?.toDate) {
          const dataEntrega = d.criadoEm.toDate();
          datasEntregas.push(new Date(dataEntrega.getFullYear(), dataEntrega.getMonth(), dataEntrega.getDate()));
        }
      });

      const datasUnicas = [...new Set(datasEntregas.map(d => d.getTime()))]
        .map((time) => new Date(time))
        .sort((a, b) => a - b);

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

      const novasMedalhas = [];
      if (totalEntregas >= 1) novasMedalhas.push('Primeira entrega');
      if (totalEntregas >= 10) novasMedalhas.push('10 entregas na semana');
      if (entregouMais50km) novasMedalhas.push('50km em um dia');
      if (maxDiasSeguidos >= 5) novasMedalhas.push('5 dias seguidos entregando');

      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      const dadosUser = userSnap.data();
      const medalhasAtuais = dadosUser.medalhas || [];

      const todasMedalhas = Array.from(new Set([...medalhasAtuais, ...novasMedalhas]));

      if (todasMedalhas.length > medalhasAtuais.length) {
        await updateDoc(userRef, { medalhas: todasMedalhas });
        setDados((prev) => ({ ...prev, medalhas: todasMedalhas }));
        toast.success('Novas medalhas atribuídas!');
      }
    } catch (error) {
      console.error('Erro ao atribuir medalhas:', error);
      toast.error('Erro ao verificar medalhas.');
    }
  }

  useEffect(() => {
    if (user?.uid) {
      buscarDados();
      buscarEstatisticas();
      atribuirMedalhas();
      buscarRankingSemana();
    }
  }, [user]);

  if (!dados) {
    return (
      <main className={styles.loadingContainer}>
        <p>Carregando perfil...</p>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <button className={styles.buttonBack} onClick={() => router.back()}>
        <FaArrowLeft /> Voltar
      </button>

      {/* Perfil e medalhas */}
      <section className={styles.perfil}>
        <img
          src={user.photoURL || '/avatar-padrao.png'}
          alt="Foto de perfil"
          className={styles.fotoPerfil}
        />
        <h1 className={styles.nome}>{dados.nome || 'Motoboy'}</h1>

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

      {/* Estatísticas da semana */}
      <section className={styles.estatisticas}>
        <div className={styles.statCard}>
          <FaBox size={20} /> Entregas finalizadas: <strong>{totalEntregas}</strong>
        </div>
        <div className={styles.statCard}>
          <FaMoneyBillWave size={20} /> Saldo pendente: <strong>R$ {saldoPendente.toFixed(2)}</strong>
        </div>
        <div className={styles.statCard}>
          <FaRoute size={20} /> Distância na semana: <strong>{estatisticas.distancia.toFixed(2)} km</strong>
        </div>
        <div className={styles.statCard}>
          <FaClock size={20} /> Tempo de entrega: <strong>{estatisticas.tempoReal} min</strong>
        </div>
      </section>

      {/* Ranking da semana */}
      <section className={styles.ranking}>
        <h3><FaMedal /> Ranking da Semana</h3>
        {rankingSemana.length === 0 ? (
          <p>Nenhum ranking disponível ainda.</p>
        ) : (
          <table className={styles.tableRanking}>
            <thead>
              <tr>
                <th>Posição</th>
                <th>Motoboy</th>
                <th>Km</th>
              </tr>
            </thead>
            <tbody>
              {rankingSemana.map((item, idx) => (
                <tr key={item.uid} className={item.uid === user.uid ? styles.destaque : ''}>
                  <td>{idx + 1}</td>
                  <td>{item.nome}</td>
                  <td>{item.km.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
