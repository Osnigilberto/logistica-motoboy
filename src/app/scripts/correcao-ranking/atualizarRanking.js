/**
 * 🔹 Script para atualizar o ranking com base nos pontosSemana atuais dos motoboys
 * 
 * Uso: node atualizarRanking.js
 */

const admin = require("firebase-admin");
const serviceAccount = require("../populate-medals/serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Função ISO 8601
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

async function atualizarRanking() {
  const semanaId = getSemanaId();
  console.log(`🔄 Atualizando ranking para: ${semanaId}`);

  // Busca todos os motoboys
  const motoboysSnap = await db.collection("users").where("tipo", "==", "motoboy").get();

  let listaMotoboys = [];

  for (const doc of motoboysSnap.docs) {
    const data = doc.data();
    const motoboyId = doc.id;
    const nome = data.nome || "Motoboy";
    const pontos = data.pontosSemana || 0;

    if (pontos > 0) { // Só inclui se tiver pontos
      listaMotoboys.push({
        motoboyId,
        nome,
        pontos,
        medalhas: data.medalhas || []
      });
    }
  }

  // Ordena por pontos
  listaMotoboys.sort((a, b) => b.pontos - a.pontos);
  listaMotoboys = listaMotoboys.map((m, i) => ({ ...m, posicao: i + 1 }));

  // Atualiza o ranking
  const rankingRef = db.collection("ranking").doc(semanaId);
  await rankingRef.set({
    semanaId,
    listaMotoboys,
    atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
  });

  console.log(`✅ Ranking atualizado com ${listaMotoboys.length} motoboys`);
}

atualizarRanking()
  .then(() => {
    console.log("🎯 Script finalizado com sucesso!");
    process.exit(0);
  })
  .catch(err => {
    console.error("❌ Erro ao atualizar ranking:", err);
    process.exit(1);
  });