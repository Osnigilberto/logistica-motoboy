'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getFirestore, collection, getDocs } from 'firebase/firestore'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { app } from '@/firebase/firebaseClient'
import Sidebar from './sidebar'
import styles from './admin.module.css'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

export default function AdminDashboard() {
  const router = useRouter()
  const auth = getAuth()
  const db = getFirestore(app)
  const ADMIN_UID = 'TkIu3cI2itQ2K4xAkHQ9l9KTvp83'

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [usuarios, setUsuarios] = useState([])
  const [entregas, setEntregas] = useState([])

  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroMotoboy, setFiltroMotoboy] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')

  const [totais, setTotais] = useState({
    clientesCount: 0,
    motoboysCount: 0,
    entregasAtivas: 0,
    entregasEmAndamento: 0,
    entregasFinalizadas: 0,
    totalCliente: 0,
    totalMotoboy: 0,
    totalPlataforma: 0
  })

  // Observar login
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [auth])

  // Redireciona se não for admin
  useEffect(() => {
    if (!loading && (!user || user.uid !== ADMIN_UID)) {
      router.push('/admin/login')
    }
  }, [loading, user, router])

  // Busca usuários e entregas
  useEffect(() => {
    if (!user || user.uid !== ADMIN_UID) return

    const fetchData = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'users'))
        const usersList = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        setUsuarios(usersList)

        const entregasSnap = await getDocs(collection(db, 'entregas'))
        const entregasList = entregasSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        setEntregas(entregasList)

        // Totais
        const clientesCount = usersList.filter(u => u.tipo === 'cliente').length
        const motoboysCount = usersList.filter(u => u.tipo === 'motoboy').length
        const entregasAtivas = entregasList.filter(e => e.status === 'ativo').length
        const entregasEmAndamento = entregasList.filter(e => e.status === 'em andamento').length
        const entregasFinalizadas = entregasList.filter(e => e.status === 'finalizada').length
        const totalCliente = entregasList.reduce((acc, e) => acc + (e.valorCliente || 0), 0)
        const totalMotoboy = entregasList.reduce((acc, e) => acc + (e.valorMotoboy || 0), 0)
        const totalPlataforma = entregasList.reduce((acc, e) => acc + (e.valorPlataforma || 0), 0)

        setTotais({
          clientesCount,
          motoboysCount,
          entregasAtivas,
          entregasEmAndamento,
          entregasFinalizadas,
          totalCliente,
          totalMotoboy,
          totalPlataforma
        })
      } catch (err) {
        console.error('Erro ao buscar dados do dashboard:', err)
      }
    }

    fetchData()
  }, [user, db])

  // Entregas filtradas
  const entregasFiltradas = useMemo(() => {
    return entregas.filter(e => 
      (!filtroCliente || e.clienteId === filtroCliente) &&
      (!filtroMotoboy || e.motoboyId === filtroMotoboy) &&
      (!filtroStatus || e.status === filtroStatus)
    )
  }, [entregas, filtroCliente, filtroMotoboy, filtroStatus])

  if (loading) return <p className={styles.loading}>Carregando...</p>
  if (!user || user.uid !== ADMIN_UID) return null

  // ------------------- Cores consistentes de status -------------------
  const statusColors = {
    ativo: '#2ec7ccff',
    'em andamento': '#3498db',
    finalizada: '#2ecc71',
  }

  // Dados para gráficos
  const dataStatus = [
    { name: 'Ativo', value: entregasFiltradas.filter(e => e.status === 'ativo').length, color: statusColors['ativo'] },
    { name: 'Em andamento', value: entregasFiltradas.filter(e => e.status === 'em andamento').length, color: statusColors['em andamento'] },
    { name: 'Finalizada', value: entregasFiltradas.filter(e => e.status === 'finalizada').length, color: statusColors['finalizada'] },
  ]

  return (
    <div className={styles.layout}>
      <Sidebar />
      <main className={styles.content}>
        <h1 className={styles.title}>Painel Administrativo</h1>

        {/* Cards de Totais */}
        <div className={styles.cards}>
          <div className={styles.card}>
            <h2>Clientes</h2>
            <p>{totais.clientesCount}</p>
          </div>
          <div className={styles.card}>
            <h2>Motoboys</h2>
            <p>{totais.motoboysCount}</p>
          </div>
          <div className={styles.card}>
            <h2>Entregas Ativas</h2>
            <p>{totais.entregasAtivas}</p>
          </div>
          <div className={styles.card}>
            <h2>Em Andamento</h2>
            <p>{totais.entregasEmAndamento}</p>
          </div>
          <div className={styles.card}>
            <h2>Finalizadas</h2>
            <p>{totais.entregasFinalizadas}</p>
          </div>
          <div className={styles.card}>
            <h2>Total Plataforma</h2>
            <p>R$ {totais.totalPlataforma.toFixed(2)}</p>
          </div>
          <div className={styles.card}>
            <h2>Total Clientes/Loja</h2>
            <p>R$ {totais.totalCliente.toFixed(2)}</p>
          </div>
          <div className={styles.card}>
            <h2>Total Motoboys</h2>
            <p>R$ {totais.totalMotoboy.toFixed(2)}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className={styles.filters}>
          <select value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)}>
            <option value="">Todos os clientes</option>
            {usuarios.filter(u => u.tipo === 'cliente').map(c => (
              <option key={c.id} value={c.id}>{c.nome || c.nomeEmpresa}</option>
            ))}
          </select>

          <select value={filtroMotoboy} onChange={e => setFiltroMotoboy(e.target.value)}>
            <option value="">Todos os motoboys</option>
            {usuarios.filter(u => u.tipo === 'motoboy').map(m => (
              <option key={m.id} value={m.id}>{m.nome}</option>
            ))}
          </select>

          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
            <option value="">Todos os status</option>
            <option value="ativo">Ativo</option>
            <option value="em andamento">Em andamento</option>
            <option value="finalizada">Finalizada</option>
          </select>
        </div>

        {/* Tabela de Entregas */}
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Motoboy</th>
              <th>Status</th>
              <th>Valor Cliente</th>
              <th>Valor Motoboy</th>
              <th>Valor Plataforma</th>
            </tr>
          </thead>
          <tbody>
            {entregasFiltradas.map(e => {
              const cliente = usuarios.find(u => u.id === e.clienteId)
              const motoboy = usuarios.find(u => u.id === e.motoboyId)
              return (
                <tr key={e.id}>
                  <td>{cliente?.nome || cliente?.nomeEmpresa || '—'}</td>
                  <td>{motoboy?.nome || '—'}</td>
                  <td>
                    <span className={`${styles.badge}`} style={{ backgroundColor: statusColors[e.status] || '#777' }}>
                      {e.status}
                    </span>
                  </td>
                  <td>R$ {e.valorCliente?.toFixed(2) || 0}</td>
                  <td>R$ {e.valorMotoboy?.toFixed(2) || 0}</td>
                  <td>R$ {e.valorPlataforma?.toFixed(2) || 0}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Gráficos */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', marginTop: '2rem' }}>
          <div style={{ flex: 1, minWidth: 300, height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataStatus}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3498db" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ flex: 1, minWidth: 300, height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dataStatus}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={100}
                  label
                >
                  {dataStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </main>
    </div>
  )
}
