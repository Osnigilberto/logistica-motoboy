'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase/firebaseClient';
import { useAuth } from '@/context/AuthProvider';
import styles from './completarPerfil.module.css';

export default function CompletarPerfil() {
  const { user, profile, loading, fetchProfile } = useAuth();
  const router = useRouter();

  // Estados do formulário
  const [tipoUsuario, setTipoUsuario] = useState('');
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [placaMoto, setPlacaMoto] = useState('');

  const [salvando, setSalvando] = useState(false);

  // ✅ Redireciona se perfil já estiver completo
  useEffect(() => {
    if (!loading && profile?.statusPerfil === 'completo') {
      router.push('/dashboard');
    }
  }, [loading, profile, router]);

  // 🔄 Preenche os campos se já tiver dados parciais
  useEffect(() => {
    if (profile) {
      setTipoUsuario(profile.tipoUsuario || '');
      setNome(profile.nome || '');
      setTelefone(profile.telefone || '');
      setPlacaMoto(profile.placaMoto || '');
    }
  }, [profile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    try {
      setSalvando(true);

      // 🔐 Salva ou atualiza dados no Firestore
      const docRef = doc(db, 'users', user.uid);
      await setDoc(
        docRef,
        {
          email: user.email,
          tipoUsuario,
          nome,
          telefone,
          placaMoto: tipoUsuario === 'motoboy' ? placaMoto : '',
          statusPerfil: 'completo',
        },
        { merge: true }
      );

      // 🔄 Atualiza o contexto com os dados novos
      await fetchProfile(user.uid);

      // 👉 Vai para o dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('❌ Erro ao salvar perfil:', error);
      alert('Erro ao salvar perfil, tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  if (loading) {
    // Tela de carregamento inicial (auth state ainda verificando)
    return (
      <div className={styles.spinnerWrapper}>
        <div className={styles.spinner}></div>
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className={styles.formContainer}>
      <h1 className={styles.title}>Completar Perfil</h1>

      <form onSubmit={handleSubmit}>
        {/* Grupo de radio: tipo de usuário */}
        <div className={styles.radioGroup}>
          <label>
            <input
              type="radio"
              value="motoboy"
              checked={tipoUsuario === 'motoboy'}
              onChange={(e) => setTipoUsuario(e.target.value)}
            />
            Motoboy
          </label>
          <label>
            <input
              type="radio"
              value="empresa"
              checked={tipoUsuario === 'empresa'}
              onChange={(e) => setTipoUsuario(e.target.value)}
            />
            Empresa
          </label>
        </div>

        {/* Nome */}
        <input
          type="text"
          placeholder="Nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className={styles.input}
          required
        />

        {/* Telefone */}
        <input
          type="tel"
          placeholder="Telefone"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          className={styles.input}
          required
        />

        {/* Placa da moto (só aparece se for motoboy) */}
        {tipoUsuario === 'motoboy' && (
          <input
            type="text"
            placeholder="Placa da moto"
            value={placaMoto}
            onChange={(e) => setPlacaMoto(e.target.value)}
            className={styles.input}
            required
          />
        )}

        {/* Botão de salvar */}
        <button
          type="submit"
          className={styles.button}
          disabled={salvando}
        >
          {salvando ? 'Salvando...' : 'Salvar Perfil'}
        </button>
      </form>

      {/* Botão voltar */}
      <button
        type="button"
        className={styles.voltar}
        onClick={() => router.push('/')}
      >
        Voltar
      </button>
    </div>
  );
}
