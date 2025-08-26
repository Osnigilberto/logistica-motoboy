'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
  getFirestore, collection, getDocs, updateDoc, deleteDoc, doc 
} from 'firebase/firestore'
import { app } from '@/firebase/firebaseClient'
import { useAuth } from '@/context/AuthProvider'
import styles from './entregas.module.css'

const db = getFirestore(app)
const ADMIN_UID = 'TkIu3cI2itQ2K4xAkHQ9l9KTvp83'

export default function EntregasAdmin() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [entregas, setEntregas] = useState([])
  const [clientes, setClientes] = useState({})
  const [motoboys, setMotoboys] = useState({})
  const [loadingData, setLoadingData] = useState(true)
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroMotoboy, setFiltroMotoboy] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const isAdmin = user?.uid === ADMIN_UID

  // Cores de status
  const statusColors = {
  ativo: '#2ec7ccff',
  'em andamento': '#3498db',
  finalizada: '#2ecc71',
}


  // Busca dados do Firestore
  const fetchData = async () => {
    try {
      setLoadingData(true)

      // Entregas
      const entregasSnap = await getDocs(collection(db, 'entregas'))
      setEntregas(entregasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })))

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

      setLoadingData(false)
    } catch (error) {
      console.error('Erro ao buscar dados:', error)
      setLoadingData(false)
    }
  }

  useEffect(() => {
    if (!loading && !user) router.push('/login')
    if (user && isAdmin) fetchData()
  }, [user, loading])

  // Atualiza status
  const handleUpdateStatus = async (id, status) => {
    try {
      const docRef = doc(db, 'entregas', id)
      await updateDoc(docRef, { status })
      setEntregas(entregas.map(e => e.id === id ? { ...e, status } : e))
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
    }
  }

  // Excluir entrega
  const handleDelete = async (id) => {
    if (!confirm('Deseja realmente excluir esta entrega?')) return
    try {
      await deleteDoc(doc(db, 'entregas', id))
      setEntregas(entregas.filter(e => e.id !== id))
    } catch (error) {
      console.error('Erro ao excluir entrega:', error)
    }
  }

  // Filtra entregas de acordo com seleções
  const entregasFiltradas = useMemo(() => {
    return entregas.filter(e => 
      (!filtroCliente || e.clienteId === filtroCliente) &&
      (!filtroMotoboy || e.motoboyId === filtroMotoboy) &&
      (!filtroStatus || e.status === filtroStatus)
    )
  }, [entregas, filtroCliente, filtroMotoboy, filtroStatus])

  // Organiza entregas por cliente
  const entregasPorCliente = entregasFiltradas.reduce((acc, e) => {
    const clienteNome = clientes[e.clienteId] || 'Sem Cliente'
    if (!acc[clienteNome]) acc[clienteNome] = []
    acc[clienteNome].push(e)
    return acc
  }, {})

  if (!loading && !isAdmin) return <div>Acesso negado</div>
  if (loading || loadingData) return <div>Carregando...</div>

  return (
    <div className={styles.container}>
      <button onClick={() => router.back()} className={styles.buttonBack}>← Voltar</button>
      <h1>Admin - Entregas</h1>

      {/* ---------------- Filtros ---------------- */}
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
          <option value="pendente">Pendente</option>
          <option value="em andamento">Em andamento</option>
          <option value="ativo">Ativo</option>
          <option value="finalizada">Finalizada</option>
        </select>
      </div>

      {/* ---------------- Lista de entregas ---------------- */}
      {Object.keys(entregasPorCliente).map(clienteNome => (
        <div key={clienteNome} className={styles.lojaCard}>
          <h2 className={styles.lojaTitle}>{clienteNome}</h2>
          <div className={styles.entregasList}>
            {entregasPorCliente[clienteNome].map(e => (
              <div key={e.id} className={styles.entregaCard}>
                <div className={styles.cardHeader}>
                  <span>{e.descricao || 'Sem descrição'}</span>
                  <span className={styles.badge} style={{ backgroundColor: statusColors[e.status] || '#777' }}>
                    {e.status || '—'}
                  </span>
                </div>

                <p><strong>Motoboy:</strong> {motoboys[e.motoboyId] || '—'}</p>
                <p><strong>Origem:</strong> {e.origem || '—'}</p>
                <p><strong>Destinos:</strong> {e.destinos?.join(', ') || '—'}</p>
                <p><strong>Destinatários:</strong> {e.destinatarios?.map(d => d.nome).join(', ') || '—'}</p>
                <p>
                  <strong>Valores:</strong> 
                  Cliente R$ {(e.valorCliente ?? 0).toFixed(2)}, 
                  Motoboy R$ {(e.valorMotoboy ?? 0).toFixed(2)}, 
                  Plataforma R$ {(e.valorPlataforma ?? 0).toFixed(2)}
                </p>
                <p>
                  <strong>Distância:</strong> {e.distanciaKm != null ? e.distanciaKm.toFixed(1) + ' km' : '—'}, 
                  <strong>Tempo:</strong> {e.tempoMin != null ? e.tempoMin.toFixed(1) + ' min' : '—'}
                </p>

                <div className={styles.actions}>
                  <select
                    className={styles.select}
                    value={e.status || ''} 
                    onChange={ev => handleUpdateStatus(e.id, ev.target.value)}
                  >
                    <option value="em andamento">Em andamento</option>
                    <option value="ativo">Ativo</option>
                    <option value="finalizada">Finalizada</option>
                  </select>
                  <button className={styles.deleteBtn} onClick={() => handleDelete(e.id)}>Excluir</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
