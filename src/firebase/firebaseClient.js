// Importa funções para inicializar o Firebase e verificar apps existentes
import { initializeApp, getApps } from 'firebase/app'

// Importa os serviços que serão usados: autenticação, Firestore e Storage
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

// Configuração do Firebase obtida das variáveis de ambiente (NEXT_PUBLIC_* deve estar no .env.local)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Opcional: log para verificar se a configuração está correta (remova em produção)
console.log('[Firebase] authDomain:', firebaseConfig.authDomain)

// Inicializa o app Firebase apenas se ainda não tiver sido inicializado (para evitar erros em hot reload do Next.js)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0]

// Inicializa os serviços que vamos usar
const auth = getAuth(app)       // Serviço de autenticação Firebase

if (typeof window !== 'undefined') {
  auth.setPersistence(browserSessionPersistence)
    .catch(console.error)
}
const db = getFirestore(app)    // Banco de dados Firestore
const storage = getStorage(app) // Serviço de Storage para arquivos (upload, download, etc)

// Exporta os objetos para usar em outras partes do projeto
export { app, auth, db, storage }
