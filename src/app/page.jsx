'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import Navbar from './components/Navbar';
import { FiTruck, FiShield, FiClock, FiEye } from 'react-icons/fi';

export default function Home() {
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
  }, []);

  return (
    <div className={styles.page}>
      <Navbar />

      {/* Hero */}
      <section id="hero" className={styles.hero}>
        <div className={styles.heroContent}>
          <h1>Entregas rápidas e seguras para o seu negócio</h1>
          <p>
            Conectamos você aos melhores <strong>motoboys parceiros</strong> para agilizar suas entregas.
          </p>
          <Link href="/login?role=cliente" className={styles.cta}>
            Comece Agora
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="features" className={styles.features}>
        <div className={styles.feature}>
          <FiClock size={36} className={styles.featureIcon} />
          <h3>Rapidez</h3>
          <p>Motoboys ágeis para garantir entregas no menor tempo possível.</p>
        </div>
        <div className={styles.feature}>
          <FiShield size={36} className={styles.featureIcon} />
          <h3>Segurança</h3>
          <p>Parceiros confiáveis que cuidam de suas encomendas.</p>
        </div>
        <div className={styles.feature}>
          <FiTruck size={36} className={styles.featureIcon} />
          <h3>Monitoramento</h3>
          <p>Acompanhe suas entregas em tempo real pelo nosso app.</p>
        </div>
        <div className={styles.feature}>
          <FiEye size={36} className={styles.featureIcon} />
          <h3>Transparência</h3>
          <p>Informações claras e atualizadas sobre suas entregas.</p>
        </div>
      </section>

      {/* About */}
      <section id="about" className={styles.about}>
        <h2>Sobre nós</h2>
        <p>
          Somos líderes em <strong>logística de motoboy</strong>, oferecendo <strong>tecnologia de ponta</strong> e uma <strong>rede confiável</strong> para o crescimento do seu negócio.
        </p>
      </section>

      {/* Contact */}
      <section id="contact" className={styles.contact}>
        <h2>Fale Conosco</h2>
        <form
          className={styles.contactForm}
          onSubmit={(e) => {
            e.preventDefault();
            alert('Obrigado pelo contato! Em breve retornaremos.');
          }}
        >
          <input type="text" placeholder="Seu nome" required />
          <input type="email" placeholder="Seu email" required />
          <textarea placeholder="Sua mensagem" required rows={4}></textarea>
          <button type="submit">Enviar</button>
        </form>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        © {new Date().getFullYear()} Turbo Express - Todos os direitos reservados.
      </footer>
    </div>
  );
}
