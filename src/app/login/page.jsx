'use client';

import { useState } from 'react';
import { useAuth } from '../../context/AuthProvider';
import SocialButton from '../components/SocialButton';
import { FcGoogle } from 'react-icons/fc';
import { useRouter } from 'next/navigation';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebaseClient';
import styles from './login.module.css';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function LoginPage() {
  const { signInWithGoogle } = useAuth(); // Função do contexto para login com Google
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Função de login com Google
  const handleGoogleLogin = async () => {
    setLoading(true);

    try {
      // 🔹 1. Faz login com Google
      const userCredential = await signInWithGoogle(); // Retorna o user do Firebase Auth
      const user = userCredential.user;

      // 🔹 2. Referência do usuário no Firestore
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // 🔹 3a. Se não existir, cria o documento com dados básicos
        await setDoc(userRef, {
          email: user.email,
          nome: user.displayName || '',
          photoURL: user.photoURL || '/avatar-padrao.png',
          tipo: 'motoboy', // Ou 'cliente' se for outro fluxo
          criadoEm: new Date(),
          statusPerfil: 'incompleto', // Marca como perfil incompleto para redirecionar
        });
      } else {
        // 🔹 3b. Se já existir, atualiza o photoURL caso tenha mudado
        await setDoc(
          userRef,
          { photoURL: user.photoURL || '/avatar-padrao.png' },
          { merge: true }
        );
      }

      // 🔹 4. Redireciona para completar perfil se statusPerfil ainda não estiver completo
      if (!userSnap.exists() || userSnap.data().statusPerfil !== 'completo') {
        router.push('/completarPerfil');
      } else {
        // 🔹 Caso já esteja completo, vai para dashboard
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Erro no login com Google:', error);
      toast.error('Erro ao entrar com Google. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Login</h1>

      {/* Botão de login com Google */}
      <SocialButton
        onClick={handleGoogleLogin}
        icon={<FcGoogle size={24} />}
        label="Login com Google"
        className={styles.socialButton}
      >
        {loading ? 'Carregando...' : 'Entrar com Google'}
      </SocialButton>

      {/* Botão de voltar */}
      <button
        onClick={() => router.push('/')}
        className={styles.backButton}
        type="button"
      >
        Voltar para a Home
      </button>

      {/* Toasts de erro ou sucesso */}
      <ToastContainer position="top-right" autoClose={3000} />
    </main>
  );
}
