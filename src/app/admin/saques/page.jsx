// src/app/admin/saques/page.jsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { app } from '@/firebase/firebaseClient'
import Sidebar from '../sidebar'
import styles from '../admin.module.css'

/**
 * Página de gerenciamento de saques no painel administrativo.
 * - Lista saques pendentes e pagos
 * - Permite marcar saques como "pago"
 * - Exibe nome do motoboy com base na coleção 'users'
 */
export default function SaquesPage() {
  const router = useRouter()
  const auth = getAuth(app)
  const db = getFirestore(app)
  // UID do administrador (definido manualmente por segurança)
  const ADMIN_UID = 'TkIu3cI2itQ2K4xAkHQ9l9KTvp83'

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saques, setSaques] = useState([])
  const [usuarios, setUsuarios] = useState([])

  // Observa o estado de autenticação do usuário
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [auth])

  // Carrega dados apenas se o usuário for o admin
  useEffect(() => {
    // Redireciona para login se não for admin
    if (!user || user.uid !== ADMIN_UID) {
      if (!loading) {
        router.push('/admin/login')
      }
      return
    }

    const fetchData = async () => {
      try {
        // 🔹 Busca todos os usuários e filtra apenas os motoboys
        const usersSnap = await getDocs(collection(db, 'users'))
        const usersList = usersSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(user => user.tipo === 'motoboy') // só motoboys
        setUsuarios(usersList)

        // 🔹 Busca todos os saques (pendentes e pagos)
        const saquesSnap = await getDocs(collection(db, 'saques'))
        const saquesList = saquesSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        setSaques(saquesList)
      } catch (err) {
        console.error('Erro ao buscar dados de saques ou motoboys:', err)
        // Mesmo com erro, não redireciona — mantém a página visível
      }
    }

    fetchData()
  }, [user, db, router, loading])

  // Marca um saque como "pago" no Firestore
  const handleMarcarPago = async (saqueId) => {
    if (!confirm('Tem certeza que deseja marcar este saque como pago?')) return

    try {
      await updateDoc(doc(db, 'saques', saqueId), {
        status: 'pago',
        pagoEm: new Date()
      })
      // Atualiza localmente para feedback imediato
      setSaques(saques.map(s => 
        s.id === saqueId 
          ? { ...s, status: 'pago', pagoEm: new Date() } 
          : s
      ))
    } catch (err) {
      alert('Erro ao atualizar saque. Verifique as regras do Firestore.')
      console.error('Erro ao marcar saque como pago:', err)
    }
  }

  // Retorna o nome do motoboy pelo ID
  const getMotoboyNome = (motoboyId) => {
    const motoboy = usuarios.find(u => u.id === motoboyId)
    return motoboy?.nome || motoboyId
  }

  // Estado de carregamento
  if (loading) {
    return <p className={styles.loading}>Carregando...</p>
  }

  // Proteção adicional (não deveria ser necessário se o useEffect já redireciona)
  if (!user || user.uid !== ADMIN_UID) {
    return null
  }

  // Separa saques por status
  const saquesPendentes = saques.filter(s => s.status === 'pendente')
  const saquesPagos = saques.filter(s => s.status === 'pago')

  return (
    <div className={styles.layout}>
      <Sidebar />
      <main className={styles.content}>
        <h1 className={styles.title}>Gerenciar Saques</h1>

        {/* Seção: Saques Pendentes */}
        <h2>Saques Pendentes ({saquesPendentes.length})</h2>
        {saquesPendentes.length === 0 ? (
          <p>Nenhum saque pendente.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Motoboy</th>
                <th>Valor</th>
                <th>Chave Pix</th>
                <th>Data</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {saquesPendentes.map(saque => (
                <tr key={saque.id}>
                  <td>{getMotoboyNome(saque.motoboyId)}</td>
                  <td>R$ {saque.valor?.toFixed(2)}</td>
                  <td>{saque.chavePix || '—'}</td>
                  <td>
                    {saque.criadoEm?.toDate 
                      ? saque.criadoEm.toDate().toLocaleString('pt-BR')
                      : '—'
                    }
                  </td>
                  <td>
                    <button
                      className={styles.buttonPrimary}
                      onClick={() => handleMarcarPago(saque.id)}
                    >
                      Marcar como Pago
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Seção: Histórico de Saques Pagos */}
        <h2 style={{ marginTop: '2rem' }}>Histórico de Saques Pagos ({saquesPagos.length})</h2>
        {saquesPagos.length === 0 ? (
          <p>Nenhum saque pago ainda.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Motoboy</th>
                <th>Valor</th>
                <th>Pago em</th>
              </tr>
            </thead>
            <tbody>
              {saquesPagos.map(saque => (
                <tr key={saque.id}>
                  <td>{getMotoboyNome(saque.motoboyId)}</td>
                  <td>R$ {saque.valor?.toFixed(2)}</td>
                  <td>
                    {saque.pagoEm?.toDate 
                      ? saque.pagoEm.toDate().toLocaleString('pt-BR')
                      : '—'
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  )
}