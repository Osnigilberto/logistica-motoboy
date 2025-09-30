/**
 * 🔹 Script para atualizar pontosSemana de um motoboy (apenas entregas da semana atual)
 * 
 * Uso: node atualizarPontosMotoboy.js
 */

const admin = require("firebase-admin");
const serviceAccount = require("../populate-medals/serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// 🔥 Função ISO 8601 igual ao Cloud Functions
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

// 🔥 Função para obter o início da semana atual (segunda-feira 00:00 UTC)
function getInicioSemana() {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  const inicioSemana = new Date(d);
  inicioSemana.setUTCDate(d.getUTCDate() - (dayNum - 1)); // Segunda-feira
  inicioSemana.setUTCHours(0, 0, 0, 0);
  return inicioSemana;
}

const MOTOBAY_ID = "AAHBYElYHJgVelioK3PejmF7x1o2"; // Juninho Ferreira

async function atualizarPontos() {
  const inicioSemana = getInicioSemana();
  console.log(`📅 Início da semana: ${inicioSemana.toISOString()}`);

  // Conta entregas finalizadas NESTA SEMANA
  const entregasSnap = await db
    .collection("entregas")
    .where("motoboyId", "==", MOTOBAY_ID)
    .where("status", "==", "finalizada")
    .where("finalizadoEm", ">=", admin.firestore.Timestamp.fromDate(inicioSemana))
    .get();

  const entregasEstaSemana = entregasSnap.size;
  const pontosSemana = entregasEstaSemana * 10;

  console.log(`📊 Entregas esta semana: ${entregasEstaSemana}`);
  console.log(`🎯 Pontos a atribuir: ${pontosSemana}`);

  // Atualiza o motoboy
  const motoboyRef = db.collection("users").doc(MOTOBAY_ID);
  const snap = await motoboyRef.get();

  if (!snap.exists) {
    console.error("❌ Motoboy não encontrado:", MOTOBAY_ID);
    return;
  }

  await motoboyRef.update({
    pontosSemana: pontosSemana,
    // Opcional: atualiza entregasConcluidas total (se quiser)
    // entregasConcluidas: admin.firestore.FieldValue.increment(entregasEstaSemana)
  });

  console.log(`✅ Pontos atualizados: ${pontosSemana} pts para ${MOTOBAY_ID}`);
}

atualizarPontos()
  .then(() => {
    console.log("🎯 Script finalizado com sucesso!");
    process.exit(0);
  })
  .catch(err => {
    console.error("❌ Erro ao atualizar pontos:", err);
    process.exit(1);
  });