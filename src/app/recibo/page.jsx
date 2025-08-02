'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { db } from '@/firebase/firebaseClient';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import {
  FiFileText,
  FiMapPin,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiArrowRight,
} from 'react-icons/fi';
import styles from './recibos.module.css';

export default function MeusRecibosPage() {
  const { user, userData } = useAuth();
  const [recibos, setRecibos] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!user || !userData) return;

    const fetchRecibos = async () => {
      const entregasRef = collection(db, 'entregas');
      const q = query(
        entregasRef,
        where(userData.tipo === 'cliente' ? 'clienteId' : 'motoboyId', '==', user.uid),
        where('status', '==', 'finalizada'),
        orderBy('dataFinalizacao', 'desc')
      );

      const snapshot = await getDocs(q);
      const dados = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecibos(dados);
      setLoading(false);
    };

    fetchRecibos();
  }, [user, userData]);

  if (loading) {
    return <p className={styles.loading}>Carregando recibos...</p>;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.titulo}><FiFileText /> Meus Recibos</h1>

      {recibos.length === 0 ? (
        <p>Nenhum recibo encontrado.</p>
      ) : (
        <ul className={styles.lista}>
          {recibos.map((entrega) => (
            <li key={entrega.id} className={styles.card}>
              <p><FiMapPin aria-label="Origem" /> <strong>Origem:</strong> {entrega.origem || '—'}</p>
              <p><FiArrowRight aria-label="Destino" /> <strong>Destino:</strong> {entrega.destino || '—'}</p>
              <p><FiClock aria-label="Tempo" /> <strong>Tempo:</strong> {Math.round(entrega.tempoRealMin || entrega.tempoMin)} min</p>
              <p><FiCheckCircle aria-label="Status" /> <strong>Status:</strong> {entrega.status}</p>
              <p><FiDollarSign aria-label="Valor" /> <strong>Valor:</strong> R$ {Number(entrega.valorTotal)?.toFixed(2)}</p>

              <button
                className={styles.botao}
                onClick={() => router.push(`/recibo/${entrega.id}`)}
              >
                Ver Recibo
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
