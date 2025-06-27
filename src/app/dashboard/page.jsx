'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthProvider';
import { useRouter } from 'next/navigation';
import styles from './dashboard.module.css';

export default function Dashboard() {
  const { user, profile, loading, logout } = useAuth();
  const router = useRouter();
  const [loadingData, setLoadingData] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!user) router.push('/login');
      else if (!profile) router.push('/completar-perfil');
      else setTimeout(() => setLoadingData(false), 800);
    }
  }, [loading, user, profile, router]);

  if (loading || loadingData) {
    return (
      <main className={styles.container}>
        <div className={styles.spinner} />
        <p className={styles.loadingText}>Carregando painel...</p>
      </main>
    );
  }

  const isCliente = profile.tipo === 'cliente';

  const toggleAvailability = () => {
    setIsAvailable((prev) => !prev);
  };

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>
        Bem-vindo(a), {isCliente ? (profile.nomeEmpresa || profile.nome) : profile.nome}
      </h1>
      <p className={styles.subtext}>Usuário: {profile.tipo}</p>

      <section className={styles.dashboardSection}>
        <div className={styles.card}>
          <h3>Entregas atuais</h3>
          <p>Você não tem entregas em andamento.</p>
        </div>

        {isCliente ? (
          <>
            <div className={styles.card}>
              <h3>Pedidos Ativos</h3>
              <button
                className={styles.cardButton}
                onClick={() => router.push('/clientes/pedidos-ativos')}
              >
                Ver pedidos ativos
              </button>
            </div>
            <div className={styles.card}>
              <h3>Nova Entrega</h3>
              <button
                className={styles.cardButton}
                onClick={() => router.push('/clientes/nova-entrega')}
              >
                Solicitar entrega
              </button>
            </div>
            <div className={styles.card}>
              <h3>Histórico</h3>
              <button
                className={styles.cardButton}
                onClick={() => router.push('/clientes/historico')}
              >
                Ver histórico
              </button>
            </div>
            <div className={styles.card}>
              <h3>Motoboys</h3>
              <button
                className={styles.cardButton}
                onClick={() => router.push('/clientes/motoboys')}
              >
                Ver motoboys
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.card}>
              <h3>Entregas disponíveis</h3>
              <button
                className={styles.cardButton}
                onClick={() => router.push('/motoboy/entregas-disponiveis')}
              >
                Ver entregas disponíveis
              </button>
            </div>
            <div className={styles.card}>
              <h3>Status</h3>
              <p>
                Atual: <strong>{isAvailable ? 'Disponível' : 'Ocupado'}</strong>
              </p>
              <button className={styles.cardButton} onClick={toggleAvailability}>
                {isAvailable ? 'Ficar ocupado' : 'Ficar disponível'}
              </button>
            </div>
            <div className={styles.card}>
              <h3>Histórico</h3>
              <button
                className={styles.cardButton}
                onClick={() => router.push('/motoboy/historico')}
              >
                Ver histórico
              </button>
            </div>
          </>
        )}
      </section>

      <section className={styles.cardsFooter}>
        <button
          className={`${styles.button} ${styles.editButton}`}
          onClick={() => router.push('/completar-perfil?editar=true')}
        >
          Editar Perfil
        </button>
        <button className={`${styles.button} ${styles.logoutButton}`} onClick={logout}>
          Sair
        </button>
      </section>
    </main>
  );
}
