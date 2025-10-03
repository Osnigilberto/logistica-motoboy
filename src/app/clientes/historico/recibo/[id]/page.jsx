'use client'

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { doc, getDoc, getFirestore } from "firebase/firestore"
import { app } from "@/firebase/firebaseClient"
import {
  FaMapMarkerAlt,
  FaRoute,
  FaStickyNote,
  FaUser,
  FaPhone,
  FaRulerHorizontal,
  FaClock,
  FaDollarSign,
  FaInfoCircle,
} from "react-icons/fa"
import Image from "next/image"
import styles from "./recibo.module.css"

export default function ReciboClientePage() {
  const { id } = useParams()
  const router = useRouter()
  const firestore = getFirestore(app)

  const [entrega, setEntrega] = useState(null)
  const [motoboy, setMotoboy] = useState(null) // dados do motoboy
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) return

    async function fetchDados() {
      setLoading(true)
      setError(null)
      try {
        const entregaRef = doc(firestore, "entregas", id)
        const entregaSnap = await getDoc(entregaRef)

        if (!entregaSnap.exists()) {
          setError("Entrega não encontrada.")
          setLoading(false)
          return
        }

        const entregaData = entregaSnap.data()
        setEntrega(entregaData)

        // Se tiver motoboyId, busca os dados do motoboy na coleção users
        if (entregaData.motoboyId) {
          const motoboyRef = doc(firestore, "users", entregaData.motoboyId)
          const motoboySnap = await getDoc(motoboyRef)
          if (motoboySnap.exists()) {
            setMotoboy(motoboySnap.data())
          }
        }
      } catch (err) {
        console.error("Erro ao buscar dados:", err)
        setError("Erro ao carregar dados da entrega.")
      } finally {
        setLoading(false)
      }
    }

    fetchDados()
  }, [id, firestore])

  const handlePrint = () => {
    window.print()
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: 'Comprovante de Entrega',
          text: `Comprovante da entrega de ${entrega?.origem} para ${entrega?.destino}`,
          url: window.location.href,
        })
        .catch((error) => console.error('Erro ao compartilhar:', error))
    } else {
      alert('Compartilhamento não suportado neste navegador.')
    }
  }

  if (loading) return <p>Carregando dados da entrega...</p>
  if (error) return <p>{error}</p>

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.container}>
        <div className={styles.topBar}>
          <button
            type="button"
            onClick={() => router.push('/clientes/historico')}
            className={styles.buttonBack}
          >
            ← Voltar
          </button>

          <div className={styles.actionsInline}>
            <button type="button" onClick={handlePrint} className={styles.button}>
              🖨️ Imprimir
            </button>
            <button type="button" onClick={handleShare} className={styles.button}>
              📤 Compartilhar
            </button>
          </div>
        </div>

        <h1 className={styles.title}>
          <Image
            src="/logoexpress.png"
            alt="Turbo Express Logo"
            width={180}
            height={100}
            style={{ objectFit: 'contain', marginBottom: '1rem' }}
          />
          Comprovante de Entrega
        </h1>

        <div className={styles.info}>
          <div className={styles.cardLinha}><FaMapMarkerAlt /><strong>Origem:</strong> {entrega.origem}</div>
          <div className={styles.cardLinha}><FaRoute /><strong>Destino:</strong> {entrega.destino}</div>
          <div className={styles.cardLinha}><FaStickyNote /><strong>Descrição:</strong> {entrega.descricao || '—'}</div>

          {/* Destinatário */}
          <div className={styles.cardLinha}><FaUser /><strong>Destinatário:</strong> {entrega.destinatarios?.map(d => d.nome).join(', ') || '—'}</div>
          <div className={styles.cardLinha}><FaPhone /><strong>Telefone do Destinatário:</strong> {entrega.destinatarios?.map(d => d.telefone).join(', ') || '—'}</div>

          {/* Motoboy */}
          <div className={styles.cardLinha}>
            <FaUser />
            <strong>Motoboy:</strong> {motoboy?.nome || '—'}
          </div>
          <div className={styles.cardLinha}>
            <FaPhone />
            <strong>Telefone do Motoboy:</strong> {motoboy?.telefone || '—'}
          </div>

          <div className={styles.cardLinha}><FaRulerHorizontal /><strong>Distância:</strong> {entrega.distanciaKm?.toFixed(2) || '0.00'} km</div>
          <div className={styles.cardLinha}><FaClock /><strong>Tempo estimado:</strong> {Math.round(entrega.tempoMin) || 0} min</div>
          <div className={styles.cardLinha}><FaDollarSign /><strong>Valor total:</strong> R$ {entrega.valorComMarkup?.toFixed(2) || '0.00'}</div>

          <div className={styles.cardLinha}><FaInfoCircle /><strong>Status:</strong> {entrega.status}</div>
        </div>
      </div>
    </div>
  )
}
