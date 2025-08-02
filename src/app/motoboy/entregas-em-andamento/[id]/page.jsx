'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { toast } from 'react-toastify'
import { app } from '@/firebase/firebaseClient'
import styles from './entregaRota.module.css'

import {
  FaCheckCircle,
  FaArrowLeft,
  FaMapMarkerAlt,
  FaRoute,
  FaStickyNote,
  FaRulerHorizontal,
  FaClock,
  FaDollarSign,
  FaUser,
  FaPhone,
} from 'react-icons/fa'

export default function PaginaEntregaEmAndamento() {
  const { id } = useParams()
  const router = useRouter()
  const db = getFirestore(app)

  const mapRef = useRef(null)

  const [entrega, setEntrega] = useState(null)
  const [map, setMap] = useState(null)
  const [directionsRenderer, setDirectionsRenderer] = useState(null)
  const [userMarker, setUserMarker] = useState(null)
  const [polyline, setPolyline] = useState(null)
  const [caminhoPercorrido, setCaminhoPercorrido] = useState([])

  const [inicioEntrega, setInicioEntrega] = useState(null)

  // 1. Busca dados da entrega
  useEffect(() => {
    if (!id) return

    const fetchEntrega = async () => {
      try {
        const docRef = doc(db, 'entregas', id)
        const snap = await getDoc(docRef)
        if (snap.exists()) {
          setEntrega({ id: snap.id, ...snap.data() })
        } else {
          toast.error('Entrega não encontrada')
          router.push('/motoboy/entregas-em-andamento')
        }
      } catch (error) {
        toast.error('Erro ao buscar dados da entrega')
        router.push('/motoboy/entregas-em-andamento')
      }
    }

    fetchEntrega()
  }, [id, db, router])

  // 2. Inicializa mapa e rota
  useEffect(() => {
    if (!entrega || typeof window.google === 'undefined') return

    const geocoder = new google.maps.Geocoder()
    const directionsService = new google.maps.DirectionsService()
    const directionsDisplay = new google.maps.DirectionsRenderer()

    const mapInstance = new google.maps.Map(mapRef.current, {
      zoom: 14,
      center: { lat: -27.5954, lng: -48.548 },
    })

    setMap(mapInstance)
    directionsDisplay.setMap(mapInstance)
    setDirectionsRenderer(directionsDisplay)

    geocoder.geocode({ address: entrega.origem }, (resultsOrigem, status1) => {
      if (status1 !== 'OK') {
        toast.error('Erro na geocodificação da origem')
        return
      }

      geocoder.geocode({ address: entrega.destino }, (resultsDestino, status2) => {
        if (status2 !== 'OK') {
          toast.error('Erro na geocodificação do destino')
          return
        }

        directionsService.route(
          {
            origin: resultsOrigem[0].geometry.location,
            destination: resultsDestino[0].geometry.location,
            travelMode: google.maps.TravelMode.DRIVING,
          },
          (result, status) => {
            if (status === 'OK') {
              directionsDisplay.setDirections(result)
            } else {
              toast.error('Não foi possível traçar a rota')
            }
          }
        )
      })
    })
  }, [entrega])

  // 3. Atualiza posição do motoboy e desenha linha do percurso
  useEffect(() => {
    if (!map) return

    const watchId = navigator.geolocation.watchPosition(
      pos => {
        const { latitude, longitude } = pos.coords
        const position = new google.maps.LatLng(latitude, longitude)

        if (!inicioEntrega) {
          setInicioEntrega(Date.now())
        }

        if (!userMarker) {
          const marker = new google.maps.Marker({
            position,
            map,
            title: 'Sua posição',
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#007bff',
              fillOpacity: 1,
              strokeColor: '#fff',
              strokeWeight: 2,
            },
          })
          setUserMarker(marker)
        } else {
          userMarker.setPosition(position)
        }

        map.panTo(position)

        setCaminhoPercorrido(prev => {
          const novoCaminho = [...prev, position]

          if (polyline) {
            polyline.setPath(novoCaminho)
          } else {
            const novaLinha = new google.maps.Polyline({
              path: novoCaminho,
              geodesic: true,
              strokeColor: '#007bff',
              strokeOpacity: 1.0,
              strokeWeight: 3,
              map,
            })
            setPolyline(novaLinha)
          }

          return novoCaminho
        })
      },
      error => {
        toast.error('Erro ao obter localização')
        console.error(error)
      },
      { enableHighAccuracy: true }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [map, userMarker, polyline, inicioEntrega])

  // === Função auxiliar para cálculo de XP e nível ===

  // Curva de XP necessária para cada nível (índice 0 = nível 1, etc)
  const xpParaNivel = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]

  // Calcula nível e progresso dado XP total acumulado
  function calcularNivelEProgresso(xpTotal) {
    let nivel = 1
    let xpAcumulado = 0
    for (let i = 0; i < xpParaNivel.length; i++) {
      xpAcumulado += xpParaNivel[i]
      if (xpTotal < xpAcumulado) {
        nivel = i + 1
        // XP acumulado no começo do nível atual
        const xpInicioNivel = xpAcumulado - xpParaNivel[i]
        const progresso = (xpTotal - xpInicioNivel) / xpParaNivel[i]
        return { nivel, progresso }
      }
    }
    // Se passou do nível 10, fica no máximo
    return { nivel: 10, progresso: 1 }
  }

  // Calcula XP da entrega com fórmula híbrida: distância + tempo + quantidade
  function calcularXpEntrega(distanciaKm, tempoMin, quantidade) {
    const xpDistancia = distanciaKm * 10
    const xpTempo = tempoMin * 2
    const xpQuantidade = quantidade * 50
    return xpDistancia + xpTempo + xpQuantidade
  }

  // 4. Função para finalizar entrega, atualizar Firestore e XP
  const finalizarEntrega = async () => {
    if (!entrega) return

    const confirmar = confirm('Tem certeza que deseja finalizar esta entrega?')
    if (!confirmar) return

    // Calcula tempo real em minutos desde início da entrega
    const tempoRealMin = inicioEntrega
      ? Math.round((Date.now() - inicioEntrega) / 60000)
      : 0

    try {
      // Atualiza status da entrega no Firestore
      await updateDoc(doc(db, 'entregas', entrega.id), {
        status: 'finalizada',
        atualizadoEm: serverTimestamp(),
        tempoRealMin,
      })

      // Busca dados do motoboy para atualizar XP
      const userDocRef = doc(db, 'users', entrega.motoboyId)
      const userSnap = await getDoc(userDocRef)

      if (!userSnap.exists()) {
        toast.error('Perfil do motoboy não encontrado para atualizar XP')
        return
      }

      const userData = userSnap.data()

      const xpAtual = userData.xpAtual || 0
      const nivelAtual = userData.nivel || 1

      // Calcula XP ganho na entrega
      const xpGanho = calcularXpEntrega(
        entrega.distanciaKm || 0,
        tempoRealMin,
        1 // quantidade de entregas (sempre 1 por vez aqui)
      )

      const novoXpTotal = xpAtual + xpGanho

      // Calcula novo nível e progresso
      const { nivel: novoNivel, progresso } = calcularNivelEProgresso(novoXpTotal)

      // Atualiza dados do motoboy no Firestore
      await updateDoc(userDocRef, {
        xpAtual: novoXpTotal,
        nivel: novoNivel,
        progressoXP: progresso,
        atualizadoEm: serverTimestamp(),
      })

      toast.success(
        `Entrega finalizada! XP ganho: ${xpGanho.toFixed(
          1
        )}, Nível atual: ${novoNivel}`
      )
      router.push(`/recibo/${entrega.id}`)
    } catch (error) {
      toast.error('Erro ao finalizar entrega.')
      console.error(error)
    }
  }

  if (!entrega) return <p className={styles.loading}>Carregando entrega...</p>

  return (
    <div className={styles.container}>
      {/* Botão voltar */}
      <button
        onClick={() => router.back()}
        className={styles.botaoVoltar}
        aria-label="Voltar para a página anterior"
        style={{ touchAction: 'manipulation' }}
      >
        <FaArrowLeft aria-hidden="true" /> Voltar
      </button>

      <h1 className={styles.titulo}>Rota da Entrega</h1>

      {/* Mapa */}
      <div
        ref={mapRef}
        className={styles.mapa}
        aria-label="Mapa mostrando a rota da entrega"
        role="application"
      />

      {/* Informações da entrega */}
      <div className={styles.info}>
        <div className={styles.cardLinha}>
          <FaMapMarkerAlt className={styles.cardIcone} aria-label="Ícone de origem" />
          <strong>Origem:</strong> <span>{entrega.origem}</span>
        </div>
        <div className={styles.cardLinha}>
          <FaRoute className={styles.cardIcone} aria-label="Ícone de destino" />
          <strong>Destino:</strong> <span>{entrega.destino}</span>
        </div>
        <div className={styles.cardLinha}>
          <FaStickyNote className={styles.cardIcone} aria-label="Ícone de descrição" />
          <strong>Descrição:</strong> <span>{entrega.descricao || '—'}</span>
        </div>
        <div className={styles.cardLinha}>
          <FaUser className={styles.cardIcone} aria-label="Ícone de destinatário" />
          <strong>Destinatário:</strong> <span>{entrega.destinatario || '—'}</span>
        </div>
        <div className={styles.cardLinha}>
          <FaPhone className={styles.cardIcone} aria-label="Ícone de telefone" />
          <strong>Telefone:</strong> <span>{entrega.telefoneDestinatario || '—'}</span>
        </div>
        <div className={styles.cardLinha}>
          <FaRulerHorizontal className={styles.cardIcone} aria-label="Ícone de distância" />
          <strong>Distância:</strong>{' '}
          <span>{entrega.distanciaKm?.toFixed(2) || '0.00'} km</span>
        </div>
        <div className={styles.cardLinha}>
          <FaClock className={styles.cardIcone} aria-label="Ícone de tempo estimado" />
          <strong>Tempo estimado:</strong>{' '}
          <span>{Math.round(entrega.tempoMin) || 0} min</span>
        </div>
        <div className={styles.cardLinha}>
          <FaDollarSign className={styles.cardIcone} aria-label="Ícone de valor" />
          <strong>Valor para você:</strong>{' '}
          <span>R$ {entrega.valorMotoboy?.toFixed(2) || '0.00'}</span>
        </div>
      </div>

      {/* Botão finalizar entrega */}
      <button
        onClick={finalizarEntrega}
        className={styles.botaoFinalizar}
        aria-label="Finalizar entrega"
        style={{ touchAction: 'manipulation' }}
      >
        <FaCheckCircle aria-hidden="true" /> Finalizar Entrega
      </button>
    </div>
  )
}
