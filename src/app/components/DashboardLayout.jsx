'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FiMenu,
  FiX,
  FiFileText,
  FiLogOut,
  FiList,
  FiUsers,
  FiTruck,
  FiPackage,
  FiActivity,
  FiClock,
  FiCheckCircle,
  FiUser,
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthProvider';
import styles from './DashboardLayout.module.css';

const navItems = {
  cliente: [
    { href: '/clientes/historico', label: 'Histórico', icon: <FiList /> },
    { href: '/clientes/motoboys', label: 'Motoboys', icon: <FiUsers /> },
    { href: '/clientes/nova-entrega', label: 'Nova Entrega', icon: <FiTruck /> },
    { href: '/clientes/pedidos-ativos', label: 'Pedidos Ativos', icon: <FiPackage /> },

  ],
  motoboy: [
    { href: '/motoboy/entregas-disponiveis', label: 'Entregas Disponíveis', icon: <FiActivity /> },
    { href: '/motoboy/entregas-em-andamento', label: 'Entregas em Andamento', icon: <FiClock /> },
    { href: '/motoboy/historico', label: 'Histórico', icon: <FiList /> },
    { href: '/motoboy/status', label: 'Status', icon: <FiCheckCircle /> },

  ],
};

export default function DashboardLayout({ children, userType = 'cliente' }) {
  const { logout } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = navItems[userType] || [];

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className={styles.layout}>
      {/* Header para mobile */}
      <header className={styles.mobileHeader}>
        <button onClick={() => setMenuOpen(!menuOpen)} className={styles.menuButton}>
          {menuOpen ? <FiX /> : <FiMenu />}
        </button>
      </header>

      {/* Overlay para mobile */}
      {menuOpen && (
        <div className={`${styles.overlay} ${styles.open}`} onClick={() => setMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${menuOpen ? styles.open : ''}`}>
        <div className={styles.sidebarContent}>
          <h2 className={styles.logoDesktop}>Turbo Express</h2>
          <nav className={styles.nav}>
            {links.map((item) => (
              <Link key={item.href} href={item.href} className={styles.navLink}>
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
            {/* Novo botão: Editar Perfil */}
            <Link href="/dashboard/editar-perfil" className={styles.navLink}>
              <FiUser />
              <span>Editar Perfil</span>
            </Link>
          </nav>

          <button onClick={handleLogout} className={styles.logoutButton}>
            <FiLogOut />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <main className={styles.mainContent}>{children}</main>
    </div>
  );
}
