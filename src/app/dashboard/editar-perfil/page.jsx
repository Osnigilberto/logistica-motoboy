'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthProvider';
import styles from './editarPerfil.module.css';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function EditarPerfil() {
  const { user, profile, loading, fetchProfile } = useAuth();
  const router = useRouter();

  const [dados, setDados] = useState({
    nome: '',
    nomeEmpresa: '',
    tipo: 'cliente',
    documento: '',
    telefone: '',
    rua: '',
    numero: '',
    cidade: '',
    estado: '',
    pais: '',
    responsavel: '',
    contatoResponsavel: '',
  });

  const [saving, setSaving] = useState(false);

  // Preencher dados do profile
  useEffect(() => {
    if (!loading && user && profile) {
      setDados({
        nome: profile.nome || '',
        nomeEmpresa: profile.nomeEmpresa || '',
        tipo: profile.tipo || 'cliente',
        documento: profile.documento || '',
        telefone: profile.telefone || '',
        rua: profile.endereco?.rua || '',
        numero: profile.endereco?.numero || '',
        cidade: profile.endereco?.cidade || '',
        estado: profile.endereco?.estado || '',
        pais: profile.endereco?.pais || '',
        responsavel: profile.responsavel || '',
        contatoResponsavel: profile.contatoResponsavel || '',
      });
    }
  }, [loading, user, profile]);

  // Máscaras de documento e telefone
  const aplicarMascaraDocumento = (value) => {
    const v = value.replace(/\D/g, '');
    return dados.tipo === 'cliente'
      ? v.replace(/^(\d{2})(\d)/, '$1.$2')
         .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
         .replace(/\.(\d{3})(\d)/, '.$1/$2')
         .replace(/(\d{4})(\d)/, '$1-$2')
         .slice(0, 18)
      : v.replace(/(\d{3})(\d)/, '$1.$2')
         .replace(/(\d{3})(\d)/, '$1.$2')
         .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
         .slice(0, 14);
  };

  const aplicarMascaraTelefone = (value) => {
    const v = value.replace(/\D/g, '');
    return v.length > 10
      ? v.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3')
      : v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
  };

  // Atualizar estado ao digitar
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'documento') {
      setDados((prev) => ({ ...prev, documento: aplicarMascaraDocumento(value) }));
    } else if (name === 'telefone' || name === 'contatoResponsavel') {
      setDados((prev) => ({ ...prev, [name]: aplicarMascaraTelefone(value) }));
    } else {
      setDados((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Validação documento
  const validarDocumento = (valor) => {
    const apenasDigitos = valor.replace(/\D/g, '');
    return dados.tipo === 'cliente' ? apenasDigitos.length === 14 : apenasDigitos.length === 11;
  };

  // Salvar alterações
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (dados.tipo === 'cliente' && !dados.nomeEmpresa.trim()) {
      toast.error('Nome da empresa é obrigatório.');
      return;
    }

    if (dados.tipo === 'motoboy' && !dados.nome.trim()) {
      toast.error('Nome é obrigatório.');
      return;
    }

    if (!validarDocumento(dados.documento)) {
      toast.error(dados.tipo === 'cliente' ? 'CNPJ inválido.' : 'CPF inválido.');
      return;
    }

    setSaving(true);

    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('@/firebase/firebaseClient');

      await setDoc(
        doc(db, 'users', user.uid),
        {
          email: user.email,
          tipo: dados.tipo,
          nome: dados.tipo === 'motoboy' ? dados.nome : '',
          nomeEmpresa: dados.tipo === 'cliente' ? dados.nomeEmpresa : '',
          documento: dados.documento,
          telefone: dados.telefone,
          endereco: {
            rua: dados.rua,
            numero: dados.numero,
            cidade: dados.cidade,
            estado: dados.estado,
            pais: dados.pais,
          },
          responsavel: dados.responsavel,
          contatoResponsavel: dados.contatoResponsavel,
          statusPerfil: 'completo',
        },
        { merge: true }
      );

      await fetchProfile(user.uid);
      toast.success('Perfil atualizado com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar perfil.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
    return (
      <main className={styles.spinnerWrapper}>
        <div className={styles.spinner} />
        <p>Carregando...</p>
      </main>
    );
  }

  return (
    <>
      <main className={styles.container}>
        {/* Botão de voltar no topo */}
        <button type="button" onClick={() => router.back()} className={styles.buttonBack}>
          ← Voltar
        </button>

        <h2 className={styles.title}>Editar Perfil</h2>

        <form onSubmit={handleSubmit} className={styles.formContainer}>
          {/* Tipo: cliente ou motoboy */}
          <div className={styles.radioGroup}>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="tipo"
                value="cliente"
                checked={dados.tipo === 'cliente'}
                onChange={handleChange}
                disabled={saving}
              />
              Cliente
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="tipo"
                value="motoboy"
                checked={dados.tipo === 'motoboy'}
                onChange={handleChange}
                disabled={saving}
              />
              Motoboy
            </label>
          </div>

          {/* Nome ou Nome da empresa */}
          {dados.tipo === 'cliente' ? (
            <input
              name="nomeEmpresa"
              placeholder="Nome da empresa"
              value={dados.nomeEmpresa}
              onChange={handleChange}
              className={styles.input}
              required
              disabled={saving}
            />
          ) : (
            <input
              name="nome"
              placeholder="Seu nome completo"
              value={dados.nome}
              onChange={handleChange}
              className={styles.input}
              required
              disabled={saving}
            />
          )}

          {/* Documento e telefone */}
          <input
            name="documento"
            placeholder={dados.tipo === 'cliente' ? 'CNPJ' : 'CPF'}
            value={dados.documento}
            onChange={handleChange}
            className={styles.input}
            required
            maxLength={18}
            disabled={saving}
          />
          <input
            name="telefone"
            placeholder="Telefone"
            value={dados.telefone}
            onChange={handleChange}
            className={styles.input}
            maxLength={15}
            disabled={saving}
          />

          {/* Endereço */}
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Endereço</legend>
            {['rua', 'numero', 'cidade', 'estado', 'pais'].map((field) => (
              <input
                key={field}
                name={field}
                placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                value={dados[field]}
                onChange={handleChange}
                className={styles.input}
                disabled={saving}
              />
            ))}
          </fieldset>

          {/* Responsável */}
          <input
            name="responsavel"
            placeholder="Responsável"
            value={dados.responsavel}
            onChange={handleChange}
            className={styles.input}
            disabled={saving}
          />
          <input
            name="contatoResponsavel"
            placeholder="Contato do responsável"
            value={dados.contatoResponsavel}
            onChange={handleChange}
            className={styles.input}
            disabled={saving}
          />

          {/* Botão salvar */}
          <button type="submit" className={styles.button} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </form>

        <ToastContainer position="top-right" autoClose={3000} />
      </main>
    </>
  );
}
