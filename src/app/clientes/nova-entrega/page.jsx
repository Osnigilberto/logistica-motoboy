'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/firebaseClient';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { FaMapMarkerAlt, FaClock, FaMoneyBillWave } from 'react-icons/fa';
import MapaEntrega from '@/app/components/MapaEntrega';
import styles from './novaEntrega.module.css';

import VMasker from 'vanilla-masker'; // Importa a biblioteca de máscara

export default function NovaEntregaPage() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);

  // Formulário básico (origem, destino, descrição)
  const [form, setForm] = useState({
    origem: '',
    destino: '',
    descricao: '',
  });

  // Nome e telefone do destinatário
  const [destinatario, setDestinatario] = useState('');
  const [telefoneDestinatario, setTelefoneDestinatario] = useState('');

  // Dados calculados da rota
  const [distanciaKm, setDistanciaKm] = useState(null);
  const [tempoMin, setTempoMin] = useState(null);
  const [custo, setCusto] = useState(null);

  // Controle de loading e erros
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  // Carrega usuário logado e redireciona se não estiver logado
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Aplica máscara automática no telefone (formato brasileiro)
  const aplicarMascaraTelefone = (valor) => {
    // Remove tudo que não for número e aplica máscara
    return VMasker.toPattern(valor.replace(/\D/g, ''), '(99) 99999-9999');
  };

  // Atualiza formulário genérico (origem, destino, descrição)
  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Submete o formulário, validando campos e salvando no Firestore
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Valida campos obrigatórios
    if (
      !form.origem ||
      !form.destino ||
      !form.descricao ||
      !destinatario ||
      !telefoneDestinatario
    ) {
      setErro('Preencha todos os campos.');
      return;
    }

    // Valida dados da rota calculada
    if (!distanciaKm || !tempoMin || !custo) {
      setErro('Rota inválida ou incompleta. Corrija os endereços.');
      return;
    }

    setLoading(true);
    setErro('');

    try {
      // Cálculos financeiros com base em níveis
      const markup = 1.18; // 18% de markup sobre o custo
      const valorComMarkup = custo * markup;

      // Define percentual do motoboy conforme custo (simulando níveis)
      let percentualMotoboy = 0.7; // padrão: 70%
      if (custo <= 5) {
        percentualMotoboy = 0.5;
      } else if (custo <= 10) {
        percentualMotoboy = 0.65;
      }

      const valorMotoboy = valorComMarkup * percentualMotoboy;
      const valorPlataforma = valorComMarkup - valorMotoboy;

      // Salva entrega no Firestore
      await addDoc(collection(db, 'entregas'), {
        clienteId: userId,
        origem: form.origem.trim(),
        destino: form.destino.trim(),
        descricao: form.descricao.trim(),
        destinatario: destinatario.trim(),
        telefoneDestinatario: telefoneDestinatario.trim(),
        distanciaKm,
        tempoMin,
        custo,
        valorComMarkup,
        valorMotoboy,
        valorPlataforma,
        percentualMotoboy, // opcional para referência
        status: 'ativo',
        motoboyId: '', // ainda sem motoboy vinculado
        criadoEm: serverTimestamp(),
      });
      router.push('/dashboard');
    } catch (err) {
      console.error('Erro ao criar entrega:', err);
      setErro('Erro ao criar entrega. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.container}>
      {/* Botão de voltar */}
      <button
        type="button"
        onClick={() => router.back()}
        className={styles.buttonBack}
      >
        ← Voltar
      </button>

      <h1 className={styles.title}>Nova Entrega</h1>

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Nome do destinatário */}
        <label className={styles.label}>
          Nome do destinatário:
          <input
            type="text"
            className={styles.input}
            value={destinatario}
            onChange={(e) => setDestinatario(e.target.value)}
            required
            disabled={loading}
          />
        </label>

        {/* Telefone do destinatário com máscara */}
        <label className={styles.label}>
          Telefone do destinatário:
          <input
            type="tel"
            className={styles.input}
            value={telefoneDestinatario}
            onChange={(e) =>
              setTelefoneDestinatario(aplicarMascaraTelefone(e.target.value))
            }
            placeholder="(00) 00000-0000"
            required
            disabled={loading}
          />
        </label>

        {/* Origem */}
        <label className={styles.label}>
          Origem
          <input
            type="text"
            name="origem"
            value={form.origem}
            onChange={handleChange}
            className={styles.input}
            placeholder="Endereço de origem"
            required
            disabled={loading}
          />
        </label>

        {/* Destino */}
        <label className={styles.label}>
          Destino
          <input
            type="text"
            name="destino"
            value={form.destino}
            onChange={handleChange}
            className={styles.input}
            placeholder="Endereço de destino"
            required
            disabled={loading}
          />
        </label>

        {/* Descrição */}
        <label className={styles.label}>
          Descrição
          <textarea
            name="descricao"
            value={form.descricao}
            onChange={handleChange}
            className={styles.textarea}
            placeholder="Descrição da entrega"
            required
            disabled={loading}
          />
        </label>

        {/* Mensagem de erro */}
        {erro && <p className={styles.error}>{erro}</p>}

        {/* Informações da rota e valores calculados */}
        {distanciaKm && tempoMin && custo && (
          <div className={styles.info}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FaMapMarkerAlt />
              <span><strong>Distância estimada:</strong> {distanciaKm.toFixed(2)} km</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FaClock />
              <span><strong>Tempo de entrega:</strong> {tempoMin.toFixed(0)} minutos</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FaMoneyBillWave />
              <span><strong>Valor base:</strong> R$ {custo.toFixed(2)}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FaMoneyBillWave />
              <span><strong>Taxas e operação:</strong> R$ {(custo * 0.18).toFixed(2)}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FaMoneyBillWave />
              <span><strong>Valor total:</strong> R$ {(custo * 1.18).toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Botão de enviar */}
        <div className={styles.buttons}>
          <button
            type="submit"
            disabled={loading || !distanciaKm || !tempoMin || !custo}
            className={styles.buttonPrimary}
          >
            {loading ? 'Criando...' : 'Criar Entrega'}
          </button>
        </div>
      </form>

      {/* Mapa da rota (exibe se origem e destino estiverem preenchidos) */}
      {form.origem && form.destino && (
        <div className={styles.mapaWrapper}>
          <MapaEntrega
            origem={form.origem}
            destino={form.destino}
            onInfoChange={({ distanciaKm, tempoMin, custo }) => {
              setDistanciaKm(distanciaKm);
              setTempoMin(tempoMin);
              setCusto(custo);
              setErro('');
            }}
          />
        </div>
      )}
    </main>
  );
}
