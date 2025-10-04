// ===============================
// 🔹 IMPORTS E CONFIGURAÇÕES INICIAIS
// ===============================
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const { onSchedule } = require("firebase-functions/v2/scheduler");
require("dotenv").config(); // Carrega variáveis do arquivo .env

admin.initializeApp();
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// ===============================
// 🔹 FUNÇÃO AUXILIAR: CALCULAR ID DA SEMANA (ISO 8601)
// ===============================
function getSemanaId() {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const year = d.getUTCFullYear();
  const startOfYear = new Date(Date.UTC(year, 0, 1));
  const days = Math.floor((d - startOfYear) / 86400000);
  const week = Math.ceil((days + 1) / 7);
  return `${year}-W${week}`;
}

// ===============================
// 🔹 LÓGICA DE CONCESSÃO DE MEDALHAS AUTOMÁTICAS
// ===============================
const concederMedalhasAutomatica = async (motoboyRef, entregasConcluidas) => {
  const novasMedalhas = [];

  const medalhasDisponiveis = [
    { nome: "Primeira Entrega", entregasNecessarias: 1 },
    { nome: "5 Entregas Concluídas", entregasNecessarias: 5 },
    { nome: "10 Entregas Concluídas", entregasNecessarias: 10 },
    { nome: "20 Entregas Concluídas", entregasNecessarias: 20 },
    { nome: "50 Entregas Concluídas", entregasNecessarias: 50 },
  ];

  for (const m of medalhasDisponiveis) {
    if (entregasConcluidas >= m.entregasNecessarias) {
      novasMedalhas.push(m.nome);
    }
  }

  if (novasMedalhas.length > 0) {
    await motoboyRef.update({
      medalhas: FieldValue.arrayUnion(...novasMedalhas),
    });
  }
};

// ===============================
// 🔹 FUNÇÃO: LÓGICA FINALIZAR ENTREGA
// ===============================
async function finalizarEntregaLogic({ entregaId, motoboyId, paradaIndex }) {
  console.log("📦 Finalizando entrega:", { entregaId, motoboyId, paradaIndex });

  if (
    typeof entregaId !== "string" ||
    !entregaId.trim() ||
    typeof motoboyId !== "string" ||
    !motoboyId.trim() ||
    paradaIndex === undefined ||
    paradaIndex === null
  ) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Parâmetros inválidos: entregaId, motoboyId e paradaIndex são obrigatórios."
    );
  }

  const entregaRef = db.collection("entregas").doc(entregaId);
  const entregaSnap = await entregaRef.get();
  if (!entregaSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Entrega não encontrada");
  }
  const entrega = entregaSnap.data();

  // ✅ Buscar o motoboy ANTES de usar (corrigido)
  const motoboyRef = db.collection("users").doc(motoboyId);
  const motoboySnap = await motoboyRef.get();
  if (!motoboySnap.exists) {
    throw new functions.https.HttpsError("not-found", "Motoboy não encontrado");
  }
  const motoboy = motoboySnap.data();

  const totalParadas = entrega.destinos?.length || 0;
  if (paradaIndex < 0 || paradaIndex >= totalParadas) {
    throw new functions.https.HttpsError("out-of-range", "Parada inválida");
  }

  // Atualiza parada
  const paradasStatus = entrega.paradasStatus || Array(totalParadas).fill("pendente");
  paradasStatus[paradaIndex] = "concluída";
  const todasFinalizadas = paradasStatus.every((status) => status === "concluída");

  // Calcula valores
  const totalKm = entrega.kmPercorridos || 0;
  const taxaParada = totalParadas > 1 ? (totalParadas - 1) * 3 : 0;
  const valorEntregaCliente = totalKm <= 5 ? 9 : totalKm * 1.7 + taxaParada;
  const valorEntregaMotoboy = totalKm <= 5 ? 8 : totalKm * 1.5 + taxaParada;
  const lucroPlataforma = valorEntregaCliente - valorEntregaMotoboy;

  // Atualiza entrega
  const updateData = { paradasStatus };
  if (todasFinalizadas) {
    updateData.status = "finalizada";
    updateData.finalizadoEm = FieldValue.serverTimestamp();
    updateData.kmPercorridos = totalKm;
    updateData.valorEntregaCliente = valorEntregaCliente;

    // 🔥 CALCULAR VALOR COM BÔNUS (agora motoboy está definido)
    let valorBaseMotoboy = totalKm <= 5 ? 8 : totalKm * 1.5 + taxaParada;
    let bonusAplicado = 0;

    // Verifica se o motoboy tem bônus válido
    if (motoboy.bonusKm && motoboy.bonusValidoAte) {
      const bonusDate = motoboy.bonusValidoAte.toDate();
      const now = new Date();
      const diffTime = Math.abs(now - bonusDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 7) {
        bonusAplicado = totalKm * motoboy.bonusKm;
        valorBaseMotoboy += bonusAplicado;
      }
    }

    updateData.valorEntregaMotoboy = valorBaseMotoboy;
    updateData.bonusAplicado = bonusAplicado;
    updateData.lucroPlataforma = valorEntregaCliente - valorBaseMotoboy;
  }
  await entregaRef.update(updateData);

  // Atualiza saldo, ranking, pontos e medalhas
  if (todasFinalizadas) {
    const nomeMotoboy = motoboy.nome || "Motoboy";

    await motoboyRef.update({
      saldoDisponivel: FieldValue.increment(updateData.valorEntregaMotoboy),
      entregasConcluidas: FieldValue.increment(1),
      pontosSemana: FieldValue.increment(10),
    });

    const motoboyAtualizado = await motoboyRef.get();
    const dadosAtualizados = motoboyAtualizado.data();
    const novasEntregas = dadosAtualizados.entregasConcluidas || 0;

    // 🏅 Concede medalhas
    await concederMedalhasAutomatica(motoboyRef, novasEntregas);

    // 🔁 Atualiza ranking semanal
    const semanaId = getSemanaId();
    console.log(`🔄 Atualizando ranking para semana: ${semanaId}`);
    const rankingRef = db.collection("ranking").doc(semanaId);
    const rankingSnap = await rankingRef.get();

    let listaMotoboys = [];
    if (rankingSnap.exists) {
      listaMotoboys = rankingSnap.data().listaMotoboys || [];
    }

    const idx = listaMotoboys.findIndex((m) => m.motoboyId === motoboyId);
    if (idx >= 0) {
      listaMotoboys[idx] = {
        ...listaMotoboys[idx],
        pontos: dadosAtualizados.pontosSemana || 0,
        nome: nomeMotoboy,
      };
    } else {
      listaMotoboys.push({
        motoboyId,
        nome: nomeMotoboy,
        pontos: dadosAtualizados.pontosSemana || 0,
        medalhas: dadosAtualizados.medalhas || [],
      });
    }

    listaMotoboys.sort((a, b) => (b.pontos || 0) - (a.pontos || 0));
    listaMotoboys = listaMotoboys.map((m, i) => ({ ...m, posicao: i + 1 }));

    await rankingRef.set({
      semanaId,
      listaMotoboys,
      atualizadoEm: FieldValue.serverTimestamp(),
    });

    console.log(`✅ Ranking atualizado para ${nomeMotoboy} com ${dadosAtualizados.pontosSemana || 0} pontos`);
  }

  return { message: `Parada ${paradaIndex + 1} finalizada com sucesso!` };
}

// ===============================
// 🔹 WRAPPERS ONCALL / ONREQUEST
// ===============================
exports.finalizarEntrega = functions.https.onCall(async (request) => {
  const data = request.data;
  const { entregaId, motoboyId, paradaIndex } = data || {};
  if (!entregaId || !motoboyId || paradaIndex === undefined || paradaIndex === null) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Parâmetros inválidos: entregaId, motoboyId e paradaIndex são obrigatórios."
    );
  }

  try {
    return await finalizarEntregaLogic({ entregaId, motoboyId, paradaIndex });
  } catch (err) {
    console.error("❌ Erro onCall:", err);
    throw err;
  }
});

exports.finalizarEntregaHttp = functions.https.onRequest(async (req, res) => {
  try {
    const result = await finalizarEntregaLogic(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ===============================
// 🔹 FUNÇÃO ENVIAR EMAIL DE CONTATO
// ===============================
const { onDocumentCreated } = require("firebase-functions/v2/firestore");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

exports.sendContactEmail = onDocumentCreated("contatos/{docId}", async (event) => {
  const data = event.data;
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER,
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

// ===============================
// 🔹 FUNÇÃO: SOLICITAR SAQUE
// ===============================
exports.solicitarSaque = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.uid) {
    throw new functions.https.HttpsError("unauthenticated", "Apenas motoboys autenticados podem solicitar saque.");
  }

  const motoboyId = context.auth.uid;
  const { valor } = data;

  if (typeof valor !== "number" || valor <= 0 || valor > 10000) {
    throw new functions.https.HttpsError("invalid-argument", "Valor inválido. Máx: R$10.000.");
  }
  if (valor < 100) {
    throw new functions.https.HttpsError("failed-precondition", "O saque mínimo é de R$100.");
  }

  const motoboyRef = db.collection("users").doc(motoboyId);
  const motoboySnap = await motoboyRef.get();
  if (!motoboySnap.exists) {
    throw new functions.https.HttpsError("not-found", "Motoboy não encontrado.");
  }

  const motoboy = motoboySnap.data();
  const saldoDisponivel = motoboy.saldoDisponivel || 0;
  if (saldoDisponivel < valor) {
    throw new functions.https.HttpsError("failed-precondition", `Saldo insuficiente. Seu saldo: R$${saldoDisponivel.toFixed(2)}`);
  }

  const saqueDoc = await db.collection("saques").add({
    motoboyId,
    valor,
    status: "pendente",
    criadoEm: FieldValue.serverTimestamp(),
    nomeMotoboy: motoboy.nome || "Motoboy",
    chavePix: motoboy.chavePix,
    pagoEm: null,
  });

  await motoboyRef.update({
    saldoDisponivel: FieldValue.increment(-valor),
    saldoEmSaque: FieldValue.increment(valor),
  });

  console.log(`✅ Saque solicitado: R$${valor} para ${motoboyId}`);
  return { message: "Saque solicitado com sucesso! Será processado toda terça-feira.", saqueId: saqueDoc.id, valor };
});

// ===============================
// 🔹 FUNÇÃO: ZERAR PONTOS E APLICAR BÔNUS TODA SEGUNDA-FEIRA
// ===============================
exports.zerarPontosESetarBonus = onSchedule(
  "0 0 * * 1",
  { timeZone: "America/Sao_Paulo", name: "zerarPontosESetarBonus" },
  async () => {
    console.log("🔄 Iniciando processo semanal: zerar pontos e aplicar bônus...");

    const batch = db.batch();
    const semanaAtual = getSemanaId();
    const rankingRef = db.collection("ranking").doc(semanaAtual);
    const rankingSnap = await rankingRef.get();

    const todosMotoboys = await db.collection("users").where("tipo", "==", "motoboy").get();
    todosMotoboys.forEach((doc) => batch.update(doc.ref, { pontosSemana: 0 }));

    if (rankingSnap.exists) {
      const lista = rankingSnap.data().listaMotoboys || [];
      const top10 = lista.slice(0, 10);
      const top3 = lista.slice(0, 3);

      todosMotoboys.forEach((doc) => batch.update(doc.ref, { bonusKm: 0, bonusValidoAte: null }));

      top3.forEach((item) =>
        batch.update(db.collection("users").doc(item.motoboyId), {
          bonusKm: 0.15,
          bonusValidoAte: FieldValue.serverTimestamp(),
        })
      );

      top10.slice(3).forEach((item) =>
        batch.update(db.collection("users").doc(item.motoboyId), {
          bonusKm: 0.1,
          bonusValidoAte: FieldValue.serverTimestamp(),
        })
      );

      console.log(`✅ Bônus aplicados: Top 3 (${top3.length}) + Top 10 (${top10.length - 3})`);
    }

    await batch.commit();
    console.log(`✅ Processo semanal concluído para ${todosMotoboys.size} motoboys.`);
  }
);
