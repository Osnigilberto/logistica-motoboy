/**
 * 🔹 Script para atualizar o saldo e medalhas de um motoboy
 * 
 * Uso: node atualizarSaldo.js
 * 
 * OBS:
 * 1. Esse script deve ser rodado localmente ou no servidor onde você consegue acessar o Firebase Admin SDK.
 * 2. Ele atualiza apenas o MOTOBY_ID especificado.
 * 3. Não interfere nas funções normais do app.
 */

const admin = require("firebase-admin");
const serviceAccount = require("../populate-medals/serviceAccountKey.json");

// Inicializa o Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// ===============================
// Função auxiliar: concede medalhas automaticamente
// Apenas "Primeira entrega", "Entrega curta" e "Transporte leve"
// ===============================
const concederMedalhasAutomatica = async (motoboyRef, entregasConcluidas, entregasSnap) => {
  const novasMedalhas = [];

  // Primeira entrega
  if (entregasConcluidas >= 1) {
    novasMedalhas.push("Primeira entrega");
  }

  // Verifica entregas curtas (<5 km) e adiciona "Entrega curta" + "Transporte leve"
  entregasSnap.forEach(doc => {
    const entrega = doc.data();
    if ((entrega.kmPercorridos || 0) < 5) {
      novasMedalhas.push("Entrega curta");
      novasMedalhas.push("Transporte leve");
    }
  });

  // Atualiza Firestore usando arrayUnion (evita duplicatas)
  if (novasMedalhas.length > 0) {
    await motoboyRef.update({
      medalhas: FieldValue.arrayUnion(...novasMedalhas)
    });
  }

  return novasMedalhas;
};

// ===============================
// Função principal: atualiza saldo e medalhas
// ===============================
const atualizarSaldoMotoboy = async (motoboyId) => {
  const motoboyRef = db.collection("users").doc(motoboyId); // <-- coleção users
  const motoboySnap = await motoboyRef.get();

  if (!motoboySnap.exists) {
    console.error("❌ Motoboy não encontrado:", motoboyId);
    return;
  }

  // Busca todas as entregas finalizadas desse motoboy
  const entregasSnap = await db.collection("entregas")
    .where("motoboyId", "==", motoboyId)
    .where("status", "==", "finalizada")
    .get();

  let saldo = 0;
  let entregasConcluidas = 0;

  entregasSnap.forEach(doc => {
    const data = doc.data();
    saldo += data.valorEntregaMotoboy || 0;
    entregasConcluidas += 1;
  });

  // Atualiza Firestore com saldo e total de entregas
  await motoboyRef.update({
    saldoDisponivel: saldo,
    entregasConcluidas: entregasConcluidas
  });

  // Atualiza medalhas
  await concederMedalhasAutomatica(motoboyRef, entregasConcluidas, entregasSnap);

  console.log(`✅ Motoboy atualizado: ${motoboyId}`);
  console.log(`Saldo: R$${saldo.toFixed(2)}, Entregas: ${entregasConcluidas}`);
};

// ===============================
// Rodar o script
// ===============================
const MOTOBY_ID = "AAHBYElYHJgVelioK3PejmF7x1o2"; // coloque aqui o motoboyId

atualizarSaldoMotoboy(MOTOBY_ID)
  .then(() => {
    console.log("🎯 Script finalizado com sucesso!");
    process.exit(0);
  })
  .catch(err => {
    console.error("❌ Erro ao atualizar saldo:", err);
    process.exit(1);
  });
