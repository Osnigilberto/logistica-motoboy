'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getFirestore, collection, getDocs } from 'firebase/firestore'
import { useAuth } from '@/context/AuthProvider'
import { PieChart, Pie, Cell, Legend, ResponsiveContainer } from 'recharts'
import styles from './configuracoes.module.css'

const db = getFirestore()
const ADMIN_UID = 'TkIu3cI2itQ2K4xAkHQ9l9KTvp83'

export default function ConfiguracoesRelatorios() {
  const router = useRouter()
  const { user, loading } = useAuth()

  // ------------------- Estados -------------------
  const [entregas, setEntregas] = useState([])
  const [clientes, setClientes] = useState({})
  const [motoboys, setMotoboys] = useState({})
  const [loadingData, setLoadingData] = useState(true)
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroMotoboy, setFiltroMotoboy] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')

  // Cores para o gráfico e badges
  const statusColors = {
    ativo: '#2ec7ccff',
    'em andamento': '#3498db',
    finalizada: '#2ecc71',
  }

  // ------------------- Hooks -------------------
  // Busca dados de entregas e usuários
  useEffect(() => {
    if (!loading && !user) router.push('/admin/login')
    if (!user || user.uid !== ADMIN_UID) return

    const fetchData = async () => {
      setLoadingData(true)
      try {
        // Entregas
        const entregasSnap = await getDocs(collection(db, 'entregas'))
        const entregasList = entregasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        setEntregas(entregasList)

        // Usuários
        const usersSnap = await getDocs(collection(db, 'users'))
        const clientesMap = {}
        const motoboysMap = {}
        usersSnap.docs.forEach(doc => {
          const data = doc.data()
          if (data.tipo === 'cliente') clientesMap[doc.id] = data.nome || data.nomeEmpresa || 'Sem Nome'
          if (data.tipo === 'motoboy') motoboysMap[doc.id] = data.nome || 'Sem Nome'
        })
        setClientes(clientesMap)
        setMotoboys(motoboysMap)
      } catch (err) {
        console.error('Erro ao buscar dados:', err)
      }
      setLoadingData(false)
    }

    fetchData()
  }, [user, loading, router])

  // ------------------- Filtragem -------------------
  const entregasFiltradas = useMemo(() => {
    return entregas.filter(e =>
      (!filtroCliente || e.clienteId === filtroCliente) &&
      (!filtroMotoboy || e.motoboyId === filtroMotoboy) &&
      (!filtroStatus || e.status === filtroStatus)
    )
  }, [entregas, filtroCliente, filtroMotoboy, filtroStatus])

  // Organiza entregas por status para gráfico
  const dataStatus = useMemo(() => {
    return [
      { name: 'Ativo', value: entregasFiltradas.filter(e => e.status === 'ativo').length },
      { name: 'Em andamento', value: entregasFiltradas.filter(e => e.status === 'em andamento').length },
      { name: 'Finalizada', value: entregasFiltradas.filter(e => e.status === 'finalizada').length },
    ]
  }, [entregasFiltradas])

  if (!loading && user?.uid !== ADMIN_UID) return <div>Acesso negado</div>
  if (loading || loadingData) return <div>Carregando...</div>

  return (
    <div className={styles.container}>
      {/* Botão de voltar */}
      <button className={styles.backBtn} onClick={() => router.back()}>
        ← Voltar
      </button>
      <h1>Configurações e Relatórios</h1>

      {/* ------------------- Filtros ------------------- */}
      <div className={styles.filters}>
        <select value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)}>
          <option value="">Todos os clientes</option>
          {Object.entries(clientes).map(([id, nome]) => (
            <option key={id} value={id}>{nome}</option>
          ))}
        </select>

        <select value={filtroMotoboy} onChange={e => setFiltroMotoboy(e.target.value)}>
          <option value="">Todos os motoboys</option>
          {Object.entries(motoboys).map(([id, nome]) => (
            <option key={id} value={id}>{nome}</option>
          ))}
        </select>

        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="ativo">Ativo</option>
          <option value="em andamento">Em andamento</option>
          <option value="finalizada">Finalizada</option>
        </select>
      </div>

      {/* ------------------- Gráfico ------------------- */}
      <div style={{ width: '100%', height: 300, marginTop: '2rem' }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={dataStatus}
              dataKey="value"
              nameKey="name"
              outerRadius={100}
              label
            >
              {dataStatus.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={statusColors[entry.name.toLowerCase()] || '#8884d8'} />
              ))}
            </Pie>
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* ------------------- Tabela ------------------- */}
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
          {entregasFiltradas.map(e => (
            <tr key={e.id}>
              <td>{clientes[e.clienteId] || '—'}</td>
              <td>{motoboys[e.motoboyId] || '—'}</td>
              <td style={{ color: statusColors[e.status] }}>{e.status}</td>
              <td>R$ {(e.valorCliente ?? 0).toFixed(2)}</td>
              <td>R$ {(e.valorMotoboy ?? 0).toFixed(2)}</td>
              <td>R$ {(e.valorPlataforma ?? 0).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
