'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getFirestore, doc, getDoc } from 'firebase/firestore'
import { app } from '@/firebase/firebaseClient'
import { toast } from 'react-toastify'

import DashboardLayout from '../../components/DashboardLayout'
import styles from './recibo.module.css'

export default function ReciboPage() {
  const { id } = useParams()
  const router = useRouter()
  const db = getFirestore(app)

  const [recibo, setRecibo] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return

    const fetchRecibo = async () => {
      try {
        const docRef = doc(db, 'entregas', id)
        const snap = await getDoc(docRef)
        if (snap.exists()) {
          setRecibo({ id: snap.id, ...snap.data() })
        } else {
          toast.error('Recibo não encontrado')
          router.push('/')
        }
      } catch (error) {
        console.error('Erro ao buscar recibo:', error)
        toast.error('Erro ao carregar recibo')
        router.push('/')
      } finally {
        setLoading(false)
      }
    }

    fetchRecibo()
  }, [id, db, router])

  if (loading) {
    return (
      <DashboardLayout>
        <p className={styles.loading}>Carregando recibo...</p>
      </DashboardLayout>
    )
  }

  if (!recibo) {
    return (
      <DashboardLayout>
        <p className={styles.error}>Recibo não disponível.</p>
      </DashboardLayout>
    )
  }

  const tempoEstimado = recibo.tempoMin || 0
  const tempoReal = recibo.tempoRealMin || 0
  const atraso = tempoReal > tempoEstimado ? tempoReal - tempoEstimado : 0

  const imprimirRecibo = () => {
    window.print()
  }

  return (
    <DashboardLayout>
    <div className={styles.reciboBody}>
      <div className={styles.container}>
        <h1 className={styles.title}>Recibo da Entrega</h1>

        <section className={styles.section}>
          <h2>Dados da Entrega</h2>
          <p><strong>Origem:</strong> {recibo.origem}</p>
          <p><strong>Destino:</strong> {recibo.destino}</p>
          <p><strong>Descrição:</strong> {recibo.descricao || '—'}</p>
          <p><strong>Destinatário:</strong> {recibo.destinatario || '—'}</p>
          <p><strong>Telefone:</strong> {recibo.telefoneDestinatario || '—'}</p>
        </section>

        <section className={styles.section}>
          <h2>Detalhes da Rota</h2>
          <p><strong>Distância:</strong> {recibo.distanciaKm?.toFixed(2)} km</p>
          <p><strong>Tempo Estimado:</strong> {Math.round(tempoEstimado)} min</p>
          <p><strong>Tempo Real:</strong> {Math.round(tempoReal)} min</p>
          {atraso > 0 && (
            <p className={styles.atraso}>
              ⚠️ Atraso: {Math.round(atraso)} min
            </p>
          )}
        </section>

        <section className={styles.section}>
          <h2>Valores</h2>
          <p><strong>Motoboy:</strong> R$ {recibo.valorMotoboy?.toFixed(2)}</p>
          <p><strong>Total cobrado do cliente:</strong> R$ {recibo.valorTotal?.toFixed(2) || '—'}</p>
        </section>

        <button
          onClick={imprimirRecibo}
          className={styles.printButton}
          aria-label="Imprimir recibo"
        >
          🖨️ Imprimir Recibo
        </button>
      </div>
    </div>
    </DashboardLayout>
  )
}
