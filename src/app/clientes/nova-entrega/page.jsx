'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/firebase/firebaseClient';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { FaMapMarkerAlt, FaClock, FaMoneyBillWave } from 'react-icons/fa';
import MapaEntrega from '@/app/components/MapaEntrega';
import { gerarCodigoEntrega } from '@/app/utils/gerarCodigoEntrega';
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
  const [valorMotoboy, setValorMotoboy] = useState(0);
  const [valorPlataforma, setValorPlataforma] = useState(0);

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const [origemLat, setOrigemLat] = useState(null);
  const [origemLng, setOrigemLng] = useState(null);
  const [destinosLat, setDestinosLat] = useState([]);
  const [destinosLng, setDestinosLng] = useState([]);

  // ===============================
  // 🔹 Autenticação do usuário
  // ===============================
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setUserId(user.uid);
      else router.push('/login');
    });
    return () => unsubscribe();
  }, [router]);

  // ===============================
  // 🔹 Funções auxiliares
  // ===============================
  const aplicarMascaraTelefone = (valor) =>
    VMasker.toPattern(valor.replace(/\D/g, ''), '(99) 99999-9999');

  const handleChange = (e) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

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

  // ===============================
  // 🔹 Recalcular valores da entrega
  // ===============================
  useEffect(() => {
  if (!distanciaKm) return; // sai se não houver distância

  // 1️⃣ Taxa de paradas extras (a partir da segunda)
  const taxaParadas = destinos.length > 1 ? (destinos.length - 1) * 3.0 : 0;

  // 2️⃣ Valor do cliente
  let valorCliente = 0;
  if (distanciaKm <= 5) {
    valorCliente = 9; // fixo até 5 km
  } else {
    valorCliente = distanciaKm * 1.7; // acima de 5 km
  }
  valorCliente += taxaParadas; // adiciona paradas extras

  // 3️⃣ Valor do motoboy
  let valorMotoboy = 0;
  if (distanciaKm <= 5) {
    valorMotoboy = 8; // fixo até 5 km
  } else {
    valorMotoboy = distanciaKm * 1.5; // acima de 5 km
  }
  valorMotoboy += taxaParadas; // adiciona paradas extras

  // 4️⃣ Valor da plataforma
  let valorPlataforma = 0;
  if (distanciaKm <= 5) {
    valorPlataforma = 1; // fixo até 5 km
  } else {
    valorPlataforma = distanciaKm * 0.2; // acima de 5 km
  }

  // 5️⃣ Atualiza estados
  setValorCliente(valorCliente);
  setValorMotoboy(valorMotoboy);
  setValorPlataforma(valorPlataforma);
}, [distanciaKm, destinos]);


  // ===============================
  // 🔹 Função para gerar prefixo único da loja
  // ===============================
  const gerarPrefixo = async (nomeEmpresa) => {
    if (!nomeEmpresa) return 'LOJA';

    const nomeLimpo = nomeEmpresa
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '')
      .toUpperCase();

    let prefixo = nomeLimpo.substring(0, 4);

    const prefixDocRef = doc(db, 'lojaPrefixes', prefixo);
    const prefixSnap = await getDoc(prefixDocRef);

    if (!prefixSnap.exists()) {
      await setDoc(prefixDocRef, { contador: 0 });
      return prefixo;
    } else {
      const contador = prefixSnap.data().contador + 1;
      await updateDoc(prefixDocRef, { contador: increment(1) });
      return `${prefixo}${contador}`;
    }
  };

  // ===============================
  // 🔹 Função para gerar código único da entrega
  // Formato: PREFIXO-EANO-0001
  // ===============================
  const gerarCodigoEntrega = async (nomeEmpresa) => {
    const prefixo = await gerarPrefixo(nomeEmpresa);
    const ano = new Date().getFullYear();

    const counterDocRef = doc(db, 'entregaCounters', `${prefixo}-${ano}`);
    const counterSnap = await getDoc(counterDocRef);

    let sequencia = 1;

    if (counterSnap.exists()) {
      sequencia = counterSnap.data().contador + 1;
      await updateDoc(counterDocRef, { contador: increment(1) });
    } else {
      await setDoc(counterDocRef, { contador: 1 });
    }

    const sequenciaFormatada = sequencia.toString().padStart(4, '0');
    return `${prefixo}-E${ano}-${sequenciaFormatada}`;
  };

  // ===============================
  // 🔹 Envio do formulário
  // ===============================
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
      // 1️⃣ Pega o nomeEmpresa do usuário logado
      const clienteSnap = await getDoc(doc(db, 'users', userId));
      const nomeEmpresa = clienteSnap.exists() ? clienteSnap.data().nomeEmpresa || 'LOJA' : 'LOJA';

      // 2️⃣ Gera o código da entrega automaticamente
      const codigoEntrega = await gerarCodigoEntrega(nomeEmpresa);

      // 3️⃣ Cria a entrega com código
      await addDoc(collection(db, 'entregas'), {
      clienteId: userId,
      origem: form.origem.trim(),
      origemLat,           // ✅ Adicionado
      origemLng,           // ✅ Adicionado
      destinos: destinos.map(d => d.trim()),
      destinosLat,         // ✅ Adicionado
      destinosLng,         // ✅ Adicionado
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
      codigoEntrega,
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


  // ===============================
  // 🔹 Renderização
  // ===============================
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
            onInfoChange={({ distanciaKm, tempoMin, custo, origemLat, origemLng, destinosLat, destinosLng }) => {
              setDistanciaKm(distanciaKm);
              setTempoMin(tempoMin);
              setValorCliente(custo); // se quiser manter o cálculo automático
              setOrigemLat(origemLat);
              setOrigemLng(origemLng);
              setDestinosLat(destinosLat);
              setDestinosLng(destinosLng);
              setErro('');
            }}
          />
        </div>
      )}
    </main>
  );
}
