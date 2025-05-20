/** @type {import('next').NextConfig} */
const withPWA = require("next-pwa")({
  dest: "public",           // onde os arquivos PWA serão gerados
  register: true,           // registra o service worker automaticamente
  skipWaiting: true,        // ativa skipWaiting para atualizar o SW imediatamente
  disable: process.env.NODE_ENV === "development", // desativa PWA no dev para evitar cache pesado
  // você pode adicionar outras configs do next-pwa aqui se precisar
});

const nextConfig = {
  reactStrictMode: true,    // ativa o modo estrito do React, ajuda a detectar problemas
  swcMinify: true,          // usa o compilador SWC para minificar JS mais rápido
  // Configuração para suportar imagens externas, se precisar:
  images: {
    domains: ['example.com'],  // coloque aqui domínios de onde quer carregar imagens externas
  },
  // Configuração para suportar variáveis de ambiente customizadas
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://api.exemplo.com',
  },
  // Outras configurações Next.js que quiser adicionar
};

module.exports = withPWA(nextConfig);
