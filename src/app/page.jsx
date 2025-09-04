'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import Navbar from './components/Navbar';
import { FiTruck, FiShield, FiClock, FiEye } from 'react-icons/fi';

// Firebase
import { db } from '@/firebase/firebaseClient';
import { collection, addDoc } from 'firebase/firestore';

// React Toastify
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Home() {
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nome = e.target.nome.value;
    const email = e.target.email.value;
    const mensagem = e.target.mensagem.value;

    try {
      await addDoc(collection(db, "contatos"), {
        nome,
        email,
        mensagem,
        criadoEm: new Date(),
      });

      toast.success("Sua mensagem foi registrada com sucesso. Você receberá uma resposta em breve.");
      e.target.reset();
    } catch (err) {
      console.error(err);
      toast.error("Ocorreu um erro ao enviar sua mensagem. Por favor, tente novamente.");
    }
  };

  return (
    <div className={styles.page}>
      <Navbar />

      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme="colored"
      />

      {/* Hero Section */}
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

      {/* Features Section */}
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

      {/* Pricing Section */}
      <section id="pricing" className={styles.pricing}>
        <h2>Planos para sua Loja</h2>
        <div className={styles.pricingGrid}>

          {/* Básico */}
          <div className={styles.plan}>
            <h3>Básico</h3>
            <p>Ideal para padarias, marmitarias e pequenos negócios</p>
            <div className={styles.price}>R$ 49/mês</div>
            <ul>
              <li>Até 200 entregas mensais</li>
              <li>Excedente: R$3,00 por entrega extra <span className={styles.tooltip}>?</span></li>
              <li>Suporte por e-mail</li>
              <li>Monitoramento básico</li>
            </ul>
            <button>Assinar</button>
          </div>

          {/* Essencial */}
          <div className={styles.plan}>
            <h3>Essencial</h3>
            <p>Perfeito para restaurantes médios e pizzarias</p>
            <div className={styles.price}>R$ 99/mês</div>
            <ul>
              <li>Até 500 entregas mensais</li>
              <li>Excedente: R$3,00 por entrega extra <span className={styles.tooltip}>?</span></li>
              <li>Suporte via chat</li>
              <li>Monitoramento em tempo real</li>
            </ul>
            <button>Assinar</button>
          </div>

          {/* Intermediário */}
          <div className={styles.plan}>
            <h3>Intermediário</h3>
            <p>Para quem precisa de mais controle e relatórios avançados</p>
            <div className={styles.price}>R$ 149/mês</div>
            <ul>
              <li>Até 1.000 entregas mensais</li>
              <li>Excedente: R$3,00 por entrega extra <span className={styles.tooltip}>?</span></li>
              <li>Relatórios avançados</li>
              <li>Cupons de desconto</li>
              <li>Personalização básica</li>
            </ul>
            <button>Assinar</button>
          </div>

          {/* Premium */}
          <div className={`${styles.plan} ${styles.premium}`}>
            <h3>Premium</h3>
            <p>O mais popular entre os clientes</p>
            <div className={styles.price}>R$ 199/mês</div>
            <ul>
              <li>Até 3.000 entregas mensais</li>
              <li>Excedente: R$3,00 por entrega extra <span className={styles.tooltip}>?</span></li>
              <li>Entregas praticamente ilimitadas</li>
              <li>Suporte prioritário</li>
              <li>Relatórios avançados</li>
            </ul>
            <button>Assinar</button>
          </div>

        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className={styles.contact}>
        <h2>Fale Conosco</h2>
        <form className={styles.contactForm} onSubmit={handleSubmit}>
          <input name="nome" type="text" placeholder="Seu nome" required />
          <input name="email" type="email" placeholder="Seu email" required />
          <textarea name="mensagem" placeholder="Sua mensagem" required rows={4}></textarea>
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
