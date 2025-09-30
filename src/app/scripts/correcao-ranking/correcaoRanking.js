/**
 * 🔹 Script para corrigir o documento de ranking da semana
 * 
 * Uso: node correcaoRanking.js
 * 
 * OBS:
 * 1. Corrige apenas a semana especificada (ex: 2025-W39 → 2025-W40)
 * 2. Não deleta o documento antigo (segurança)
 * 3. Funciona com sua estrutura atual do Firestore
 */

const admin = require("firebase-admin");
const serviceAccount = require("../populate-medals/serviceAccountKey.json");

// Inicializa o Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ===============================
// Configuração: semanas a corrigir
// ===============================
const SEMANA_ANTIGA = "2025-W39"; // ⚠️ Altere se necessário
const SEMANA_NOVA   = "2025-W40"; // ⚠️ Deve ser a semana correta para hoje (30/09/2025)

// ===============================
// Função principal: corrigir ranking
// ===============================
const corrigirRanking = async () => {
  console.log(`🔍 Buscando ranking antigo: ${SEMANA_ANTIGA}`);

  const docAntigo = db.collection("ranking").doc(SEMANA_ANTIGA);
  const snap = await docAntigo.get();

  if (!snap.exists) {
    console.error(`❌ Documento ${SEMANA_ANTIGA} não encontrado.`);
    return;
  }

  const dadosAntigos = snap.data();
  console.log(`📋 Encontrado! Total de motoboys: ${dadosAntigos.listaMotoboys?.length || 0}`);

  // Cria o novo documento com semanaId corrigido
  const docNovo = db.collection("ranking").doc(SEMANA_NOVA);
  await docNovo.set({
    ...dadosAntigos,
    semanaId: SEMANA_NOVA, // 👈 atualiza o campo interno
    corrigidoPorScript: true,
    corrigidoEm: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`✅ Ranking corrigido com sucesso!`);
  console.log(`   Antigo: ${SEMANA_ANTIGA}`);
  console.log(`   Novo:   ${SEMANA_NOVA}`);
  console.log(`⚠️  O documento antigo NÃO foi deletado (segurança).`);
};

// ===============================
// Rodar o script
// ===============================
corrigirRanking()
  .then(() => {
    console.log("🎯 Script finalizado com sucesso!");
    process.exit(0);
  })
  .catch(err => {
    console.error("❌ Erro ao corrigir ranking:", err);
    process.exit(1);
  });