'use client';

import { useEffect } from 'react';
import { useAuth } from '../../context/AuthProvider';
import { useRouter } from 'next/navigation';
import styles from './dashboard.module.css';

export default function Dashboard() {
  const { user, profile, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (!profile) {
        router.push('/completar-perfil');
      }
    }
  }, [loading, user, profile, router]);

  if (loading || !profile) {
    return (
      <main className={styles.container}>
        <p>Carregando seu dashboard...</p>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <h1>Bem-vindo, {profile.nome}!</h1>
      <p>
        Tipo: {profile.tipo.charAt(0).toUpperCase() + profile.tipo.slice(1)}
      </p>

      <div className={styles.buttons}>
        <button onClick={() => router.push('/completar-perfil')}>
          Editar Perfil
        </button>
        <button onClick={logout} className={styles.logoutButton}>
          Sair
        </button>
      </div>
    </main>
  );
}
