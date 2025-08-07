'use client'

import { useEffect, useState } from 'react'
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore'
import { db } from '@/firebase/firebaseClient'
import { toast } from 'react-toastify'

export default function CorrigirEntregasAntigas() {
  const [corrigindo, setCorrigindo] = useState(false)
  const [feito, setFeito] = useState(false)
  const [log, setLog] = useState([])

  const corrigirEntregas = async () => {
    if (feito || corrigindo) return

    setCorrigindo(true)
    const entregasRef = collection(db, 'entregas')
    const snapshot = await getDocs(entregasRef)
    const atualizadas = []

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data()
      const id = docSnap.id

      if (data.status !== 'finalizada') continue

      const atualizacao = {}

      if (!('valorMotoboy' in data)) atualizacao.valorMotoboy = 0
      if (!('distanciaKm' in data)) atualizacao.distanciaKm = 0
      if (!('tempoRealMin' in data)) atualizacao.tempoRealMin = 0
      if (!('finalizadoEm' in data)) atualizacao.finalizadoEm = data.criadoEm || null

      // Só atualiza se tiver algo faltando
      if (Object.keys(atualizacao).length > 0) {
        await updateDoc(doc(db, 'entregas', id), atualizacao)
        atualizadas.push({ id, ...atualizacao })
      }
    }

    setLog(atualizadas)
    setCorrigindo(false)
    setFeito(true)
    toast.success(`Corrigidas ${atualizadas.length} entregas!`)
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>🛠 Corrigir Entregas Antigas</h1>
      <p>Esse script irá corrigir entregas finalizadas que não possuem os campos necessários para cálculo.</p>
      <button
        onClick={corrigirEntregas}
        disabled={corrigindo || feito}
        style={{
          backgroundColor: 'var(--color-accent)',
          color: 'white',
          padding: '1rem 2rem',
          border: 'none',
          borderRadius: '8px',
          fontSize: '1.1rem',
          marginTop: '1rem',
          cursor: feito ? 'not-allowed' : 'pointer',
        }}
      >
        {feito ? '✔️ Correção Concluída' : corrigindo ? 'Corrigindo...' : 'Corrigir Agora'}
      </button>

      {log.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h3>📄 Entregas Corrigidas:</h3>
          <ul>
            {log.map((item, i) => (
              <li key={i}>
                <strong>ID:</strong> {item.id}
                {item.valorMotoboy !== undefined && ` | valorMotoboy: ${item.valorMotoboy}`}
                {item.distanciaKm !== undefined && ` | distanciaKm: ${item.distanciaKm}`}
                {item.tempoRealMin !== undefined && ` | tempoRealMin: ${item.tempoRealMin}`}
                {item.finalizadoEm && ` | finalizadoEm: ✅`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
