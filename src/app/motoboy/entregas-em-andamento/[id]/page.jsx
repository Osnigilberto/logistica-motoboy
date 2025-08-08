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

  useEffect(() => {
    if (!map) return
    const watchId = navigator.geolocation.watchPosition(
      pos => {
        const { latitude, longitude } = pos.coords
        const position = new google.maps.LatLng(latitude, longitude)
        if (!inicioEntrega) setInicioEntrega(Date.now())
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

  const xpParaNivel = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]

  function calcularNivelEProgresso(xpTotal) {
    let nivel = 1
    let xpAcumulado = 0
    for (let i = 0; i < xpParaNivel.length; i++) {
      xpAcumulado += xpParaNivel[i]
      if (xpTotal < xpAcumulado) {
        const xpInicioNivel = xpAcumulado - xpParaNivel[i]
        const progresso = (xpTotal - xpInicioNivel) / xpParaNivel[i]
        return { nivel: i + 1, progresso }
      }
    }
    return { nivel: 10, progresso: 1 }
  }

  function calcularXpEntrega(distanciaKm, tempoMin, quantidade) {
    return distanciaKm * 10 + tempoMin * 2 + quantidade * 50
  }

  const finalizarEntrega = async () => {
    if (!entrega) return
    const confirmar = confirm('Tem certeza que deseja finalizar esta entrega?')
    if (!confirmar) return
    const tempoRealMin = inicioEntrega ? Math.round((Date.now() - inicioEntrega) / 60000) : 0
    try {
      await updateDoc(doc(db, 'entregas', entrega.id), {
        status: 'finalizada',
        atualizadoEm: serverTimestamp(),
        finalizadoEm: serverTimestamp(),
        tempoRealMin,
        valorMotoboy: entrega.valorMotoboy || 0,
        distanciaKm: entrega.distanciaKm || 0,
      })
      const userDocRef = doc(db, 'users', entrega.motoboyId)
      const userSnap = await getDoc(userDocRef)
      if (!userSnap.exists()) {
        toast.error('Perfil do motoboy não encontrado para atualizar XP')
        return
      }
      const userData = userSnap.data()
      const xpAtual = userData.xpAtual || 0
      const xpGanho = calcularXpEntrega(entrega.distanciaKm || 0, tempoRealMin, 1)
      const novoXpTotal = xpAtual + xpGanho
      const { nivel: novoNivel, progresso } = calcularNivelEProgresso(novoXpTotal)
      await updateDoc(userDocRef, {
        xpAtual: novoXpTotal,
        nivel: novoNivel,
        progressoXP: progresso,
        atualizadoEm: serverTimestamp(),
      })
      toast.success(`Entrega finalizada! XP ganho: ${xpGanho.toFixed(1)}, Nível atual: ${novoNivel}`)
      router.push(`/motoboy/historico/recibo/${entrega.id}`)
    } catch (error) {
      toast.error('Erro ao finalizar entrega.')
      console.error(error)
    }
  }

  if (!entrega) return <p className={styles.loading}>Carregando entrega...</p>

  return (
    <div className={styles.container}>
      <button onClick={() => router.back()} className={styles.botaoVoltar}>
        <FaArrowLeft /> Voltar
      </button>
      <h1 className={styles.titulo}>Rota da Entrega</h1>
      <div ref={mapRef} className={styles.mapa} />
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
      <button onClick={finalizarEntrega} className={styles.botaoFinalizar}>
        <FaCheckCircle /> Finalizar Entrega
      </button>
    </div>
  )
}
