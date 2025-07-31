// src/app/api/finalizar-entrega/route.js

import { getFirestore, doc, updateDoc, getDoc, increment } from 'firebase/firestore';
import { app } from '@/lib/firebaseAdmin';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const db = getFirestore(app);
    const { entregaId, motoboyId } = await req.json();

    if (!entregaId || !motoboyId) {
      return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 });
    }

    // Finaliza a entrega
    const entregaRef = doc(db, 'entregas', entregaId);
    await updateDoc(entregaRef, {
      status: 'finalizado',
      finalizadoEm: new Date(),
    });

    // Pega dados do motoboy
    const motoboyRef = doc(db, 'users', motoboyId);
    const snap = await getDoc(motoboyRef);

    if (!snap.exists()) {
      return NextResponse.json({ error: 'Motoboy não encontrado.' }, { status: 404 });
    }

    const motoboy = snap.data();

    // XP e nível atuais (fallback para 0)
    let nivel = motoboy.nivel || 0;
    let xp = motoboy.xp || 0;

    // Ganha 10 XP por entrega
    xp += 10;

    // Verifica se deve subir de nível
    while (xp >= (XP_POR_NIVEL[nivel] || Infinity)) {
      xp -= XP_POR_NIVEL[nivel];
      nivel++;
    }

    // Atualiza motoboy
    await updateDoc(motoboyRef, { xp, nivel });

    return NextResponse.json({ sucesso: true, nivel, xp });
  } catch (e) {
    console.error('Erro ao finalizar entrega:', e);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

// Tabela de XP necessária por nível
const XP_POR_NIVEL = {
  0: 100, 1: 200, 2: 300, 3: 400, 4: 500,
  5: 600, 6: 700, 7: 800, 8: 900, 9: 1000,
};
