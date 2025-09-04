import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/firebase/firebaseClient';

// Função para remover acentos e espaços e pegar as primeiras 4 letras
const gerarPrefixo = (nomeEmpresa) => {
  if (!nomeEmpresa) return 'LOJA';
  let texto = nomeEmpresa
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/\s+/g, '') // remove espaços
    .toUpperCase();
  return texto.slice(0, 4);
};

// Função principal
export async function gerarCodigoEntrega(nomeEmpresa) {
  const anoAtual = new Date().getFullYear();
  
  // 1️⃣ Prefixo
  let prefixoBase = gerarPrefixo(nomeEmpresa);
  let prefixo = prefixoBase;

  // 2️⃣ Checa se já existe duplicidade de prefixo
  const prefixDocRef = doc(db, 'lojaPrefixes', prefixo);
  const prefixSnap = await getDoc(prefixDocRef);

  if (prefixSnap.exists()) {
    const count = prefixSnap.data().count || 1;
    prefixo = `${prefixo}${count + 1}`; // ex: PADA2
    await updateDoc(prefixDocRef, { count: increment(1) });
  } else {
    await setDoc(prefixDocRef, { count: 1 });
  }

  // 3️⃣ Sequência por ano
  const counterId = `${prefixo}-${anoAtual}`;
  const counterRef = doc(db, 'entregaCounters', counterId);
  const counterSnap = await getDoc(counterRef);

  let sequencia = 1;
  if (counterSnap.exists()) {
    sequencia = (counterSnap.data().contador || 0) + 1;
    await updateDoc(counterRef, { contador: increment(1) });
  } else {
    await setDoc(counterRef, { contador: 1 });
  }

  // 4️⃣ Formata com 4 dígitos
  const sequenciaStr = sequencia.toString().padStart(4, '0');

  return `${prefixo}-E${anoAtual}-${sequenciaStr}`;
}
