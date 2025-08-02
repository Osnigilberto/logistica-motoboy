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
  // Obtém o id da entrega da URL e o roteador do Next.js
  const { id } = useParams()
  const router = useRouter()
  const db = getFirestore(app)

  // Referência para o container do mapa
  const mapRef = useRef(null)

  // Estados locais para dados da entrega, mapa e marcadores
  const [entrega, setEntrega] = useState(null)
  const [map, setMap] = useState(null)
  const [directionsRenderer, setDirectionsRenderer] = useState(null)
  const [userMarker, setUserMarker] = useState(null)
  const [polyline, setPolyline] = useState(null)
  const [caminhoPercorrido, setCaminhoPercorrido] = useState([])

  // Guarda o timestamp do início do percurso para calcular tempo real
  const [inicioEntrega, setInicioEntrega] = useState(null)

  // 1. Busca os dados da entrega no Firestore pelo ID
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

  // 2. Inicializa o mapa e desenha a rota entre origem e destino
  useEffect(() => {
    if (!entrega || typeof window.google === 'undefined') return

    const geocoder = new google.maps.Geocoder()
    const directionsService = new google.maps.DirectionsService()
    const directionsDisplay = new google.maps.DirectionsRenderer()

    // Cria o mapa centrado em local padrão (pode ajustar)
    const mapInstance = new google.maps.Map(mapRef.current, {
      zoom: 14,
      center: { lat: -27.5954, lng: -48.548 },
    })

    setMap(mapInstance)
    directionsDisplay.setMap(mapInstance)
    setDirectionsRenderer(directionsDisplay)

    // Geocodifica endereço da origem
    geocoder.geocode({ address: entrega.origem }, (resultsOrigem, status1) => {
      if (status1 !== 'OK') {
        toast.error('Erro na geocodificação da origem')
        return
      }

      // Geocodifica endereço do destino
      geocoder.geocode({ address: entrega.destino }, (resultsDestino, status2) => {
        if (status2 !== 'OK') {
          toast.error('Erro na geocodificação do destino')
          return
        }

        // Solicita rota entre origem e destino
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

  // 3. Atualiza posição do motoboy em tempo real, move marcador e desenha rota real percorrida
  useEffect(() => {
    if (!map) return

    const watchId = navigator.geolocation.watchPosition(
      pos => {
        const { latitude, longitude } = pos.coords
        const position = new google.maps.LatLng(latitude, longitude)

        // Se for a primeira posição, salva o timestamp para cálculo do tempo real
        if (!inicioEntrega) {
          setInicioEntrega(Date.now())
        }

        // Cria marcador da posição se não existir, senão atualiza a posição
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

        // Move o mapa para acompanhar o motoboy
        map.panTo(position)

        // Atualiza o caminho percorrido para desenhar no mapa
        setCaminhoPercorrido(prev => {
          const novoCaminho = [...prev, position]

          if (polyline) {
            polyline.setPath(novoCaminho)
          } else {
            // Cria a linha poligonal no mapa
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

    // Limpa o watch quando componente desmontar
    return () => navigator.geolocation.clearWatch(watchId)
  }, [map, userMarker, polyline, inicioEntrega])

  // 4. Função para finalizar entrega com confirmação e salvar tempo real
  const finalizarEntrega = async () => {
    if (!entrega) return

    const confirmar = confirm('Tem certeza que deseja finalizar esta entrega?')
    if (!confirmar) return

    // Calcula tempo real da entrega em minutos
    const tempoRealMin = inicioEntrega
      ? Math.round((Date.now() - inicioEntrega) / 60000)
      : null

    try {
      await updateDoc(doc(db, 'entregas', entrega.id), {
        status: 'finalizada',
        atualizadoEm: serverTimestamp(),
        tempoRealMin,
      })
      toast.success('Entrega finalizada!')
      router.push(`/recibo/${entrega.id}`)
    } catch (error) {
      toast.error('Erro ao finalizar entrega.')
      console.error(error)
    }
  }

  // 5. Enquanto entrega não carregar, mostra loading
  if (!entrega) return <p className={styles.loading}>Carregando entrega...</p>

  return (
    <div className={styles.container}>
      {/* Botão voltar com ícone e aria-label */}
      <button
        onClick={() => router.back()}
        className={styles.botaoVoltar}
        aria-label="Voltar para a página anterior"
        style={{ touchAction: 'manipulation' }} // melhora resposta em touch mobile
      >
        <FaArrowLeft aria-hidden="true" /> Voltar
      </button>

      <h1 className={styles.titulo}>Rota da Entrega</h1>

      {/* Container do mapa */}
      <div ref={mapRef} className={styles.mapa} aria-label="Mapa mostrando a rota da entrega" role="application" />

      {/* Informações detalhadas da entrega com ícones e aria-labels */}
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
          <strong>Distância:</strong> <span>{entrega.distanciaKm?.toFixed(2)} km</span>
        </div>
        <div className={styles.cardLinha}>
          <FaClock className={styles.cardIcone} aria-label="Ícone de tempo estimado" />
          <strong>Tempo estimado:</strong> <span>{Math.round(entrega.tempoMin)} min</span>
        </div>
        <div className={styles.cardLinha}>
          <FaDollarSign className={styles.cardIcone} aria-label="Ícone de valor" />
          <strong>Valor para você:</strong> <span>R$ {entrega.valorMotoboy?.toFixed(2)}</span>
        </div>
      </div>

      {/* Botão finalizar entrega com ícone, aria-label e touchAction para melhor resposta mobile */}
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
