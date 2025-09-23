import { admin, db } from '@/lib/firebaseAdmin'
import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { entregaId, motoboyId } = await req.json()

    if (!entregaId || !motoboyId) {
      return NextResponse.json(
        { error: 'Dados incompletos.' },
        { status: 400 }
      )
    }

    // Finaliza a entrega
    const entregaRef = db.collection('entregas').doc(entregaId)
    await entregaRef.update({
      status: 'finalizado',
      finalizadoEm: admin.firestore.FieldValue.serverTimestamp(),
    })

    // Pega dados do motoboy
    const motoboyRef = db.collection('users').doc(motoboyId)
    const snap = await motoboyRef.get()

    if (!snap.exists) {
      return NextResponse.json(
        { error: 'Motoboy não encontrado.' },
        { status: 404 }
      )
    }

    const motoboy = snap.data()
    let nivel = motoboy.nivel || 0
    let xp = motoboy.xp || 0

    // +10 XP por entrega
    xp += 10

    // Verifica se sobe de nível
    while (xp >= (XP_POR_NIVEL[nivel] || Infinity)) {
      xp -= XP_POR_NIVEL[nivel]
      nivel++
    }

    // Atualiza motoboy
    await motoboyRef.update({ xp, nivel })

    return NextResponse.json({ sucesso: true, nivel, xp })
  } catch (e) {
    console.error('Erro ao finalizar entrega:', e)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}

// Tabela de XP necessária por nível
const XP_POR_NIVEL = {
  0: 100,
  1: 200,
  2: 300,
  3: 400,
  4: 500,
  5: 600,
  6: 700,
  7: 800,
  8: 900,
  9: 1000,
}
