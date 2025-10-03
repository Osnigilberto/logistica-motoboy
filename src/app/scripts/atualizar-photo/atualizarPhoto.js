/**
 * Script para atualizar todos os usuários tipo "motoboy" no Firestore
 * adicionando o campo `photoURL` a partir do Firebase Auth.
 * 
 * 🔹 Rodar com Node.js:
 *    node scripts/atualizar-photo/atualizarPhoto.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
const { getFirestore } = require('firebase-admin/firestore');

// Inicializa Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = getFirestore();
const auth = admin.auth();

async function atualizarPhotoURL() {
  try {
    console.log('Iniciando atualização de photoURL...');

    // 1️⃣ Busca todos os documentos da coleção 'users' com tipo 'motoboy'
    const usersSnapshot = await db.collection('users').where('tipo', '==', 'motoboy').get();

    if (usersSnapshot.empty) {
      console.log('Nenhum motoboy encontrado.');
      return;
    }

    // 2️⃣ Itera sobre cada motoboy
    for (const docSnap of usersSnapshot.docs) {
      const userData = docSnap.data();
      const uid = docSnap.id;

      try {
        // 3️⃣ Busca o usuário no Firebase Auth pelo UID
        const authUser = await auth.getUser(uid);

        // 4️⃣ Determina a photoURL (do Auth ou fallback)
        const photoURL = authUser.photoURL || '/avatar-padrao.png';

        // 5️⃣ Atualiza o Firestore
        await db.collection('users').doc(uid).set(
          { photoURL },
          { merge: true } // Não sobrescreve outros campos
        );

        console.log(`✅ Atualizado ${userData.nome} (${uid}) com photoURL: ${photoURL}`);
      } catch (err) {
        console.error(`❌ Erro ao atualizar UID ${uid}:`, err.message);
      }
    }

    console.log('Atualização de photoURL concluída!');
  } catch (err) {
    console.error('Erro geral do script:', err);
  }
}

// Executa o script
atualizarPhotoURL();
