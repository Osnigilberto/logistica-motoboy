'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthProvider'
import { useRouter } from 'next/navigation'
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore'
import { app } from '@/firebase/firebaseClient'
import styles from './entregasEmAndamento.module.css'

export default function EntregasEmAndamento() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const db = getFirestore(app)

  const [entregas, setEntregas] = useState([])

  useEffect(() => {
    if (loading || !user?.uid) return

    const q = query(
      collection(db, 'entregas'),
      where('motoboyId', '==', user.uid),
      where('status', '==', 'em andamento')
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setEntregas(lista)
    })

    return () => unsubscribe()
  }, [user, loading, db])

  if (loading) return <p className={styles.mensagem}>Carregando...</p>
  if (!user) return <p className={styles.mensagem}>Você precisa estar logado para ver esta página.</p>

  return (
    <div className={styles.container}>
      <h1 className={styles.titulo}>Entregas em Andamento</h1>

      <button
        type="button"
        onClick={() => router.back()}
        className={styles.buttonBack}
      >
        ← Voltar
      </button>

      {entregas.length === 0 ? (
        <p className={styles.mensagem}>Nenhuma entrega em andamento no momento.</p>
      ) : (
        <ul className={styles.lista}>
          {entregas.map(entrega => (
            <li key={entrega.id} className={styles.card}>
              <p><strong>📍 Origem:</strong> {entrega.origem || '—'}</p>

              <p><strong>Paradas:</strong></p>
              <div className={styles.paradasWrapper}>
                {entrega.destinos && entrega.destinos.length > 0 ? (
                  entrega.destinos.map((endereco, i) => (
                    <div key={i} className={styles.paradaItem}>
                      <p>📍 {endereco}</p>
                      <p><strong>Destinatário:</strong> {entrega.destinatarios?.[i]?.nome || '—'}</p>
                      <p><strong>Telefone:</strong> {entrega.destinatarios?.[i]?.telefone || '—'}</p>
                    </div>
                  ))
                ) : (
                  <p>—</p>
                )}
              </div>

              <p><strong>📝 Descrição:</strong> {entrega.descricao || '—'}</p>
              <p><strong>🚗 Distância:</strong> {entrega.distanciaKm ? `${entrega.distanciaKm.toFixed(2)} km` : '—'}</p>
              <p><strong>⏱ Tempo estimado:</strong> {entrega.tempoMin ? `${Math.round(entrega.tempoMin)} min` : '—'}</p>

              <button
                className={styles.botaoVerRota}
                onClick={() => router.push(`/motoboy/entregas-em-andamento/${entrega.id}`)}
              >
                Ver Rota
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
