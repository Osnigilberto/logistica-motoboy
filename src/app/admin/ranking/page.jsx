'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore'
import { app } from '@/firebase/firebaseClient'
import { useAuth } from '@/context/AuthProvider'
import styles from './ranking.module.css'

const db = getFirestore(app)
const ADMIN_UID = 'TkIu3cI2itQ2K4xAkHQ9l9KTvp83'

export default function RankingAdmin() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [motoboys, setMotoboys] = useState([])
  const [ranking, setRanking] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  const isAdmin = user?.uid === ADMIN_UID
  const semanaId = getSemanaId() // Semana atual no formato YYYY-Wxx

  // Função para calcular a semana atual
  function getSemanaId() {
  const now = new Date();
  // Converte para UTC para evitar problemas de fuso
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  // ISO 8601: ajusta para quinta-feira da semana (semana contém quinta = semana do ano)
  const dayNum = d.getUTCDay() || 7; // Domingo = 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const year = d.getUTCFullYear();
  // Calcula semana
  const startOfYear = new Date(Date.UTC(year, 0, 1));
  const days = Math.floor((d - startOfYear) / 86400000);
  const week = Math.ceil((days + 1) / 7);
  return `${year}-W${week}`;
}

  // Busca dados de motoboys e ranking
  const fetchData = async () => {
    setLoadingData(true)
    try {
      // 1️⃣ Busca todos os usuários do tipo motoboy
      const usersSnap = await getDocs(collection(db, 'users'))
      const motoboysData = usersSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(u => u.tipo === 'motoboy')
      setMotoboys(motoboysData)

      // 2️⃣ Calcula ranking baseado nos pontos da semana
      const rankingData = motoboysData
        .map(m => ({
          motoboyId: m.id,
          nome: m.nome,
          pontos: m.pontosSemana || 0,
          medalhas: m.medalhas || [],
        }))
        .sort((a, b) => b.pontos - a.pontos) // Ordena do maior para o menor
        .map((m, index) => ({ ...m, posicao: index + 1 })) // Define posição

      // 3️⃣ Salva ranking no Firestore
      await setDoc(doc(db, 'ranking', semanaId), {
        semanaId,
        listaMotoboys: rankingData
      })

      setRanking(rankingData)
    } catch (err) {
      console.error('Erro ao buscar ranking:', err)
    }
    setLoadingData(false)
  }

  useEffect(() => {
    if (!loading && !user) router.push('/login')
    if (user && isAdmin) fetchData()
  }, [user, loading])

  if (!loading && !isAdmin) return <div>Acesso negado</div>
  if (loading || loadingData) return <div>Carregando...</div>

  return (
    <div className={styles.container}>
      {/* Botão de voltar */}
      <button className={styles.backBtn} onClick={() => router.back()}>
        ← Voltar
      </button>

      <h1>Ranking Semanal de Motoboys ({semanaId})</h1>

      {/* Tabela de ranking */}
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Posição</th>
            <th>Motoboy</th>
            <th>Pontos</th>
            <th>Medalhas</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map(m => (
            <tr key={m.motoboyId} className={m.posicao <= 3 ? styles.top3 : ''}>
              <td>{m.posicao}</td>
              <td>{m.nome}</td>
              <td>{m.pontos}</td>
              <td>{m.medalhas.join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
