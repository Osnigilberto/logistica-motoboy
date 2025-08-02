'use client'

import React, { useState, useEffect } from 'react'
import {
  useLoadScript,
  GoogleMap,
  DirectionsRenderer,
  Marker,
} from '@react-google-maps/api'

// Configurações do mapa
const libraries = ['places']
const containerStyle = {
  width: '100%',
  height: '300px',
  borderRadius: '8px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
}
const defaultCenter = { lat: -27.5935, lng: -48.5589 } // Centro padrão (exemplo SC)

// Componente Mapa com Rota e posição atual do motoboy
export default function MapaRotaComPosicao({ origem, destino }) {
  // Hook para carregar o script do Google Maps
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    libraries,
  })

  // Estado para armazenar resultado da rota
  const [directions, setDirections] = useState(null)
  // Estado para armazenar posição atual do motoboy
  const [posicaoAtual, setPosicaoAtual] = useState(null)

  // Pega a rota origem → destino quando o mapa carregar e origens/destinos mudarem
  useEffect(() => {
    if (!isLoaded) return
    if (!origem || !destino) return

    const directionsService = new window.google.maps.DirectionsService()

    directionsService.route(
      {
        origin: origem,
        destination: destino,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK' && result) {
          setDirections(result)
        } else {
          console.error('Erro ao calcular rota:', status)
        }
      }
    )
  }, [isLoaded, origem, destino])

  // Obtem a posição atual do usuário e atualiza em tempo real
  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn('Geolocalização não suportada pelo navegador.')
      return
    }

    const watcher = navigator.geolocation.watchPosition(
      (position) => {
        setPosicaoAtual({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
      },
      (error) => {
        console.error('Erro ao obter localização:', error)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    )

    // Limpa o watcher ao desmontar o componente
    return () => navigator.geolocation.clearWatch(watcher)
  }, [])

  if (loadError) return <p>Erro ao carregar o mapa.</p>
  if (!isLoaded) return <p>Carregando mapa...</p>

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      zoom={13}
      center={posicaoAtual || defaultCenter}
      options={{
        fullscreenControl: false,
        streetViewControl: false,
        mapTypeControl: false,
      }}
    >
      {/* Renderiza a rota entre origem e destino */}
      {directions && <DirectionsRenderer directions={directions} />}

      {/* Marca a posição atual do motoboy */}
      {posicaoAtual && (
        <Marker
          position={posicaoAtual}
          label="Você"
          icon={{
            url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
          }}
          title="Sua localização atual"
        />
      )}
    </GoogleMap>
  )
}
