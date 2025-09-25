// ===============================
// 🔹 IMPORTS E CONFIGURAÇÕES INICIAIS
// ===============================
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
require('dotenv').config(); // Carrega variáveis do arquivo .env

admin.initializeApp();
const db = admin.firestore();
const FieldValue = require('firebase-admin').firestore.FieldValue;

// ===============================
// 🔹 FUNÇÃO AUXILIAR: CALCULAR ID DA SEMANA
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
// 🔹 FUNÇÃO: LÓGICA FINALIZAR ENTREGA
// ===============================
async function finalizarEntregaLogic({ entregaId, motoboyId, paradaIndex }) {
  console.log("📦 Finalizando entrega:", { entregaId, motoboyId, paradaIndex });

  if (
    typeof entregaId !== "string" || !entregaId.trim() ||
    typeof motoboyId !== "string" || !motoboyId.trim() ||
    paradaIndex === undefined || paradaIndex === null
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

  const totalParadas = entrega.destinos?.length || 0;
  if (paradaIndex < 0 || paradaIndex >= totalParadas) {
    throw new functions.https.HttpsError("out-of-range", "Parada inválida");
  }

  const paradasStatus = entrega.paradasStatus || Array(totalParadas).fill("pendente");
  paradasStatus[paradaIndex] = "concluída";

  const todasFinalizadas = paradasStatus.every((status) => status === "concluída");

  const totalKm = entrega.kmPercorridos || 0;
  const taxaParada = totalParadas > 1 ? (totalParadas - 1) * 3 : 0;
  const valorEntregaCliente = totalKm <= 5 ? 9 : totalKm * 1.7 + taxaParada;
  const valorEntregaMotoboy = totalKm <= 5 ? 8 : totalKm * 1.5 + taxaParada;
  const lucroPlataforma = valorEntregaCliente - valorEntregaMotoboy;

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

  return { message: `Parada ${paradaIndex + 1} finalizada com sucesso!` };
}

// ===============================
// 🔹 WRAPPER onCall (app Android / client)
// ===============================
exports.finalizarEntrega = functions.https.onCall(async (request) => {
  const data = request.data; // ✅ acessa request.data
  console.log("📥 Dados recebidos no onCall:", JSON.stringify(data, null, 2));
  console.log("🆔 UID do usuário:", request.auth?.uid);

  const { entregaId, motoboyId, paradaIndex } = data || {};

  if (!entregaId || !motoboyId || paradaIndex === undefined || paradaIndex === null) {
    console.error("❌ Parâmetros inválidos detectados:", { entregaId, motoboyId, paradaIndex });
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Parâmetros inválidos: entregaId, motoboyId e paradaIndex são obrigatórios."
    );
  }

  try {
    const result = await finalizarEntregaLogic({ entregaId, motoboyId, paradaIndex });
    console.log("✅ Resultado da finalização:", result);
    return result;
  } catch (err) {
    console.error("❌ Erro onCall durante finalizarEntregaLogic:", err);
    throw err;
  }
});

// ===============================
// 🔹 WRAPPER onRequest (shell / curl)
// ===============================
exports.finalizarEntregaHttp = functions.https.onRequest(async (req, res) => {
  console.log("📥 Dados recebidos no onRequest:", req.body);
  try {
    const result = await finalizarEntregaLogic(req.body);
    res.json(result);
  } catch (err) {
    console.error("❌ Erro onRequest:", err);
    res.status(400).json({ error: err.message });
  }
});

// ===============================
// 🔹 FUNÇÃO: ENVIAR EMAIL DE CONTATO
// ===============================
const { onDocumentCreated } = require("firebase-functions/v2/firestore");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
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
