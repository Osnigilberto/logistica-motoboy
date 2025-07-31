'use client';

import Script from 'next/script';

// Obtém a chave da API do Google Maps a partir das variáveis de ambiente
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export default function GoogleMapsLoader() {
  // Verifica se a chave da API está definida, para evitar erros de carregamento
  if (!GOOGLE_MAPS_API_KEY) {
    console.error("Chave da API do Google Maps não definida.");
    return null; // Não renderiza nada se a chave estiver ausente
  }

  // Componente Script do Next.js para carregar a Google Maps JavaScript API
  // 'strategy="beforeInteractive"' garante que o script seja carregado antes da interação do usuário
  return (
    <Script
      src={`https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`}
      strategy="beforeInteractive"
    />
  );
}
