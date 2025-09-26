// src/app/admin/saques/page.jsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { app } from '@/firebase/firebaseClient'
import Sidebar from '../sidebar'
import styles from '../admin.module.css'

export default function SaquesPage() {
  const router = useRouter()
  const auth = getAuth(app)
  const db = getFirestore(app)
  const ADMIN_UID = 'TkIu3cI2itQ2K4xAkHQ9l9KTvp83'

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saques, setSaques] = useState([])
  const [usuarios, setUsuarios] = useState([])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [auth])

  useEffect(() => {
    if (!user || user.uid !== ADMIN_UID) {
      router.push('/admin/login')
      return
    }

    const fetchData = async () => {
    try {
        // 🔹 Buscar motoboys da coleção 'users' (onde estão todos os usuários)
        const usersSnap = await getDocs(collection(db, 'users'));
        const usersList = usersSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(user => user.tipo === 'motoboy'); // só motoboys
        setUsuarios(usersList);

        // 🔹 Buscar saques
        const saquesSnap = await getDocs(collection(db, 'saques'));
        const saquesList = saquesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSaques(saquesList);
    } catch (err) {
        console.error('Erro ao buscar dados de saques ou motoboys:', err);
    }
    }
    
    fetchData()
  }, [user, db, router])

  const handleMarcarPago = async (saqueId) => {
    if (!confirm('Tem certeza que deseja marcar este saque como pago?')) return

    try {
      await updateDoc(doc(db, 'saques', saqueId), {
        status: 'pago',
        pagoEm: new Date()
      })
      // Atualizar lista
      setSaques(saques.map(s => s.id === saqueId ? { ...s, status: 'pago', pagoEm: new Date() } : s))
    } catch (err) {
      alert('Erro ao atualizar saque')
      console.error(err)
    }
  }

  const getMotoboyNome = (motoboyId) => {
    const motoboy = usuarios.find(u => u.id === motoboyId)
    return motoboy?.nome || motoboyId
  }

  if (loading) return <p className={styles.loading}>Carregando...</p>
  if (!user || user.uid !== ADMIN_UID) return null

  const saquesPendentes = saques.filter(s => s.status === 'pendente')
  const saquesPagos = saques.filter(s => s.status === 'pago')

  return (
    <div className={styles.layout}>
      <Sidebar />
      <main className={styles.content}>
        <h1 className={styles.title}>Gerenciar Saques</h1>

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
                  <td>{saque.criadoEm?.toDate?.().toLocaleString() || '—'}</td>
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
                  <td>{saque.pagoEm?.toDate?.().toLocaleString() || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  )
}