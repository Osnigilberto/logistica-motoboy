'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, updateDoc, getFirestore } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import MotoboyNivel from '@/app/components/MotoboyNivel';
import styles from './status.module.css';

const storage = getStorage();
const db = getFirestore();

export default function StatusPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Foto e upload
  const [fotoURL, setFotoURL] = useState('/turboLogo.png');
  const [uploading, setUploading] = useState(false);
  const inputFileRef = useRef();

  // Pega perfil do Firestore
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    async function fetchProfile() {
      setLoadingProfile(true);
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfile(data);
        setFotoURL(data.fotoURL || '/avatar-padrao.png');
      }
      setLoadingProfile(false);
    }
    fetchProfile();
  }, [user, router]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);

    try {
      const storageRef = ref(storage, `fotos-perfil/${user.uid}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { fotoURL: url });

      setFotoURL(url);
      setProfile((prev) => ({ ...prev, fotoURL: url }));
    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error);
      alert('Erro ao atualizar foto. Tente novamente.');
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

  return (
    <main className={styles.container}>
      <button onClick={() => router.back()} className={styles.buttonBack}>
        ← Voltar
      </button>

      <section className={styles.perfil}>
        <img
          src={fotoURL}
          alt="Foto de perfil"
          className={styles.fotoPerfil}
          onClick={() => !uploading && inputFileRef.current.click()}
          title="Clique para alterar a foto"
          style={{ cursor: uploading ? 'not-allowed' : 'pointer' }}
          loading="lazy"
          draggable={false}
        />
        <input
          type="file"
          accept="image/*"
          ref={inputFileRef}
          style={{ display: 'none' }}
          onChange={handleFileChange}
          disabled={uploading}
        />
        {uploading && <p className={styles.uploadingText}>Enviando foto...</p>}

        <h1 className={styles.nome}>{profile?.nome || 'Motoboy'}</h1>
      </section>

      <MotoboyNivel />

      {/* Espaço para adicionar mais seções se quiser */}
    </main>
  );
}
