"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  // Controle da classe no body para bloquear scroll ao abrir menu
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("menu-open");
    } else {
      document.body.classList.remove("menu-open");
    }
    // Limpa classe caso componente desmonte
    return () => document.body.classList.remove("menu-open");
  }, [isOpen]);

  function handleLinkClick() {
    setIsOpen(false);
  }

  return (
    <header className={styles.header}>
      <div className={styles.logoWrapper}>
        <img
          src="/turboLogo.png"
          alt="Logo Turbo Express"
          className={styles.logoImg}
        />
      </div>

      <nav className={`${styles.nav} ${isOpen ? styles.open : ""}`}>
        <a href="#hero" className={styles.navLink} onClick={handleLinkClick}>
          Início
        </a>
        <a
          href="#features"
          className={styles.navLink}
          onClick={handleLinkClick}
        >
          Benefícios
        </a>
        <a href="#about" className={styles.navLink} onClick={handleLinkClick}>
          Sobre
        </a>
        <a
          href="#contact"
          className={styles.navLink}
          onClick={handleLinkClick}
        >
          Fale Conosco
        </a>
      </nav>

      <Link href="/login?role=cliente" className={styles.btn}>
        Entrar / Cadastrar
      </Link>
      <Link href="/login?role=motoboy" className={styles.btnAlt}>
        Sou Motoboy
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
