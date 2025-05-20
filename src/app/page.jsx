"use client";
import { useEffect } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import Navbar from "./components/Navbar";

export default function Home() {
  useEffect(() => {
    // Scroll suave nativo
    document.documentElement.style.scrollBehavior = "smooth";
  }, []);

  return (
    <div className={styles.page}>
      <Navbar />

      <section id="hero" className={styles.hero}>
        <div className={styles.heroContent}>
          <h1>Entregas rápidas e seguras para o seu negócio</h1>
          <p>Conectamos você aos melhores motoboys parceiros para agilizar suas entregas.</p>
          <Link href="/cadastro" className={styles.cta}>
            Comece Agora
          </Link>
        </div>
      </section>

      <section id="features" className={styles.features}>
        <div className={styles.feature}>
          <h3>Rapidez</h3>
          <p>Motoboys ágeis para garantir entregas no menor tempo.</p>
        </div>
        <div className={styles.feature}>
          <h3>Segurança</h3>
          <p>Parceiros confiáveis que cuidam das suas encomendas.</p>
        </div>
        <div className={styles.feature}>
          <h3>Monitoramento</h3>
          <p>Acompanhe suas entregas em tempo real com nosso app.</p>
        </div>
        <div className={styles.feature}>
          <h3>Transparência</h3>
          <p>Informações claras em tempo real sobre suas entregas.</p>
        </div>
      </section>

      <section id="about" className={styles.about}>
        <h2>Sobre nós</h2>
        <p>
          Somos líderes em logística de motoboy, oferecendo tecnologia de ponta e uma rede confiável para o seu negócio crescer.
        </p>
      </section>

      <section id="contact" className={styles.contact}>
        <h2>Fale Conosco</h2>
        <form
          className={styles.contactForm}
          onSubmit={(e) => {
            e.preventDefault();
            alert("Obrigado pelo contato! Em breve retornaremos.");
          }}
        >
          <input type="text" placeholder="Seu nome" required />
          <input type="email" placeholder="Seu email" required />
          <textarea placeholder="Sua mensagem" required rows={4}></textarea>
          <button type="submit">Enviar</button>
        </form>
      </section>

      <footer className={styles.footer}>
        © {new Date().getFullYear()} Logística Motoboy - Todos os direitos reservados.
      </footer>
    </div>
  );
}
