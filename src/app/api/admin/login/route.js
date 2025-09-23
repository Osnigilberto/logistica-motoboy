import { auth, db } from '@/lib/firebaseAdmin'
import crypto from 'crypto'

export async function POST(req) {
  try {
    const { email, senha } = await req.json()

    if (!email || !senha) {
      return new Response(
        JSON.stringify({ error: 'Email e senha são obrigatórios' }),
        { status: 400 }
      )
    }

    // Busca admin pelo email
    const snapshot = await db
      .collection('admin')
      .where('email', '==', email)
      .get()

    if (snapshot.empty) {
      return new Response(
        JSON.stringify({ error: 'Admin não encontrado' }),
        { status: 401 }
      )
    }

    const adminDoc = snapshot.docs[0].data()
    const hashDigitado = crypto
      .createHash('sha256')
      .update(senha)
      .digest('hex')

    if (hashDigitado !== adminDoc.senhaHash) {
      return new Response(
        JSON.stringify({ error: 'Senha incorreta' }),
        { status: 401 }
      )
    }

    // Garante que o usuário exista no Auth
    let userRecord
    try {
      userRecord = await auth.getUserByEmail(email)
    } catch {
      userRecord = await auth.createUser({ email, password: senha })
    }

    // Define custom claim de admin
    await auth.setCustomUserClaims(userRecord.uid, { isAdmin: true })

    // Gera token customizado
    const token = await auth.createCustomToken(userRecord.uid)

    return new Response(JSON.stringify({ token }), { status: 200 })
  } catch (err) {
    console.error('Erro login admin:', err)
    return new Response(
      JSON.stringify({ error: 'Erro ao autenticar admin' }),
      { status: 500 }
    )
  }
}
