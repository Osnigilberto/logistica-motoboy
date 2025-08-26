'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { getAuth, signOut } from 'firebase/auth'
import { useState } from 'react'
import styles from './sidebar.module.css'
import { app } from '@/firebase/firebaseClient'
import { FiMenu, FiX } from 'react-icons/fi' // ícones para hamburger

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const auth = getAuth(app)
  const [isOpen, setIsOpen] = useState(false)

  const links = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/usuarios', label: 'Usuários' },
    { href: '/admin/vinculos', label: 'Vínculos' },
    { href: '/admin/entregas', label: 'Entregas' },
    { href: '/admin/ranking', label: 'Ranking' },
    { href: '/admin/configuracoes', label: 'Configurações' },
  ]

  const handleLogout = async () => {
    await signOut(auth)
    router.push('/admin/login')
    setIsOpen(false)
  }

  // Função para marcar item ativo, mesmo se tiver barra final
  const isActive = (href) => {
    if (!pathname) return false
    const cleanPath = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
    return cleanPath === href
  }

  return (
    <>
      {/* Hamburger menu para mobile */}
      <button className={styles.hamburger} onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <FiX size={24} /> : <FiMenu size={24} />}
      </button>

      <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
        <h2 className={styles.logo}>Painel Administrativo</h2>
        <nav className={styles.nav}>
          <ul>
            {links.map(link => (
              <li
                key={link.href}
                className={isActive(link.href) ? styles.active : ''}
                onClick={() => setIsOpen(false)}
              >
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <button className={styles.logout} onClick={handleLogout}>
          Sair
        </button>
      </aside>
    </>
  )
}
