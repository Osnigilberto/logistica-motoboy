'use client'

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/firebase/firebaseClient"
import {
  FaMapMarkerAlt,
  FaRoute,
  FaStickyNote,
  FaUser,
  FaPhone,
  FaRulerHorizontal,
  FaClock,
  FaDollarSign,
} from "react-icons/fa"
import Image from "next/image"
import styles from "./recibo.module.css"

export default function ReciboMotoboyPage() {
  const { id } = useParams()
  const router = useRouter()
  const [entrega, setEntrega] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) return

    async function fetchEntrega() {
      setLoading(true)
      setError(null)
      try {
        const docRef = doc(db, "entregas", id)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          setEntrega(docSnap.data())
        } else {
          setError("Entrega não encontrada.")
        }
      } catch (err) {
        console.error("Erro ao buscar entrega:", err)
        setError("Erro ao carregar dados da entrega.")
      } finally {
        setLoading(false)
      }
    }

    fetchEntrega()
  }, [id])

  const handlePrint = () => {
    window.print()
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: 'Comprovante de Entrega',
          text: `Comprovante da entrega de ${entrega.origem} para ${entrega.destino}`,
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
    {/* Linha com voltar à esquerda e ações à direita */}
    <div className={styles.topBar}>
      <button
        type="button"
        onClick={() => router.push('/motoboy/historico')}
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

    {/* Título centralizado */}
    <h1 className={styles.title}>Comprovante de Entrega</h1>

    {/* Informações do recibo */}
    <div className={styles.info}>
      <div className={styles.cardLinha}><FaMapMarkerAlt /><strong>Origem:</strong> {entrega.origem}</div>
      <div className={styles.cardLinha}><FaRoute /><strong>Destino:</strong> {entrega.destino}</div>
      <div className={styles.cardLinha}><FaStickyNote /><strong>Descrição:</strong> {entrega.descricao || '—'}</div>
      <div className={styles.cardLinha}><FaUser /><strong>Destinatário:</strong> {entrega.destinatario || '—'}</div>
      <div className={styles.cardLinha}><FaPhone /><strong>Telefone:</strong> {entrega.telefoneDestinatario || '—'}</div>
      <div className={styles.cardLinha}><FaRulerHorizontal /><strong>Distância:</strong> {entrega.distanciaKm?.toFixed(2) || '0.00'} km</div>
      <div className={styles.cardLinha}><FaClock /><strong>Tempo estimado:</strong> {Math.round(entrega.tempoMin) || 0} min</div>
      <div className={styles.cardLinha}><FaDollarSign /><strong>Valor para você:</strong> R$ {entrega.valorMotoboy?.toFixed(2) || '0.00'}</div>
    </div>
  </div>
</div>

  )
}
