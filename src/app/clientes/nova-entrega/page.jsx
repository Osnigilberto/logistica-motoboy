'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/firebaseClient';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { FaMapMarkerAlt, FaClock, FaMoneyBillWave } from 'react-icons/fa';
import MapaEntrega from '@/app/components/MapaEntrega';
import styles from './novaEntrega.module.css';
import VMasker from 'vanilla-masker';

export default function NovaEntregaPage() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);

  const [form, setForm] = useState({ origem: '', descricao: '' });
  const [destinos, setDestinos] = useState(['']);
  const [destinatarios, setDestinatarios] = useState([{ nome: '', telefone: '' }]);

  const [distanciaKm, setDistanciaKm] = useState(null);
  const [tempoMin, setTempoMin] = useState(null);

  const [valorCliente, setValorCliente] = useState(null);
  const [valorMotoboy, setValorMotoboy] = useState(null);
  const [valorPlataforma, setValorPlataforma] = useState(null);

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  // Autenticação
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setUserId(user.uid);
      else router.push('/login');
    });
    return () => unsubscribe();
  }, [router]);

  const aplicarMascaraTelefone = (valor) =>
    VMasker.toPattern(valor.replace(/\D/g, ''), '(99) 99999-9999');

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleDestinoChange = (index, value) => {
    const novosDestinos = [...destinos];
    novosDestinos[index] = value;
    setDestinos(novosDestinos);
  };

  const adicionarDestino = () => {
    setDestinos([...destinos, '']);
    setDestinatarios([...destinatarios, { nome: '', telefone: '' }]);
  };

  const removerDestino = (index) => {
    setDestinos(destinos.filter((_, i) => i !== index));
    setDestinatarios(destinatarios.filter((_, i) => i !== index));
  };

  const handleDestinatarioChange = (index, campo, valor) => {
    const novos = [...destinatarios];
    novos[index][campo] = valor;
    setDestinatarios(novos);
  };

  // Recalcular valores sempre que distância ou destinos mudam
  useEffect(() => {
    if (!distanciaKm) return;
    const taxaParadas = destinos.length > 1 ? (destinos.length - 1) * 3.0 : 0;
    const cliente = distanciaKm * 1.7 + taxaParadas;
    const motoboy = distanciaKm * 1.5 + taxaParadas;
    const plataforma = cliente - motoboy;
    setValorCliente(cliente);
    setValorMotoboy(motoboy);
    setValorPlataforma(plataforma);
  }, [distanciaKm, destinos]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validação
    for (let i = 0; i < destinos.length; i++) {
      if (!destinos[i] || !destinatarios[i].nome || !destinatarios[i].telefone) {
        setErro('Preencha todos os campos de todos os destinos.');
        return;
      }
    }
    if (!form.origem || !form.descricao) {
      setErro('Preencha todos os campos obrigatórios.');
      return;
    }
    if (!distanciaKm || !tempoMin || !valorCliente) {
      setErro('Rota inválida ou incompleta.');
      return;
    }

    setLoading(true);
    setErro('');
    try {
      await addDoc(collection(db, 'entregas'), {
        clienteId: userId,
        origem: form.origem.trim(),
        destinos: destinos.map(d => d.trim()),
        destinatarios: destinatarios.map(d => ({ nome: d.nome.trim(), telefone: d.telefone.trim() })),
        descricao: form.descricao.trim(),
        distanciaKm,
        tempoMin,
        valorCliente,
        valorMotoboy,
        valorPlataforma,
        numeroParadas: destinos.length,
        status: 'ativo',
        motoboyId: '',
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
      <button type="button" onClick={() => router.back()} className={styles.buttonBack}>← Voltar</button>

      <h1 className={styles.title}>Nova Entrega</h1>

      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.label}>
          Origem
          <input type="text" name="origem" value={form.origem} onChange={handleChange} className={styles.input} placeholder="Endereço de origem" required disabled={loading}/>
        </label>

        {destinos.map((dest, index) => (
          <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <input type="text" placeholder={`Destino ${index + 1}`} value={dest} onChange={e => handleDestinoChange(index, e.target.value)} className={styles.input} required disabled={loading}/>
            <input type="text" placeholder="Destinatário" value={destinatarios[index].nome} onChange={e => handleDestinatarioChange(index, 'nome', e.target.value)} className={styles.input} required disabled={loading}/>
            <input type="tel" placeholder="Telefone" value={destinatarios[index].telefone} onChange={e => handleDestinatarioChange(index, 'telefone', aplicarMascaraTelefone(e.target.value))} className={styles.input} required disabled={loading}/>
            {index > 0 && <button type="button" onClick={() => removerDestino(index)} disabled={loading}>❌</button>}
          </div>
        ))}
        <button type="button" onClick={adicionarDestino} disabled={loading} className={styles.buttonSecondary}>+ Adicionar parada</button>

        <label className={styles.label}>
          Descrição
          <textarea name="descricao" value={form.descricao} onChange={handleChange} className={styles.textarea} placeholder="Descrição da entrega" required disabled={loading}/>
        </label>

        {erro && <p className={styles.error}>{erro}</p>}

        {distanciaKm && tempoMin && valorCliente && (
          <div className={styles.info}>
            <div><FaMapMarkerAlt /> <strong>Distância:</strong> {distanciaKm.toFixed(2)} km</div>
            <div><FaClock /> <strong>Tempo estimado:</strong> {tempoMin.toFixed(0)} min</div>
            <div><FaMoneyBillWave /> <strong>Total Cliente:</strong> R$ {valorCliente.toFixed(2)}</div>
            <div><FaMoneyBillWave /> <strong>Motoboy recebe:</strong> R$ {valorMotoboy.toFixed(2)}</div>
            <div><FaMoneyBillWave /> <strong>Plataforma:</strong> R$ {valorPlataforma.toFixed(2)}</div>
            {destinos.length > 1 && <div><FaMoneyBillWave /> <strong>Taxa de paradas:</strong> R$ {(destinos.length - 1) * 3}</div>}
          </div>
        )}

        <div className={styles.buttons}>
          <button type="submit" disabled={loading || !distanciaKm || !tempoMin || !valorCliente} className={styles.buttonPrimary}>
            {loading ? 'Criando...' : 'Criar Entrega'}
          </button>
        </div>
      </form>

      {form.origem && destinos.length > 0 && (
        <div className={styles.mapaWrapper}>
          <MapaEntrega
            origem={form.origem}
            destinos={destinos}
            onInfoChange={({ distanciaKm, tempoMin }) => {
              setDistanciaKm(distanciaKm);
              setTempoMin(tempoMin);
              setErro('');
            }}
          />
        </div>
      )}
    </main>
  );
}
