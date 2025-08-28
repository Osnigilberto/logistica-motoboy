'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthProvider';
import { useRouter } from 'next/navigation';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import DashboardLayout from '../components/DashboardLayout';
import styles from './dashboard.module.css';
import { db } from '../../firebase/firebaseClient';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28BFE'];

export default function Dashboard() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [loadingData, setLoadingData] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);

  const [entregasStatusData, setEntregasStatusData] = useState([]);
  const [ultimasEntregas, setUltimasEntregas] = useState([]);
  const [motoboysAtivosCount, setMotoboysAtivosCount] = useState(0);
  const [entregasPorDiaSemana, setEntregasPorDiaSemana] = useState([]);
  const [entregasEmAndamento, setEntregasEmAndamento] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [kmHoje, setKmHoje] = useState(0);

  const isCliente = profile?.tipo === 'cliente';
  const userType = profile?.tipo || 'cliente';
  const nomeExibicao = isCliente
    ? profile?.nomeEmpresa?.trim() || 'Sua empresa'
    : profile?.nome?.trim() || 'Motoboy';

  /* ======================
     Funções para buscar dados
  ====================== */
  async function fetchEntregasPorUsuario(uid, tipo) {
    const entregasRef = collection(db, 'entregas');
    let q;

    if (tipo === 'cliente') q = query(entregasRef, where('clienteId', '==', uid));
    else q = query(entregasRef, where('motoboyId', '==', uid));

    const snapshot = await getDocs(q);
    const entregas = [];
    snapshot.forEach((doc) => entregas.push({ id: doc.id, ...doc.data() }));
    return entregas;
  }

  function agruparPorStatus(entregas) {
    const statusCount = {};
    entregas.forEach((e) => {
      const status = e.status || 'Indefinido';
      statusCount[status] = (statusCount[status] || 0) + 1;
    });
    return Object.entries(statusCount).map(([name, value]) => ({ name, value }));
  }

  function agruparPorDiaDaSemana(entregas) {
    const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const contagem = Array(7).fill(0);
    entregas.forEach((entrega) => {
      const data = entrega.criadoEm?.toDate ? entrega.criadoEm.toDate() : new Date(entrega.criadoEm);
      const diaSemana = data.getDay();
      contagem[diaSemana]++;
    });
    return dias.map((dia, i) => ({ dia, entregas: contagem[i] }));
  }

  async function pegarUltimasEntregas(entregas, limite = 5) {
    const ordenadas = entregas
      .sort((a, b) => {
        const dataA = a.criadoEm?.toDate ? a.criadoEm.toDate() : new Date(a.criadoEm);
        const dataB = b.criadoEm?.toDate ? b.criadoEm.toDate() : new Date(b.criadoEm);
        return dataB - dataA;
      })
      .slice(0, limite);

    const entregasComNomes = await Promise.all(
      ordenadas.map(async (entrega) => {
        let nomeCliente = 'Desconhecido';
        let nomeMotoboy = 'Desconhecido';
        try {
          if (entrega.clienteId) {
            const snap = await getDoc(doc(db, 'users', entrega.clienteId));
            if (snap.exists()) nomeCliente = snap.data().nomeEmpresa || snap.data().nome || 'Cliente';
          }
          if (entrega.motoboyId) {
            const snap = await getDoc(doc(db, 'users', entrega.motoboyId));
            if (snap.exists()) nomeMotoboy = snap.data().nome || 'Motoboy';
          }
        } catch {}
        return { ...entrega, nomeCliente, nomeMotoboy };
      })
    );
    return entregasComNomes;
  }

  const getSemanaId = () => {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const semana = Math.ceil((((hoje - new Date(ano, 0, 1)) / 86400000 + hoje.getDay() + 1) / 7));
    return `${ano}-W${semana}`;
  };

  /* ======================
     Ranking otimizado: Top 10 + usuário logado
  ====================== */
  async function fetchRankingSemanal() {
    const semanaId = getSemanaId();
    const rankingRef = doc(db, 'ranking', semanaId);
    const snap = await getDoc(rankingRef);

    if (!snap.exists()) {
      setRanking([]);
      return;
    }

    const listaCompleta = snap.data().listaMotoboys || [];

    // Top 10
    const top10 = listaCompleta.slice(0, 10);

    // Verificar se o usuário logado está fora do Top 10
    let usuarioLogado = null;
    if (user) {
      usuarioLogado = listaCompleta.find(m => m.motoboyId === user.uid);
    }

    // Lista de motoboys a buscar o nome (Top10 + logado se não estiver no top 10)
    const motoboysParaBuscar = [...top10];
    if (usuarioLogado && !top10.some(m => m.motoboyId === user.uid)) {
      motoboysParaBuscar.push(usuarioLogado);
    }

    // Buscar nomes apenas desses motoboys
    const nomesCache = {};
    await Promise.all(
      motoboysParaBuscar.map(async (m) => {
        try {
          const snapUser = await getDoc(doc(db, 'users', m.motoboyId));
          nomesCache[m.motoboyId] = snapUser.exists() ? snapUser.data().nome || 'Motoboy' : m.motoboyId;
        } catch {
          nomesCache[m.motoboyId] = m.motoboyId;
        }
      })
    );

    // Mapear Top10 e logado para exibição
    const rankingExibicao = top10.map((m, i) => ({
      posicao: i + 1,
      motoboyId: m.motoboyId,
      nome: nomesCache[m.motoboyId],
      pontos: m.pontos,
    }));

    if (usuarioLogado && !top10.some(m => m.motoboyId === user.uid)) {
      rankingExibicao.push({
        posicao: listaCompleta.findIndex(m => m.motoboyId === user.uid) + 1,
        motoboyId: usuarioLogado.motoboyId,
        nome: nomesCache[usuarioLogado.motoboyId],
        pontos: usuarioLogado.pontos,
      });
    }

    setRanking(rankingExibicao);
  }

  /* ======================
     useEffect principal
  ====================== */
  useEffect(() => {
    if (!loading && user && profile) {
      async function carregarDados() {
        setLoadingData(true);
        try {
          const entregas = await fetchEntregasPorUsuario(user.uid, profile.tipo);

          setEntregasStatusData(agruparPorStatus(entregas));
          setUltimasEntregas(await pegarUltimasEntregas(entregas));
          setEntregasPorDiaSemana(agruparPorDiaDaSemana(entregas));

          if (!isCliente) {
            const emAndamento = entregas.filter((e) => e.status === 'em andamento');
            setEntregasEmAndamento(emAndamento);

            const kmTotal = emAndamento.reduce((acc, e) => acc + (e.kmPercorridosAtual || 0), 0);
            setKmHoje(kmTotal);

            // Ranking otimizado
            await fetchRankingSemanal();
          }

          if (isCliente) {
            const count = await fetchMotoboysAtivos(user.uid);
            setMotoboysAtivosCount(count);
          } else setMotoboysAtivosCount(0);
        } catch (err) {
          console.error(err);
        }
        setLoadingData(false);
      }
      carregarDados();
    } else if (!loading && !user) router.push('/login');
    else if (!loading && user && !profile) router.push('/completar-perfil');
  }, [loading, user, profile]);

  async function fetchMotoboysAtivos(clienteUid) {
    const vinculosRef = collection(db, 'vinculos');
    const snapshot = await getDocs(query(vinculosRef, where('clienteId', '==', clienteUid), where('status', '==', 'ativo')));
    return snapshot.size;
  }

  const toggleAvailability = () => setIsAvailable((prev) => !prev);

  if (loading || loadingData)
    return (
      <main className={styles.container}>
        <div className={styles.spinner} />
        <p className={styles.loadingText}>Carregando painel...</p>
      </main>
    );

  /* ======================
     Render
  ====================== */
  return (
    <DashboardLayout userType={userType}>
      <h1 className={styles.title}>
        Bem-vindo(a), {nomeExibicao}
        <span className={styles.badge}>{isCliente ? 'Cliente' : 'Motoboy'}</span>
      </h1>

      <section className={styles.kpiSection}>
        {!isCliente && (
          <>
            <div className={styles.kpiCard}>
              <h3>KM hoje</h3>
              <p>{kmHoje.toFixed(2)} km</p>
            </div>
            <div className={styles.kpiCard}>
              <h3>Limite entregas</h3>
              <p>{entregasEmAndamento.length} / 5</p>
            </div>
          </>
        )}
        <div className={styles.kpiCard}>
          <h3>Entregas em andamento</h3>
          <p>{entregasEmAndamento.length || entregasEmAndamento}</p>
        </div>
        <div className={styles.kpiCard}>
          <h3>Entregas atrasadas</h3>
          <p>{entregasStatusData.find((e) => e.name === 'atrasado')?.value || 0}</p>
        </div>
        <div className={styles.kpiCard}>
          <h3>Total no mês</h3>
          <p>{ultimasEntregas.length}</p>
        </div>
        {isCliente && (
          <div className={styles.kpiCard}>
            <h3>Motoboys ativos</h3>
            <p>{motoboysAtivosCount}</p>
          </div>
        )}
      </section>

      {!isCliente && ranking.length > 0 && (
        <section className={styles.rankingSection}>
          <h3>Ranking da Semana</h3>
          <div className={styles.tableWrapper}>
            <table className={styles.rankingTable}>
              <thead>
                <tr>
                  <th>Posição</th>
                  <th>Motoboy</th>
                  <th>Pontos</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((m, index) => {
                  const medal =
                    index === 0 ? "🥇" :
                    index === 1 ? "🥈" :
                    index === 2 ? "🥉" : "";

                  const rowClass =
                    index === 0 ? styles.rank1 :
                    index === 1 ? styles.rank2 :
                    index === 2 ? styles.rank3 : "";

                  return (
                    <tr key={m.motoboyId} className={rowClass}>
                      <td>{m.posicao}º {medal}</td>
                      <td>{m.nome}</td>
                      <td>{m.pontos}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}


      {/* Gráficos e últimas entregas */}
      <section className={styles.graphSection}>
        <div className={styles.graphCard}>
          <h3>Entregas por status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={entregasStatusData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {entregasStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.graphCard}>
          <h3>Entregas por dia da semana</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={entregasPorDiaSemana}>
              <XAxis dataKey="dia" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="entregas" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className={styles.tableSection}>
        <h3>Últimas entregas</h3>
        {ultimasEntregas.length === 0 ? (
          <p>Nenhuma entrega encontrada.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Motoboy</th>
                <th>Status</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {ultimasEntregas.map((entrega) => (
                <tr key={entrega.id}>
                  <td>{entrega.id}</td>
                  <td>{entrega.nomeCliente || 'N/D'}</td>
                  <td>{entrega.nomeMotoboy || 'N/D'}</td>
                  <td>{entrega.status}</td>
                  <td>
                    {entrega.criadoEm
                      ? entrega.criadoEm.toDate
                        ? entrega.criadoEm.toDate().toLocaleDateString()
                        : new Date(entrega.criadoEm).toLocaleDateString()
                      : 'N/D'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {!isCliente && (
        <section className={styles.statusSection}>
          <h3>Status</h3>
          <p>
            Atual: <strong>{isAvailable ? 'Disponível' : 'Ocupado'}</strong>
          </p>
          <button className={styles.button} onClick={toggleAvailability}>
            {isAvailable ? 'Ficar ocupado' : 'Ficar disponível'}
          </button>
        </section>
      )}
    </DashboardLayout>
  );
}
