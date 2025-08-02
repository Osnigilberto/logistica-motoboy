'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthProvider';
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import styles from './status.module.css';

// Importa instâncias já configuradas
import { db, storage } from '@/firebase/firebaseClient';

// XP necessário por nível (níveis 1 a 10)
const niveisXP = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];

// Função para calcular XP total baseado em distância, tempo e quantidade
function calcularXP(distanciaKm, tempoMin, entregasRealizadas) {
  const xpDistancia = distanciaKm * 10;       // 10 XP por km
  const xpTempo = tempoMin * 0.5;             // 0.5 XP por minuto
  const xpQuantidade = entregasRealizadas * 20; // 20 XP por entrega
  return Math.floor(xpDistancia + xpTempo + xpQuantidade);
}

// Função para calcular nível e progresso % baseado no XP total
function getNivelEProgresso(xpTotal) {
  let nivel = 1;
  let xpAcumulado = 0;

  for (let i = 0; i < niveisXP.length; i++) {
    xpAcumulado += niveisXP[i];
    if (xpTotal < xpAcumulado) {
      const xpAnterior = xpAcumulado - niveisXP[i];
      const progresso = ((xpTotal - xpAnterior) / niveisXP[i]) * 100;
      return { nivel: i + 1, progresso: Math.min(progresso, 100) };
    }
  }
  // Se XP >= total para nível 10
  return { nivel: 10, progresso: 100 };
}

// Medals para gamificação
const MEDALHAS = [
  { id: 'primeira', nome: 'Primeira entrega concluída 🥇' },
  { id: '10semana', nome: '10 entregas na mesma semana 📦' },
  { id: '50kmdia', nome: '50km em um dia 🚀' },
  { id: '5dias', nome: '5 dias seguidos entregando 🔁' },
  { id: 'chuva', nome: 'Entrega em dia de chuva 🌧️' },
];

// Função auxiliar para determinar medalhas ativas (exemplo simplificado)
function calcularMedalhas(entregasFinalizadas, distanciaMaxDia, diasSeguidos, entregasNaSemana, entregasEmDiaChuva) {
  const medalhasAtivas = [];

  if (entregasFinalizadas >= 1) medalhasAtivas.push(MEDALHAS[0]);
  if (entregasNaSemana >= 10) medalhasAtivas.push(MEDALHAS[1]);
  if (distanciaMaxDia >= 50) medalhasAtivas.push(MEDALHAS[2]);
  if (diasSeguidos >= 5) medalhasAtivas.push(MEDALHAS[3]);
  if (entregasEmDiaChuva >= 1) medalhasAtivas.push(MEDALHAS[4]);

  return medalhasAtivas;
}

export default function StatusPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [fotoURL, setFotoURL] = useState('/avatar-padrao.png');
  const [uploading, setUploading] = useState(false);

  const inputFileRef = useRef();

  // Estado para medalhas que serão exibidas
  const [medalhasAtivas, setMedalhasAtivas] = useState([]);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    async function fetchProfileAndXP() {
      setLoadingProfile(true);

      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          setLoadingProfile(false);
          return;
        }

        const data = userSnap.data();

        // Define foto
        const foto = data.fotoURL?.trim()
          ? data.fotoURL
          : '/avatar-padrao.png';
        setFotoURL(foto);

        // Busca entregas finalizadas
        const entregasRef = collection(db, 'entregas');
        const q = query(
          entregasRef,
          where('motoboyId', '==', user.uid),
          where('status', '==', 'finalizada')
        );
        const entregasSnap = await getDocs(q);

        // Variáveis para cálculo de XP e medalhas
        let distanciaTotal = 0;
        let tempoTotal = 0;
        let entregasRealizadas = entregasSnap.size;

        // Para medalhas específicas (exemplos)
        let distanciaMaxDia = 0;
        let diasSeguidos = 0; // Para calcular, você precisaria buscar histórico de datas
        let entregasNaSemana = 0; // Similar, basear em datas e status
        let entregasEmDiaChuva = 0; // Precisaria integrar com API clima (futuro)

        // Somar distância e tempo das entregas finalizadas
        entregasSnap.forEach((doc) => {
          const e = doc.data();
          distanciaTotal += e.distanciaKm || 0;
          tempoTotal += e.tempoMin || 0;

          if (e.distanciaKm > distanciaMaxDia) distanciaMaxDia = e.distanciaKm;

          // TODO: calcular diasSeguidos, entregasNaSemana, entregasEmDiaChuva
        });

        // Calcula XP híbrido
        const xpCalculado = calcularXP(distanciaTotal, tempoTotal, entregasRealizadas);

        // Calcula nível e progresso da barra
        const { nivel, progresso } = getNivelEProgresso(xpCalculado);

        // Atualiza Firestore se necessário
        if (data.xp !== xpCalculado || data.nivel !== nivel) {
          await updateDoc(userRef, {
            xp: xpCalculado,
            nivel: nivel,
          });
        }

        // Calcula medalhas ativas com base em variáveis (simplificado)
        const badges = calcularMedalhas(
          entregasRealizadas,
          distanciaMaxDia,
          diasSeguidos,
          entregasNaSemana,
          entregasEmDiaChuva
        );
        setMedalhasAtivas(badges);

        // Atualiza estado local
        setProfile({
          ...data,
          xp: xpCalculado,
          nivel: nivel,
          progressoXP: progresso,
          distanciaTotal,
          tempoTotal,
          entregasRealizadas,
        });
      } catch (err) {
        console.error('Erro ao buscar perfil e XP:', err);
      } finally {
        setLoadingProfile(false);
      }
    }

    fetchProfileAndXP();
  }, [user, router]);

  // Upload foto
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);

    try {
      const ref = storageRef(storage, `fotos-perfil/${user.uid}`);
      await uploadBytes(ref, file);
      const url = await getDownloadURL(ref);

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { fotoURL: url });

      setFotoURL(url);
      setProfile((prev) => ({ ...prev, fotoURL: url }));
    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error);
      alert('Erro ao atualizar a foto. Tente novamente.');
    }

    setUploading(false);
  };

  if (loadingProfile) {
    return (
      <main className={styles.loadingContainer}>
        <p>Carregando perfil...</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className={styles.loadingContainer}>
        <p>Perfil não encontrado.</p>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <button
        onClick={() => router.back()}
        className={styles.buttonBack}
        aria-label="Voltar para a tela anterior"
      >
        ← Voltar
      </button>

      <section className={styles.perfil}>
        <img
          src={fotoURL}
          alt="Foto de perfil do motoboy"
          className={styles.fotoPerfil}
          onClick={() => !uploading && inputFileRef.current.click()}
          title="Clique para alterar a foto"
          style={{
            cursor: uploading ? 'not-allowed' : 'pointer',
          }}
          loading="lazy"
          draggable={false}
        />
        <input
          type="file"
          accept="image/*"
          ref={inputFileRef}
          onChange={handleFileChange}
          disabled={uploading}
          style={{ display: 'none' }}
        />
        {uploading && <p className={styles.uploadingText}>Enviando foto...</p>}

        <h1 className={styles.nome}>{profile.nome || 'Motoboy'}</h1>

        <p className={styles.dadosXp}>
          Nível: {profile.nivel} — XP: {profile.xp}
        </p>

        {/* Barra de progresso XP */}
        <div className={styles.xpContainer}>
          <div className={styles.progressBar}>
            <div
              className={styles.progress}
              style={{ width: `${profile.progressoXP}%` }}
              aria-label={`Progresso para o próximo nível: ${profile.progressoXP.toFixed(
                1
              )}%`}
              role="progressbar"
            />
          </div>
        </div>

        {/* Medalhas */}
        <div className={styles.badges}>
          {medalhasAtivas.length > 0 ? (
            medalhasAtivas.map((badge) => (
              <div key={badge.id} className={styles.badge}>
                {badge.nome}
              </div>
            ))
          ) : (
            <p className={styles.semBadges}>Sem conquistas ainda</p>
          )}
        </div>
      </section>
    </main>
  );
}
