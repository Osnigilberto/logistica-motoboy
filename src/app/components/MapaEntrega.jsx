'use client';

import { useEffect, useRef, useState } from 'react';
import { FaMapMarkerAlt, FaClock, FaMoneyBillWave } from 'react-icons/fa';
import { toast } from 'react-toastify';
import styles from './MapaEntrega.module.css';

// Hook para debounce
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

export default function MapaEntrega({ origem, destinos, onInfoChange }) {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState({ distanciaKm: 0, tempoMin: 0, custo: 0 });

  // Debounce para evitar múltiplas requisições
  const origemDebounced = useDebounce(origem, 800);
  const destinosDebounced = useDebounce(destinos, 800);

  // Inicializa mapa
  useEffect(() => {
    if (!window.google?.maps || !mapRef.current) return;

    const mapInstance = new window.google.maps.Map(mapRef.current, {
      center: { lat: -23.55052, lng: -46.633308 },
      zoom: 13,
      disableDefaultUI: true,
    });

    setMap(mapInstance);
  }, []);

  // Atualiza rota quando origemDebounced ou destinosDebounced mudarem
  useEffect(() => {
    if (!map || !origemDebounced || !destinosDebounced || destinosDebounced.length === 0) return;

    const geocoder = new window.google.maps.Geocoder();
    const directionsService = new window.google.maps.DirectionsService();
    const directionsRenderer = new window.google.maps.DirectionsRenderer({ suppressMarkers: true });
    directionsRenderer.setMap(map);

    const destinosValidos = destinosDebounced.filter((d) => d && d.trim() !== '');
    if (destinosValidos.length === 0) return;

    const geocodeAddress = (address) =>
      new Promise((resolve, reject) => {
        geocoder.geocode({ address: address.trim() }, (results, status) => {
          if (status === 'OK') resolve(results[0].geometry.location);
          else reject(status);
        });
      });

    const calcularRota = async () => {
      setLoading(true);
      try {
        // Geocodifica origem
        const origemLoc = await geocodeAddress(origemDebounced);
        const origemLat = origemLoc.lat();
        const origemLng = origemLoc.lng();

        // Geocodifica destinos
        const destinosLoc = await Promise.all(destinosValidos.map(geocodeAddress));
        const destinosLat = destinosLoc.map(loc => loc.lat());
        const destinosLng = destinosLoc.map(loc => loc.lng());

        // Configura waypoints (todos menos o último, que é o destination)
        const waypoints = destinosLoc.slice(0, -1).map((loc) => ({ location: loc }));

        const request = {
          origin: origemLoc,
          destination: destinosLoc[destinosLoc.length - 1],
          waypoints,
          travelMode: 'DRIVING',
        };

        directionsService.route(request, (result, status) => {
          if (status === 'OK') {
            directionsRenderer.setDirections(result);

            let distanciaTotal = 0;
            let tempoTotal = 0;
            result.routes[0].legs.forEach((leg) => {
              distanciaTotal += leg.distance.value;
              tempoTotal += leg.duration.value;
            });

            distanciaTotal /= 1000; // metros → km
            tempoTotal /= 60; // segundos → minutos

            const custo = calcularCusto(distanciaTotal, destinosLoc.length);

            // ✅ NOVO: Inclui coordenadas no retorno
            const novaInfo = {
              distanciaKm: distanciaTotal,
              tempoMin: tempoTotal,
              custo,
              origemLat,
              origemLng,
              destinosLat,
              destinosLng
            };

            setInfo(novaInfo);
            onInfoChange(novaInfo); // ✅ Agora retorna coordenadas!
          } else if (status === 'ZERO_RESULTS') {
            toast.error('Rota inválida: endereço não encontrado.');
          } else {
            toast.error(`Erro ao calcular rota: ${status}`);
          }
          setLoading(false);
        });
      } catch (error) {
        if (error === 'INVALID_REQUEST') {
          toast.error('Erro na geocodificação: endereço vazio ou inválido.');
        } else {
          toast.error('Erro ao calcular a rota. Verifique os endereços.');
        }
        setLoading(false);
        console.error('Erro geral:', error);
      }
    };

    calcularRota();
  }, [map, origemDebounced, destinosDebounced]);

  const calcularCusto = (distanciaKm, quantidadeDestinos) => {
    const custoKmCliente = distanciaKm * 1.7;
    const taxaParadas = quantidadeDestinos > 1 ? (quantidadeDestinos - 1) * 3.0 : 0;
    return custoKmCliente + taxaParadas;
  };

  return (
    <div className={styles.mapaContainer}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      {loading && <div className={styles.loadingOverlay}>Carregando mapa...</div>}

      {!loading && (
        <div className={styles.infoBox}>
          <div className={styles.infoItem}>
            <FaMapMarkerAlt className={styles.icon} /> <span>{info.distanciaKm.toFixed(2)} km</span>
          </div>
          <div className={styles.infoItem}>
            <FaClock className={styles.icon} /> <span>{info.tempoMin.toFixed(0)} min</span>
          </div>
          <div className={styles.infoItem}>
            <FaMoneyBillWave className={styles.icon} /> <span>R$ {info.custo.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}