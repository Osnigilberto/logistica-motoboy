'use client';

import { useState } from 'react';
import { useAuth } from '../../context/AuthProvider';
import SocialButton from '../components/SocialButton';
import { FcGoogle } from 'react-icons/fc';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';

export default function LoginPage() {
  const { signInWithGoogle } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    await signInWithGoogle();
    setLoading(false);
  };

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Login</h1>

      <SocialButton
        onClick={handleGoogleLogin}
        icon={<FcGoogle size={24} />}
        label="Login com Google"
        className={styles.socialButton}
      >
        {loading ? 'Carregando...' : 'Entrar com Google'}
      </SocialButton>

      <button
        onClick={() => router.push('/')}
        className={styles.backButton}
        type="button"
      >
        Voltar para a Home
      </button>
    </main>
  );
}
