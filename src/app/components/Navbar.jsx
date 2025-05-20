// src/components/Navbar.jsx
"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./Navbar.module.css"; // deve estar correto

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  function handleLinkClick() {
    setIsOpen(false);
  }

  return (
    <header className={styles.header}>
      <div className={styles.logo}>Logística Motoboy</div>

      <nav className={`${styles.nav} ${isOpen ? styles.open : ""}`}>
        <a href="#hero" className={styles.navLink} onClick={handleLinkClick}>
          Início
        </a>
        <a href="#features" className={styles.navLink} onClick={handleLinkClick}>
          Benefícios
        </a>
        <a href="#about" className={styles.navLink} onClick={handleLinkClick}>
          Sobre
        </a>
        <a href="#contact" className={styles.navLink} onClick={handleLinkClick}>
          Fale Conosco
        </a>
      </nav>

      {/* IMPORTANTE: Next.js Link não aceita className diretamente */}
      <Link href="/login" legacyBehavior>
        <a className={styles.btn}>Entrar / Cadastrar</a>
      </Link>

      <button
        className={`${styles.hamburger} ${isOpen ? styles.open : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Menu"
        aria-expanded={isOpen}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
    </header>
  );
}
