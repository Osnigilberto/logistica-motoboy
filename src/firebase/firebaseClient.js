// Importa os métodos para inicializar o Firebase e obter instâncias já existentes
import { initializeApp, getApps } from 'firebase/app'

// Importa os serviços que você usa: Auth e Firestore
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Configuração do Firebase usando variáveis de ambiente públicas
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Opcional: log para garantir que a configuração está carregando corretamente
console.log('[Firebase] authDomain:', firebaseConfig.authDomain)

// Inicializa o app Firebase apenas se ainda não tiver sido iniciado (evita erro em hot reload)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0]

// Instancia os serviços de autenticação e banco de dados
const auth = getAuth(app)
const db = getFirestore(app)

// Exporta tudo o que for necessário em outros lugares
export { app, auth, db }
