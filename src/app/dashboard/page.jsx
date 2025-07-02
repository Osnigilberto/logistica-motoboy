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
import { collection, query, where, getDocs } from 'firebase/firestore';

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

  // Busca entregas para cliente ou motoboy
  async function fetchEntregasPorUsuario(uid, tipo) {
    const entregasRef = collection(db, 'entregas');
    let q;

    if (tipo === 'cliente') {
      q = query(entregasRef, where('clienteId', '==', uid));
    } else if (tipo === 'motoboy') {
      q = query(entregasRef, where('motoboyID', '==', uid));
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

  // Agrupar entregas por status para o gráfico de pizza
  function agruparPorStatus(entregas) {
    const statusCount = {};
    entregas.forEach((entrega) => {
      const status = entrega.status || 'Indefinido';
      statusCount[status] = (statusCount[status] || 0) + 1;
    });

    return Object.entries(statusCount).map(([name, value]) => ({ name, value }));
  }

  // Agrupar entregas por dia da semana
  function agruparPorDiaDaSemana(entregas) {
    const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const contagem = Array(7).fill(0);

    entregas.forEach((entrega) => {
      const data = new Date(entrega.dataCriacao);
      const diaSemana = data.getDay();
      contagem[diaSemana]++;
    });

    return dias.map((dia, index) => ({
      dia,
      entregas: contagem[index],
    }));
  }

  // Pegar últimas entregas
  function pegarUltimasEntregas(entregas, limite = 5) {
    return entregas
      .sort((a, b) => new Date(b.dataCriacao) - new Date(a.dataCriacao))
      .slice(0, limite);
  }

  // Buscar motoboys ativos
  async function fetchMotoboysAtivos(clienteUid) {
    const vinculosRef = collection(db, 'vinculos');
    const q = query(
      vinculosRef,
      where('clienteId', '==', clienteUid),
      where('status', '==', 'ativo')
    );
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
          setUltimasEntregas(pegarUltimasEntregas(entregas));
          setEntregasPorDiaSemana(agruparPorDiaDaSemana(entregas));

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
        Bem-vindo(a),{' '}
        {isCliente
          ? profile.nomeEmpresa?.trim() || 'Sua empresa'
          : profile.nome?.trim() || 'Motoboy'}
        <span className={styles.badge}>
          {isCliente ? 'Cliente' : 'Motoboy'}
        </span>
      </h1>



      {/* KPIs */}
      <section className={styles.kpiSection}>
        <div className={styles.kpiCard}>
          <h3>Entregas em andamento</h3>
          <p>
            {
              entregasStatusData.find((s) =>
                s.name.toLowerCase().includes('andamento')
              )?.value || 0
            }
          </p>
        </div>
        <div className={styles.kpiCard}>
          <h3>Entregas atrasadas</h3>
          <p>
            {
              entregasStatusData.find((s) =>
                s.name.toLowerCase().includes('atrasada')
              )?.value || 0
            }
          </p>
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

      {/* Gráficos */}
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
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
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

      {/* Últimas entregas */}
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
                <th>Status</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {ultimasEntregas.map((entrega) => (
                <tr key={entrega.id}>
                  <td>{entrega.id}</td>
                  <td>{entrega.clienteId || 'N/D'}</td>
                  <td>{entrega.status}</td>
                  <td>{new Date(entrega.dataCriacao).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Status do motoboy */}
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
