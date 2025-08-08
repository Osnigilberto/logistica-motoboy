'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthProvider'
import { collection, query, where, getDocs, getFirestore, doc, getDoc } from 'firebase/firestore'
import { app } from '@/firebase/firebaseClient'
import {
  FaMapMarkerAlt,
  FaRoute,
  FaStickyNote,
  FaUser,
  FaPhone,
  FaRulerHorizontal,
  FaClock,
  FaDollarSign,
} from 'react-icons/fa'
import styles from './historico.module.css'

export default function HistoricoClientePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const firestore = getFirestore(app)

  const [entregas, setEntregas] = useState([])
  const [loadingData, setLoadingData] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!loading && user) {
      setLoadingData(true)
      setError(null)

      const buscarEntregas = async () => {
        try {
          const q = query(
            collection(firestore, 'entregas'),
            where('clienteId', '==', user.uid),
            where('status', '==', 'finalizada')
          )

          const snapshot = await getDocs(q)
          const lista = []

          for (const docEntrega of snapshot.docs) {
            const entregaData = { id: docEntrega.id, ...docEntrega.data() }

            // Buscar dados do motoboy
            if (entregaData.motoboyId) {
              const motoboyRef = doc(firestore, 'users', entregaData.motoboyId)
              const motoboySnap = await getDoc(motoboyRef)
              if (motoboySnap.exists()) {
                const motoboyData = motoboySnap.data()
                entregaData.nomeMotoboy = motoboyData.nome || '—'
                entregaData.telefoneMotoboy = motoboyData.telefone || '—'
              } else {
                entregaData.nomeMotoboy = '—'
                entregaData.telefoneMotoboy = '—'
              }
            }

            lista.push(entregaData)
          }

          setEntregas(lista)
        } catch (err) {
          console.error(err)
          setError('Erro ao buscar entregas.')
        } finally {
          setLoadingData(false)
        }
      }

      buscarEntregas()
    }
  }, [loading, user, firestore])

  if (loading) return <p className={styles.loading}>Carregando autenticação...</p>
  if (!user) return <p className={styles.error}>Você precisa estar logado para ver o histórico.</p>
  if (loadingData) return <p className={styles.loading}>Carregando histórico...</p>
  if (error) return <p className={styles.error}>{error}</p>
  if (entregas.length === 0) return <p className={styles.empty}>Nenhuma entrega finalizada encontrada.</p>

  return (
    <main className={styles.container}>
      <button
        type="button"
        onClick={() => router.push('/dashboard')}
        className={styles.buttonBack}
      >
        ← Voltar
      </button>

      <h1 className={styles.title}>Histórico de Entregas - Cliente</h1>

      <ul className={styles.lista}>
        {entregas.map(entrega => (
          <li key={entrega.id} className={styles.item}>
            <div className={styles.info}>
              <div className={styles.cardLinha}>
                <FaMapMarkerAlt />
                <strong>Origem:</strong> {entrega.origem}
              </div>

              <div className={styles.cardLinha}>
                <FaRoute />
                <strong>Destino:</strong> {entrega.destino}
              </div>

              <div className={styles.cardLinha}>
                <FaStickyNote />
                <strong>Descrição:</strong> {entrega.descricao || '—'}
              </div>

              {/* Destinatário */}
              <div className={styles.cardLinha}>
                <FaUser />
                <strong>Destinatário:</strong> {entrega.destinatario || '—'}
              </div>

              {/* Telefone do destinatário */}
              <div className={styles.cardLinha}>
                <FaPhone />
                <strong>Telefone do destinatário:</strong> {entrega.telefoneDestinatario || '—'}
              </div>

              <div className={styles.cardLinha}>
                <FaUser />
                <strong>Motoboy:</strong> {entrega.nomeMotoboy || '—'}
              </div>

              <div className={styles.cardLinha}>
                <FaPhone />
                <strong>Telefone do Motoboy:</strong> {entrega.telefoneMotoboy || '—'}
              </div>

              <div className={styles.cardLinha}>
                <FaRulerHorizontal />
                <strong>Distância:</strong> {entrega.distanciaKm?.toFixed(2) || '0.00'} km
              </div>

              <div className={styles.cardLinha}>
                <FaClock />
                <strong>Tempo estimado:</strong> {Math.round(entrega.tempoMin) || 0} min
              </div>

              <div className={styles.cardLinha}>
                <FaDollarSign />
                <strong>Valor total:</strong> R$ {entrega.valorComMarkup?.toFixed(2) || '0.00'}
              </div>

              <div className={styles.statusLinha}>
                <strong>Status:</strong> {entrega.status}
              </div>

              <a href={`/clientes/historico/recibo/${entrega.id}`} className={styles.link}>
                Ver Recibo
              </a>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
