'use client'

import { useAuth } from '@/context/AuthProvider'


export default function ReciboLayout({ children }) {
  const { profile, loading } = useAuth()

  if (loading) {
    return <p>Carregando...</p>
  }

  // Pega o tipo de usuário ou define 'cliente' como padrão
  const userType = profile?.tipo || 'cliente'

 
}
