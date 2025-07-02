'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useAuth } from '../../../context/AuthProvider';
import { db } from '../../../firebase/firebaseClient';
import { useRouter } from 'next/navigation';
import styles from './historico.module.css';

const statusColors = {
  entregue: '#4caf50', // verde
  cancelado: '#e53935', // vermelho
  ativo: '#fbc02d',     // amarelo (caso queira usar)
};

export default function Historico() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [pedidos, setPedidos] = useState([]);
  const [error, setError] = useState('');
  const [loadingPedidos, setLoadingPedidos] = useState(true);

  // Filtros e ordenação
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [ordenacao, setOrdenacao] = useState('desc'); // desc = mais recentes primeiro

  // Controla cards expandidos
  const [expandedIds, setExpandedIds] = useState(new Set());

  useEffect(() => {
    if (!loading && user) {
      setLoadingPedidos(true);
      const pedidosRef = collection(db, 'entregas');

      let q;

      // Query adaptada com filtro de status
      if (filtroStatus === 'todos') {
        q = query(
          pedidosRef,
          where('clienteId', '==', user.uid),
          where('status', 'in', ['entregue', 'cancelado']),
          orderBy('dataEntrega', ordenacao)
        );
      } else {
        q = query(
          pedidosRef,
          where('clienteId', '==', user.uid),
          where('status', '==', filtroStatus),
          orderBy('dataEntrega', ordenacao)
        );
      }

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setPedidos(lista);
          setLoadingPedidos(false);
          setError('');
        },
        (err) => {
          console.error(err);
          setError('Erro ao carregar histórico');
          setLoadingPedidos(false);
        }
      );

      return () => unsubscribe();
    }
  }, [user, loading, filtroStatus, ordenacao]);

  // Formata datas para português
  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    let dateObj;
    if (timestamp.toDate) {
      dateObj = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      dateObj = timestamp;
    } else {
      dateObj = new Date(timestamp);
    }
    return dateObj.toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Toggle para expandir / fechar card
  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  if (loading || loadingPedidos) {
    return (
      <main className={styles.container}>
        <div className={styles.spinner}></div>
        <p>Carregando histórico...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className={styles.container}>
        <p className={styles.error}>{error}</p>
      </main>
    );
  }

  if (pedidos.length === 0) {
    return (
      <main className={styles.container} style={{ textAlign: 'center' }}>
        <h1 className={styles.title}>Histórico de Entregas</h1>
        <p style={{ fontSize: '1.1rem', marginTop: '1rem', marginBottom: '2rem' }}>
          Você ainda não possui entregas concluídas.
        </p>
        <button className={styles.button} onClick={() => router.push('/dashboard')}>
          Voltar ao dashboard
        </button>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Histórico de Entregas</h1>

      {/* Filtros */}
      <section className={styles.filters}>
        <label>
          Filtrar por status:{' '}
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            disabled={loadingPedidos}
          >
            <option value="todos">Todos</option>
            <option value="entregue">Entregue</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </label>

        <label style={{ marginLeft: '1.5rem' }}>
          Ordenar por data:{' '}
          <select
            value={ordenacao}
            onChange={(e) => setOrdenacao(e.target.value)}
            disabled={loadingPedidos}
          >
            <option value="desc">Mais recentes primeiro</option>
            <option value="asc">Mais antigos primeiro</option>
          </select>
        </label>
      </section>

      {/* Lista de pedidos */}
      <ul className={styles.list}>
        {pedidos.map((pedido) => {
          const isExpanded = expandedIds.has(pedido.id);
          const corStatus = statusColors[pedido.status] || '#777';

          return (
            <li key={pedido.id} className={styles.card}>
              <div
                className={styles.cardHeader}
                onClick={() => toggleExpand(pedido.id)}
                style={{ cursor: 'pointer' }}
                aria-expanded={isExpanded}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') toggleExpand(pedido.id);
                }}
              >
                <p>
                  <strong>Origem:</strong> {pedido.origem || '-'}
                </p>
                <p>
                  <strong>Destino:</strong> {pedido.destino || '-'}
                </p>
                <p>
                  <strong>Status:</strong>{' '}
                  <span
                    className={styles.badge}
                    style={{
                      backgroundColor: corStatus,
                      color: 'white',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '6px',
                      textTransform: 'uppercase',
                      fontWeight: '600',
                      fontSize: '0.75rem',
                    }}
                  >
                    {pedido.status}
                  </span>
                </p>
                <p>
                  <strong>Data de Entrega:</strong> {formatDate(pedido.dataEntrega)}
                </p>
                <p style={{ color: '#666', fontSize: '0.9rem', fontStyle: 'italic' }}>
                  Clique para {isExpanded ? 'ocultar' : 'ver'} detalhes
                </p>
              </div>

              {isExpanded && (
                <div className={styles.cardDetails}>
                  <p>
                    <strong>Descrição:</strong> {pedido.descricao || '-'}
                  </p>
                  <p>
                    <strong>Motoboy ID:</strong> {pedido.motoboyId || '-'}
                  </p>
                  {/* Pode adicionar mais campos se quiser */}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <button className={styles.button} onClick={() => router.push('/dashboard')}>
        Voltar ao dashboard
      </button>
    </main>
  );
}
