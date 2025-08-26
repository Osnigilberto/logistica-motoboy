'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { app } from '@/firebase/firebaseClient'
import styles from './login.module.css'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const auth = getAuth(app)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, senha)
      const idTokenResult = await userCredential.user.getIdTokenResult()
      if (!idTokenResult.claims.isAdmin) {
        setError('Você não tem permissão de admin.')
        await auth.signOut()
        return
      }
      router.push('/admin')
    } catch (err) {
      console.error(err)
      setError('Login falhou. Verifique email e senha.')
    }
  }

  return (
    <div className={styles.container}>
      <form className={styles.form} onSubmit={handleLogin}>
        <h1>Login Admin</h1>
        {error && <p className={styles.error}>{error}</p>}

        <label>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />

        <label>Senha</label>
        <input type="password" value={senha} onChange={e => setSenha(e.target.value)} required />

        <button type="submit">Entrar</button>
      </form>
    </div>
  )
}
