'use client';

import { useEffect, useRef, useState } from 'react';
import { FaMapMarkerAlt, FaClock, FaMoneyBillWave } from 'react-icons/fa';
import styles from './mapaEntrega.module.css';

export default function MapaEntrega({ origem, destino, onInfoChange }) {
  const mapRef = useRef(null); // Referência para o container do mapa
  const [map, setMap] = useState(null); // Estado do mapa
  const [loading, setLoading] = useState(true); // Carregamento do mapa
  const [info, setInfo] = useState({
    distanciaKm: 0,
    tempoMin: 0,
    custo: 0,
  });

  // Inicializa o mapa ao carregar o componente
  useEffect(() => {
    if (!window.google?.maps || !mapRef.current) return;

    const mapInstance = new window.google.maps.Map(mapRef.current, {
      center: { lat: -23.55052, lng: -46.633308 }, // Centro padrão (São Paulo)
      zoom: 13,
      disableDefaultUI: true, // Remove controles padrão
    });

    setMap(mapInstance);
  }, []);

  // Atualiza a rota no mapa quando origem/destino mudarem
  useEffect(() => {
    if (!map || !origem || !destino) return;

    const geocoder = new window.google.maps.Geocoder(); // Para converter endereço em coordenadas
    const directionsService = new window.google.maps.DirectionsService(); // Serviço para rotas
    const directionsRenderer = new window.google.maps.DirectionsRenderer({
      suppressMarkers: true, // Para não exibir marcadores padrão
    });

    directionsRenderer.setMap(map);

    // Função que geocodifica o endereço (retorna uma Promise)
    const geocodeAddress = (address) =>
      new Promise((resolve, reject) => {
        geocoder.geocode({ address }, (results, status) => {
          if (status === 'OK') resolve(results[0].geometry.location);
          else reject(`Erro na geocodificação: ${status}`);
        });
      });

    // Função que calcula a rota entre origem e destino
    const calcularRota = async () => {
      setLoading(true);
      try {
        const origemLoc = await geocodeAddress(origem);
        const destinoLoc = await geocodeAddress(destino);

        const request = {
          origin: origemLoc,
          destination: destinoLoc,
          travelMode: 'DRIVING',
        };

        directionsService.route(request, (result, status) => {
          if (status === 'OK') {
            directionsRenderer.setDirections(result);

            const route = result.routes[0].legs[0];
            const distanciaKm = route.distance.value / 1000; // metros -> km
            const tempoMin = route.duration.value / 60; // segundos -> minutos
            const custo = calcularCusto(distanciaKm); // Calcula custo baseado na distância

            const novaInfo = { distanciaKm, tempoMin, custo };
            setInfo(novaInfo);
            onInfoChange(novaInfo); // Envia os dados para o componente pai
          } else {
            console.error('Erro ao calcular rota:', status);
          }
          setLoading(false);
        });
      } catch (error) {
        console.error('Erro geral:', error);
        setLoading(false);
      }
    };

    calcularRota();
  }, [map, origem, destino]);

  // Função que calcula o custo da entrega (exemplo simples)
  const calcularCusto = (distanciaKm) => {
    const taxaParada = 3;
    const custoKm = 1;
    return distanciaKm * custoKm + taxaParada;
  };

  return (
    <div className={styles.mapaContainer}>
      {/* Container do mapa */}
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

      {/* Overlay de carregamento */}
      {loading && (
        <div className={styles.loadingOverlay}>Carregando mapa...</div>
      )}

      {/* Caixa de informações da rota */}
      {!loading && (
        <div className={styles.infoBox}>
          <div className={styles.infoItem}>
            <FaMapMarkerAlt className={styles.icon} />
            <span>{info.distanciaKm.toFixed(2)} km</span>
          </div>
          <div className={styles.infoItem}>
            <FaClock className={styles.icon} />
            <span>{info.tempoMin.toFixed(0)} min</span>
          </div>
          <div className={styles.infoItem}>
            <FaMoneyBillWave className={styles.icon} />
            <span>R$ {info.custo.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
