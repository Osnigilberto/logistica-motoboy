'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthProvider'
import { collection, query, where, getDocs, getFirestore } from 'firebase/firestore'
import { FaMapMarkerAlt, FaRoute, FaStickyNote, FaUser, FaPhone, FaClock, FaDollarSign } from 'react-icons/fa'
import styles from './historico.module.css'

export default function HistoricoMotoboyPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const firestore = getFirestore()

  const [entregas, setEntregas] = useState([])
  const [loadingData, setLoadingData] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!loading && user) {
      setLoadingData(true)
      setError(null)

      const q = query(
        collection(firestore, 'entregas'),
        where('motoboyId', '==', user.uid),
        where('status', '==', 'finalizada')
      )

      getDocs(q)
        .then(snapshot => {
          const lista = []
          snapshot.forEach(doc => lista.push({ id: doc.id, ...doc.data() }))
          setEntregas(lista)
        })
        .catch(err => {
          console.error(err)
          setError('Erro ao buscar entregas.')
        })
        .finally(() => setLoadingData(false))
    }
  }, [loading, user, firestore])

  if (loading) return <p className={styles.loading}>Carregando autenticação...</p>
  if (!user) return <p className={styles.error}>Você precisa estar logado para ver o histórico.</p>
  if (loadingData) return <p className={styles.loading}>Carregando histórico...</p>
  if (error) return <p className={styles.error}>{error}</p>
  if (entregas.length === 0) return <p className={styles.empty}>Nenhuma entrega finalizada encontrada.</p>

  return (
    <main className={styles.container}>
      <button type="button" onClick={() => router.push('/dashboard')} className={styles.buttonBack}>
        ← Voltar
      </button>

      <h1 className={styles.title}>Histórico de Entregas - Motoboy</h1>

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
                <strong>Destinos:</strong> {entrega.destinos?.join(', ')}
              </div>
              <div className={styles.cardLinha}>
                <FaStickyNote />
                <strong>Descrição:</strong> {entrega.descricao || '—'}
              </div>
              <div className={styles.cardLinha}>
                <FaUser />
                <strong>Destinatários:</strong> {entrega.destinatarios?.map(d => d.nome).join(', ') || '—'}
              </div>
              <div className={styles.cardLinha}>
                <FaPhone />
                <strong>Telefones:</strong> {entrega.destinatarios?.map(d => d.telefone).join(', ') || '—'}
              </div>
              <div className={styles.cardLinha}>
                <FaClock />
                <strong>Duração da entrega:</strong> {entrega.tempoMin ? Math.round(entrega.tempoMin) + ' min' : '—'}
              </div>
              <div className={styles.cardLinha}>
                <FaDollarSign />
                <strong>Valor recebido:</strong> R$ {entrega.valorMotoboy?.toFixed(2) || '0.00'}
              </div>

              {/* Histórico de posições percorridas */}
              {entrega.caminhoPercorrido && entrega.caminhoPercorrido.length > 0 && (
                <div className={styles.cardLinha}>
                  <strong>Rota percorrida:</strong>
                  <ul className={styles.caminhoList}>
                    {entrega.caminhoPercorrido.map((p, idx) => (
                      <li key={idx}>
                        Lat: {p.lat.toFixed(5)}, Lng: {p.lng.toFixed(5)}, {new Date(p.timestamp?.seconds * 1000).toLocaleString()}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className={styles.statusLinha}>
                <strong>Status:</strong> {entrega.status}
              </div>

              <a href={`/motoboy/historico/recibo/${entrega.id}`} className={styles.link}>
                Ver Recibo
              </a>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
