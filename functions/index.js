// ===============================
// 🔹 IMPORTS E CONFIGURAÇÕES INICIAIS
// ===============================
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

// Inicializa o Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

// Função auxiliar para gerar o ID da semana (ranking semanal)
function getSemanaId() {
  const agora = new Date();
  const primeiroDiaDoAno = new Date(agora.getFullYear(), 0, 1);
  const diff = agora - primeiroDiaDoAno;
  const umDia = 1000 * 60 * 60 * 24;
  const numeroSemana = Math.ceil((diff / umDia + primeiroDiaDoAno.getDay() + 1) / 7);
  return `${agora.getFullYear()}-S${numeroSemana}`;
}

// ===============================
// 🔹 FUNÇÃO: FINALIZAR ENTREGA
// ===============================
exports.finalizarEntrega = functions.https.onCall(async (data, context) => {
  console.log("📥 Dados recebidos na função:", data);

  const { entregaId, motoboyId, paradaIndex } = data;

  // 1️⃣ Validação dos parâmetros
  if (
    typeof entregaId !== "string" || !entregaId.trim() ||
    typeof motoboyId !== "string" || !motoboyId.trim() ||
    paradaIndex === undefined || paradaIndex === null
  ) {
    console.error("❌ Falha na validação:", { entregaId, motoboyId, paradaIndex });
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Parâmetros inválidos: entregaId, motoboyId e paradaIndex são obrigatórios."
    );
  }

  try {
    // 2️⃣ Buscar entrega
    const entregaRef = db.collection("entregas").doc(entregaId);
    const entregaSnap = await entregaRef.get();
    if (!entregaSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Entrega não encontrada");
    }
    const entrega = entregaSnap.data();

    const totalParadas = entrega.destinos?.length || 0;
    if (paradaIndex < 0 || paradaIndex >= totalParadas) {
      throw new functions.https.HttpsError("out-of-range", "Parada inválida");
    }

    // 3️⃣ Atualizar status da parada
    const paradasStatus = entrega.paradasStatus || Array(totalParadas).fill("pendente");
    paradasStatus[paradaIndex] = "concluída";

    // 4️⃣ Verificar se todas finalizadas
    const todasFinalizadas = paradasStatus.every((status) => status === "concluída");

    // 5️⃣ Calcular valores
    const totalKm = entrega.kmPercorridos || 0;
    const taxaParada = totalParadas >= 2 ? 3 : 0;
    const valorEntregaCliente = totalKm * 1.7 + taxaParada;
    const valorEntregaMotoboy = totalKm * 1.5 + taxaParada;
    const lucroPlataforma = valorEntregaCliente - valorEntregaMotoboy;

    // 6️⃣ Atualizar Firestore da entrega
    const updateData = { paradasStatus };
    if (todasFinalizadas) {
      updateData.status = "finalizada";
      updateData.finalizadoEm = admin.firestore.FieldValue.serverTimestamp();
      updateData.kmPercorridos = totalKm;
      updateData.valorEntregaCliente = valorEntregaCliente;
      updateData.valorEntregaMotoboy = valorEntregaMotoboy;
      updateData.lucroPlataforma = lucroPlataforma;
    }
    await entregaRef.update(updateData);

    // 7️⃣ Atualizar saldo motoboy e ranking
    if (todasFinalizadas) {
      const motoboyRef = db.collection("motoboys").doc(motoboyId);
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
        const rankingRef = db.collection("ranking").doc(semanaId);
        const rankingSnap = await rankingRef.get();
        let listaMotoboys = [];

        if (rankingSnap.exists) {
          listaMotoboys = rankingSnap.data().listaMotoboys || [];
          const idx = listaMotoboys.findIndex((m) => m.motoboyId === motoboyId);
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

    console.log(`✅ Parada ${paradaIndex + 1} finalizada com sucesso!`);
    return { message: `Parada ${paradaIndex + 1} finalizada com sucesso!` };
  } catch (err) {
    console.error("❌ Erro na função finalizarEntrega:", err);
    throw new functions.https.HttpsError("internal", "Erro ao finalizar entrega: " + err.message);
  }
});

// ===============================
// 🔹 FUNÇÃO: ENVIAR EMAIL DE CONTATO (V3)
// ===============================
const { onDocumentCreated } = require("firebase-functions/v2/firestore");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "rootedtch@gmail.com",
    pass: "mofb skds kdun qeha",
  },
});

exports.sendContactEmail = onDocumentCreated("contatos/{docId}", async (event) => {
  const data = event.data;

  const mailOptions = {
    from: "rootedtch@gmail.com",
    to: "rootedtch@gmail.com",
    subject: `Nova mensagem de ${data.nome}`,
    html: `
      <p><strong>Nome:</strong> ${data.nome}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Mensagem:</strong><br/>${data.mensagem}</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ Email de contato enviado com sucesso!");
  } catch (err) {
    console.error("❌ Erro ao enviar email:", err);
  }
});