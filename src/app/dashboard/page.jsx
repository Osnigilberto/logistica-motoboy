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

  const [entregasEmAndamento, setEntregasEmAndamento] = useState(0);
  const [entregasAtrasadas, setEntregasAtrasadas] = useState(0);
  const [totalMes, setTotalMes] = useState(0);

  async function fetchEntregasPorUsuario(uid, tipo) {
    const entregasRef = collection(db, 'entregas');
    let q;

    if (tipo === 'cliente') {
      q = query(entregasRef, where('clienteId', '==', uid));
    } else if (tipo === 'motoboy') {
      q = query(entregasRef, where('motoboyId', '==', uid));
    } else {
      q = query(entregasRef, where('clienteId', '==', uid));
    }

    const snapshot = await getDocs(q);
    const entregas = [];
    snapshot.forEach((doc) => {
      entregas.push({ id: doc.id, ...doc.data() });
    });
    return entregas;
  }

  function agruparPorStatus(entregas) {
    const statusCount = {};
    entregas.forEach((entrega) => {
      const status = entrega.status || 'Indefinido';
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
    return dias.map((dia, index) => ({
      dia,
      entregas: contagem[index],
    }));
  }

  async function pegarUltimasEntregas(entregas, limite = 5) {
    const entregasOrdenadas = entregas
      .sort((a, b) => {
        const dataA = a.criadoEm?.toDate ? a.criadoEm.toDate() : new Date(a.criadoEm);
        const dataB = b.criadoEm?.toDate ? b.criadoEm.toDate() : new Date(b.criadoEm);
        return dataB - dataA;
      })
      .slice(0, limite);

    const entregasComNomes = await Promise.all(
      entregasOrdenadas.map(async (entrega) => {
        let nomeCliente = 'Desconhecido';
        let nomeMotoboy = 'Desconhecido';

        try {
          if (entrega.clienteId) {
            const clienteRef = doc(db, 'users', entrega.clienteId);
            const clienteSnap = await getDoc(clienteRef);
            if (clienteSnap.exists()) {
              const data = clienteSnap.data();
              nomeCliente = data.nomeEmpresa || data.nome || 'Cliente';
            }
          }

          if (entrega.motoboyId) {
            const motoboyRef = doc(db, 'users', entrega.motoboyId);
            const motoboySnap = await getDoc(motoboyRef);
            if (motoboySnap.exists()) {
              const data = motoboySnap.data();
              nomeMotoboy = data.nome || 'Motoboy';
            }
          }
        } catch (error) {
          console.error('Erro ao buscar nome do cliente/motoboy:', error);
        }

        return { ...entrega, nomeCliente, nomeMotoboy };
      })
    );

    return entregasComNomes;
  }

  async function fetchMotoboysAtivos(clienteUid) {
    const vinculosRef = collection(db, 'vinculos');
    const q = query(vinculosRef, where('clienteId', '==', clienteUid), where('status', '==', 'ativo'));
    const snapshot = await getDocs(q);
    return snapshot.size;
  }

  useEffect(() => {
    if (!loading && user && profile) {
      async function carregarDados() {
        setLoadingData(true);
        try {
          const entregas = await fetchEntregasPorUsuario(user.uid, profile.tipo);
          setEntregasStatusData(agruparPorStatus(entregas));
          const ultimas = await pegarUltimasEntregas(entregas);
          setUltimasEntregas(ultimas);
          setEntregasPorDiaSemana(agruparPorDiaDaSemana(entregas));

          setEntregasEmAndamento(entregas.filter(e => e.status === 'em andamento').length);
          setEntregasAtrasadas(entregas.filter(e => e.status === 'atrasado').length);

          const agora = new Date();
          const mesAtual = agora.getMonth();
          const anoAtual = agora.getFullYear();
          const entregasMes = entregas.filter(e => {
            const dataEntrega = e.criadoEm?.toDate ? e.criadoEm.toDate() : new Date(e.criadoEm);
            return dataEntrega.getMonth() === mesAtual && dataEntrega.getFullYear() === anoAtual;
          });
          setTotalMes(entregasMes.length);

          if (profile.tipo === 'cliente') {
            const count = await fetchMotoboysAtivos(user.uid);
            setMotoboysAtivosCount(count);
          } else {
            setMotoboysAtivosCount(0);
          }
        } catch (error) {
          console.error('Erro ao carregar entregas:', error);
          setEntregasStatusData([{ name: 'Erro ao carregar', value: 1 }]);
          setUltimasEntregas([]);
          setMotoboysAtivosCount(0);
          setEntregasEmAndamento(0);
          setEntregasAtrasadas(0);
          setTotalMes(0);
        }
        setLoadingData(false);
      }
      carregarDados();
    } else if (!loading && !user) {
      router.push('/login');
    } else if (!loading && user && !profile) {
      router.push('/completar-perfil');
    }
  }, [loading, user, profile, router]);

  const isCliente = profile?.tipo === 'cliente';
  const userType = profile?.tipo || 'cliente';
  const nomeExibicao = isCliente
    ? profile?.nomeEmpresa?.trim() || 'Sua empresa'
    : profile?.nome?.trim() || 'Motoboy';

  const toggleAvailability = () => {
    setIsAvailable((prev) => !prev);
  };

  if (loading || loadingData) {
    return (
      <main className={styles.container}>
        <div className={styles.spinner} />
        <p className={styles.loadingText}>Carregando painel...</p>
      </main>
    );
  }

  return (
    <DashboardLayout userType={userType}>
      <h1 className={styles.title}>
        Bem-vindo(a), {nomeExibicao}
        <span className={styles.badge}>{isCliente ? 'Cliente' : 'Motoboy'}</span>
      </h1>

      <section className={styles.kpiSection}>
        <div className={styles.kpiCard}>
          <h3>Entregas em andamento</h3>
          <p>{entregasEmAndamento}</p>
        </div>
        <div className={styles.kpiCard}>
          <h3>Entregas atrasadas</h3>
          <p>{entregasAtrasadas}</p>
        </div>
        <div className={styles.kpiCard}>
          <h3>Total no mês</h3>
          <p>{totalMes}</p>
        </div>
        {isCliente && (
          <div className={styles.kpiCard}>
            <h3>Motoboys ativos</h3>
            <p>{motoboysAtivosCount}</p>
          </div>
        )}
      </section>

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
