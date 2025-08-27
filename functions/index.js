const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

exports.finalizarEntrega = functions.https.onCall(async (data, context) => {
  console.log('Dados recebidos na função:', data);

  const { entregaId, motoboyId, paradaIndex } = data;

  // 1️⃣ Validação dos parâmetros
  if (!entregaId || !motoboyId || paradaIndex === undefined || paradaIndex === null) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Parâmetros inválidos: entregaId, motoboyId e paradaIndex são obrigatórios.'
    );
  }

  try {
    // 2️⃣ Buscar entrega
    const entregaRef = db.collection('entregas').doc(entregaId);
    const entregaSnap = await entregaRef.get();
    if (!entregaSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Entrega não encontrada');
    }
    const entrega = entregaSnap.data();

    const totalParadas = entrega.destinos?.length || 0;
    if (paradaIndex < 0 || paradaIndex >= totalParadas) {
      throw new functions.https.HttpsError('out-of-range', 'Parada inválida');
    }

    // 3️⃣ Atualizar status da parada
    const paradasStatus = entrega.paradasStatus || Array(totalParadas).fill('pendente');
    paradasStatus[paradaIndex] = 'concluída';

    // 4️⃣ Verificar se todas finalizadas
    const todasFinalizadas = paradasStatus.every(status => status === 'concluída');

    // 5️⃣ Calcular valores (kmPercorridos pode vir do frontend)
    const totalKm = entrega.kmPercorridos || 0;
    const taxaParada = totalParadas >= 2 ? 3 : 0;
    const valorEntregaCliente = totalKm * 1.7 + taxaParada;
    const valorEntregaMotoboy = totalKm * 1.5 + taxaParada;
    const lucroPlataforma = valorEntregaCliente - valorEntregaMotoboy;

    // 6️⃣ Atualizar Firestore da entrega
    const updateData = { paradasStatus };
    if (todasFinalizadas) {
      updateData.status = 'finalizada';
      updateData.finalizadoEm = admin.firestore.FieldValue.serverTimestamp();
      updateData.kmPercorridos = totalKm;
      updateData.valorEntregaCliente = valorEntregaCliente;
      updateData.valorEntregaMotoboy = valorEntregaMotoboy;
      updateData.lucroPlataforma = lucroPlataforma;
    }
    await entregaRef.update(updateData);

    // 7️⃣ Atualizar saldo motoboy e ranking
    if (todasFinalizadas) {
      const motoboyRef = db.collection('motoboys').doc(motoboyId);
      const motoboySnap = await motoboyRef.get();
      if (motoboySnap.exists) {
        const motoboy = motoboySnap.data();
        const novoSaldo = (motoboy.saldoDisponivel || 0) + valorEntregaMotoboy;
        const novasEntregas = (motoboy.entregasConcluidas || 0) + 1;
        const novosPontos = (motoboy.pontosSemana || 0) + 10;

        await motoboyRef.update({
          saldoDisponivel: novoSaldo,
          entregasConcluidas: novasEntregas,
          pontosSemana: novosPontos,
        });

        // Ranking semanal
        const semanaId = getSemanaId();
        const rankingRef = db.collection('ranking').doc(semanaId);
        const rankingSnap = await rankingRef.get();
        let listaMotoboys = [];

        if (rankingSnap.exists) {
          listaMotoboys = rankingSnap.data().listaMotoboys || [];
          const idx = listaMotoboys.findIndex(m => m.motoboyId === motoboyId);
          if (idx >= 0) listaMotoboys[idx].pontos = novosPontos;
          else listaMotoboys.push({ motoboyId, pontos: novosPontos });
        } else {
          listaMotoboys.push({ motoboyId, pontos: novosPontos });
        }

        listaMotoboys.sort((a, b) => b.pontos - a.pontos);
        listaMotoboys = listaMotoboys.map((m, i) => ({ ...m, posicao: i + 1 }));
        await rankingRef.set({ semanaId, listaMotoboys });
      }
    }

    return { message: `Parada ${paradaIndex + 1} finalizada com sucesso!` };
  } catch (err) {
    console.error('Erro na função finalizarEntrega:', err);
    throw new functions.https.HttpsError('internal', 'Erro ao finalizar entrega: ' + err.message);
  }
});

// =========================
// Função auxiliar: semana do ano
// =========================
function getSemanaId() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const semana = Math.ceil((((hoje - new Date(ano, 0, 1)) / 86400000 + hoje.getDay() + 1) / 7));
  return `${ano}-W${semana}`;
}
