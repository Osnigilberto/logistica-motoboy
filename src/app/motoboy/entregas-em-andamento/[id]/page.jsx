'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { toast } from 'react-toastify'
import { app } from '@/firebase/firebaseClient'
import styles from './entregaRota.module.css'
import { FaArrowLeft, FaMapMarkerAlt, FaStickyNote } from 'react-icons/fa'

export default function PaginaEntregaEmAndamento() {
  const { id } = useParams()
  const router = useRouter()
  const db = getFirestore(app)
  const mapRef = useRef(null)
  const polyline = useRef(null)

  const [entrega, setEntrega] = useState(null)
  const [map, setMap] = useState(null)
  const [motoboyMarker, setMotoboyMarker] = useState(null)
  const [paradasMarkers, setParadasMarkers] = useState([])
  const [directionsRenderer, setDirectionsRenderer] = useState(null)
  const [rotaIniciada, setRotaIniciada] = useState(false)
  const [paradasStatus, setParadasStatus] = useState([])
  const [caminhoPercorrido, setCaminhoPercorrido] = useState([])
  const [paradaAtualIndex, setParadaAtualIndex] = useState(null)

  /* =========================
     1. Buscar entrega no Firestore
  ============================ */
  useEffect(() => {
    if (!id) return
    const fetchEntrega = async () => {
      try {
        const docRef = doc(db, 'entregas', id)
        const snap = await getDoc(docRef)
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() }
          setEntrega(data)
          setParadasStatus(Array(data.destinos.length).fill('pendente'))
        } else {
          toast.error('Entrega não encontrada')
          router.push('/motoboy/entregas-em-andamento')
        }
      } catch {
        toast.error('Erro ao buscar dados da entrega')
        router.push('/motoboy/entregas-em-andamento')
      }
    }
    fetchEntrega()
  }, [id, db, router])

  /* =========================
     2. Inicializar mapa
  ============================ */
  useEffect(() => {
    if (!entrega || typeof window.google === 'undefined') return

    const mapInstance = new google.maps.Map(mapRef.current, {
      zoom: 14,
      center: { lat: -27.5954, lng: -48.548 },
    })
    setMap(mapInstance)

    const directionsDisplay = new google.maps.DirectionsRenderer({ suppressMarkers: true })
    directionsDisplay.setMap(mapInstance)
    setDirectionsRenderer(directionsDisplay)
  }, [entrega])

  /* =========================
     3. Criar marcadores das paradas
  ============================ */
  useEffect(() => {
    if (map && entrega) {
      criarMarcadoresParadas()
    }
  }, [map, entrega, paradasStatus])

  const criarMarcadoresParadas = async () => {
    if (!map || !entrega) return
    const geocoder = new google.maps.Geocoder()
    const markers = []

    for (let i = 0; i < entrega.destinos.length; i++) {
      const endereco = entrega.destinos[i]
      await new Promise((resolve, reject) => {
        geocoder.geocode({ address: endereco }, (results, status) => {
          if (status === 'OK') {
            const marker = new google.maps.Marker({
              position: results[0].geometry.location,
              map,
              label: { text: String(i + 1), color: '#fff', fontWeight: 'bold' },
              title: endereco,
              animation: paradasStatus[i] === 'em andamento' ? google.maps.Animation.BOUNCE : null,
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 20,
                fillColor:
                  paradasStatus[i] === 'concluída'
                    ? '#16a34a'
                    : paradasStatus[i] === 'em andamento'
                    ? '#007bff'
                    : '#facc15',
                fillOpacity: 1,
                strokeColor: '#fff',
                strokeWeight: 2,
              },
            })
            markers.push(marker)
            resolve()
          } else reject(status)
        })
      })
    }
    setParadasMarkers(markers)
  }

  /* =========================
     4. Atualizar rota até parada selecionada
  ============================ */
  const atualizarRota = () => {
    if (!directionsRenderer || !map || !motoboyMarker || paradaAtualIndex === null) return
    const directionsService = new google.maps.DirectionsService()
    const destino = paradasMarkers[paradaAtualIndex]?.getPosition()
    if (!destino) return

    directionsService.route(
      {
        origin: motoboyMarker.getPosition(),
        destination: destino,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK') {
          directionsRenderer.setDirections(result)
        }
      }
    )
  }

  /* =========================
     5. Atualizar posição do motoboy
  ============================ */
  useEffect(() => {
    if (!map || !rotaIniciada) return
    const watchId = navigator.geolocation.watchPosition(
      pos => {
        const { latitude, longitude } = pos.coords
        const position = new google.maps.LatLng(latitude, longitude)

        if (!motoboyMarker) {
          const marker = new google.maps.Marker({
            position,
            map,
            title: 'Sua posição',
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 12,
              fillColor: '#007bff',
              fillOpacity: 1,
              strokeColor: '#fff',
              strokeWeight: 2,
            },
          })
          setMotoboyMarker(marker)
        } else {
          motoboyMarker.setPosition(position)
        }

        setCaminhoPercorrido(prev => {
          const novoCaminho = [...prev, position]
          if (!polyline.current) {
            polyline.current = new google.maps.Polyline({
              path: novoCaminho,
              geodesic: true,
              strokeColor: '#007bff',
              strokeOpacity: 0.7,
              strokeWeight: 4,
              map,
            })
          } else {
            polyline.current.setPath(novoCaminho)
          }
          return novoCaminho
        })

        map.panTo(position)
        atualizarRota()
      },
      error => {
        toast.error('Erro ao obter localização')
        console.error(error)
      },
      { enableHighAccuracy: true }
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [map, motoboyMarker, rotaIniciada, paradasMarkers, paradaAtualIndex])

  /* =========================
     6. Iniciar rota
  ============================ */
  const iniciarRota = async () => {
    if (!map) return
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        const { latitude, longitude } = pos.coords
        const position = new google.maps.LatLng(latitude, longitude)
        const marker = new google.maps.Marker({
          position,
          map,
          title: 'Sua posição',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: '#007bff',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
          },
        })
        setMotoboyMarker(marker)
        map.panTo(position)
      })
    }
    setRotaIniciada(true)
    toast.info('Rota iniciada!')
  }

  /* =========================
     7. Escolher parada atual
  ============================ */
  const escolherParada = index => {
    const novaStatus = [...paradasStatus]
    novaStatus[index] = 'em andamento'
    setParadasStatus(novaStatus)
    setParadaAtualIndex(index)
  }

  /* =========================
     8. Finalizar parada (calculando km automaticamente)
  ============================ */
  const finalizarParada = async index => {
    try {
      const novaStatus = [...paradasStatus]
      novaStatus[index] = 'concluída'
      setParadasStatus(novaStatus)
      setParadaAtualIndex(null)

      // Calcular km total percorrido usando Google Maps Directions
      let totalKm = 0
      for (let i = 0; i < paradasMarkers.length; i++) {
        const origin = i === 0 ? motoboyMarker.getPosition() : paradasMarkers[i - 1].getPosition()
        const destination = paradasMarkers[i].getPosition()
        totalKm += await calcularDistanciaKm(origin, destination)
      }

      if (novaStatus.every(status => status === 'concluída')) {
        const totalParadas = entrega.destinos.length
        const taxaParada = totalParadas >= 2 ? 3 : 0
        const valorEntregaCliente = totalKm * 1.7 + taxaParada
        const valorEntregaMotoboy = totalKm * 1.5 + taxaParada
        const lucroPlataforma = valorEntregaCliente - valorEntregaMotoboy

        await updateDoc(doc(db, 'entregas', entrega.id), {
          status: 'finalizada',
          finalizadoEm: serverTimestamp(),
          kmPercorridos: totalKm,
          valorEntregaCliente,
          valorEntregaMotoboy,
          lucroPlataforma,
        })

        // Atualizar saldo motoboy
        const motoboyRef = doc(db, 'motoboys', entrega.motoboyId)
        const motoboySnap = await getDoc(motoboyRef)
        if (motoboySnap.exists()) {
          const dadosMotoboy = motoboySnap.data()
          const novoSaldo = (dadosMotoboy.saldoDisponivel || 0) + valorEntregaMotoboy
          const novasEntregas = (dadosMotoboy.entregasConcluidas || 0) + 1
          const novosPontos = (dadosMotoboy.pontosSemana || 0) + 10
          await updateDoc(motoboyRef, {
            saldoDisponivel: novoSaldo,
            entregasConcluidas: novasEntregas,
            pontosSemana: novosPontos,
          })

          // Atualizar ranking semanal
          const semanaId = getSemanaId()
          const rankingRef = doc(db, 'ranking', semanaId)
          const rankingSnap = await getDoc(rankingRef)
          let listaMotoboys = []
          if (rankingSnap.exists()) {
            listaMotoboys = rankingSnap.data().listaMotoboys || []
            const idx = listaMotoboys.findIndex(m => m.motoboyId === entrega.motoboyId)
            if (idx >= 0) listaMotoboys[idx].pontos = novosPontos
            else listaMotoboys.push({ motoboyId: entrega.motoboyId, pontos: novosPontos })
          } else {
            listaMotoboys.push({ motoboyId: entrega.motoboyId, pontos: novosPontos })
          }
          listaMotoboys.sort((a, b) => b.pontos - a.pontos)
          listaMotoboys = listaMotoboys.map((m, i) => ({ ...m, posicao: i + 1 }))
          await setDoc(rankingRef, { semanaId, listaMotoboys })
        }

        toast.success('Entrega finalizada!')
        router.push('/motoboy/entregas-em-andamento')
      }
    } catch (err) {
      toast.error('Erro ao finalizar parada')
      console.error(err)
    }
  }

  /* =========================
     Função utilitária: calcular distância em km
  ============================ */
  const calcularDistanciaKm = (origin, destination) => {
    return new Promise(resolve => {
      const directionsService = new google.maps.DirectionsService()
      directionsService.route(
        {
          origin,
          destination,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === 'OK') {
            const route = result.routes[0]
            let km = 0
            route.legs.forEach(leg => {
              km += leg.distance.value / 1000 // metros para km
            })
            resolve(km)
          } else {
            console.error('Erro ao calcular distância:', status)
            resolve(0)
          }
        }
      )
    })
  }

  const getSemanaId = () => {
    const hoje = new Date()
    const ano = hoje.getFullYear()
    const semana = Math.ceil((((hoje - new Date(ano,0,1)) / 86400000 + hoje.getDay()+1)/7))
    return `${ano}-W${semana}`
  }

  /* =========================
     Render
  ============================ */
  if (!entrega) return <p className={styles.loading}>Carregando entrega...</p>

  return (
    <div className={styles.container}>
      <button onClick={() => router.back()} className={styles.botaoVoltar}>
        <FaArrowLeft /> Voltar
      </button>

      <h1 className={styles.titulo}>Rota da Entrega</h1>

      {!rotaIniciada && (
        <button className={`${styles.botaoAcao} ${styles.botaoIniciar}`} onClick={iniciarRota}>
          🚀 Iniciar Rota
        </button>
      )}

      <div ref={mapRef} className={styles.mapa} />

      <div className={styles.paradasWrapper}>
        {entrega.destinos.map((dest, i) => (
          <div
            key={i}
            className={`${styles.paradaItem} ${paradasStatus[i] === 'pendente' ? 'pendente' : paradasStatus[i] === 'em andamento' ? 'emAndamento' : 'concluida'}`}
          >
            <p><strong>Parada {i + 1}:</strong> {dest}</p>
            <p><strong>Destinatário:</strong> {entrega.destinatarios[i]?.nome}</p>
            <p><strong>Telefone:</strong> {entrega.destinatarios[i]?.telefone}</p>

            {paradasStatus[i] === 'pendente' && (
              <button className={`${styles.botaoAcao} ${styles.botaoEscolher}`} onClick={() => escolherParada(i)}>
                📍 Escolher para Entrega
              </button>
            )}

            {paradasStatus[i] === 'em andamento' && (
              <button className={`${styles.botaoAcao} ${styles.botaoFinalizar}`} onClick={() => finalizarParada(i)}>
                ✅ Finalizar Parada
              </button>
            )}
          </div>
        ))}
      </div>

      <div className={styles.info}>
        <div><FaMapMarkerAlt /> <strong>Origem:</strong> {entrega.origem}</div>
        <div><FaStickyNote /> <strong>Descrição:</strong> {entrega.descricao}</div>
      </div>
    </div>
  )
}
