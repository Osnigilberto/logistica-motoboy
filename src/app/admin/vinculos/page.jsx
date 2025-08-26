'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where 
} from 'firebase/firestore'
import { app } from '@/firebase/firebaseClient'
import styles from './vinculos.module.css'
import { useAuth } from '@/context/AuthProvider'

const db = getFirestore(app)
const ADMIN_UID = 'TkIu3cI2itQ2K4xAkHQ9l9KTvp83'

export default function Vinculos() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [vinculos, setVinculos] = useState([])
  const [usuarios, setUsuarios] = useState([]) // motoboys
  const [clientes, setClientes] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editVinculo, setEditVinculo] = useState(null)
  const [form, setForm] = useState({
    clienteId: '',
    motoboyId: '',
    status: 'ativo',
    criadoEm: null
  })

  const isAdmin = user?.uid === ADMIN_UID

  // Buscar dados do Firebase
  const fetchData = async () => {
    if (!isAdmin) return
    try {
      const usuariosSnap = await getDocs(query(collection(db, 'users'), where('tipo', '==', 'motoboy')))
      setUsuarios(usuariosSnap.docs.map(d => ({ id: d.id, ...d.data() })))

      const clientesSnap = await getDocs(query(collection(db, 'users'), where('tipo', '==', 'cliente')))
      setClientes(clientesSnap.docs.map(d => ({ id: d.id, ...d.data() })))

      const vinculosSnap = await getDocs(collection(db, 'vinculos'))
      setVinculos(vinculosSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (error) {
      console.error('Erro ao buscar dados:', error)
    }
  }

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }
    if (user) fetchData()
  }, [user, loading])

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  // Abrir modal
  const handleOpenModal = (vinculo = null) => {
    if (!isAdmin) return alert('Apenas admins podem gerenciar vínculos')
    
    if (vinculo) {
      setEditVinculo(vinculo)
      setForm({
        clienteId: vinculo.clienteId || '',
        motoboyId: vinculo.motoboyId || '',
        status: vinculo.status || 'ativo',
        criadoEm: vinculo.criadoEm || null
      })
    } else {
      setEditVinculo(null)
      setForm({
        clienteId: '',
        motoboyId: '',
        status: 'ativo',
        criadoEm: null
      })
    }
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setEditVinculo(null)
    setForm({
      clienteId: '',
      motoboyId: '',
      status: 'ativo',
      criadoEm: null
    })
  }

  // Adicionar ou atualizar vínculo com validação de duplicidade
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.clienteId || !form.motoboyId) return alert('Preencha cliente e motoboy')

    // Checar duplicidade
    const existe = vinculos.some(v => 
      v.clienteId === form.clienteId && 
      v.motoboyId === form.motoboyId &&
      v.id !== editVinculo?.id // Ignorar se for edição do próprio vínculo
    )
    if (existe) return alert('Este vínculo já existe para essa loja e motoboy!')

    try {
      if (editVinculo) {
        await updateDoc(doc(db, 'vinculos', editVinculo.id), form)
      } else {
        await addDoc(collection(db, 'vinculos'), { ...form, criadoEm: new Date() })
      }
      fetchData()
      handleCloseModal()
    } catch (error) {
      console.error('Erro ao salvar vínculo:', error)
    }
  }

  // Deletar vínculo
  const handleDelete = async (id) => {
    if (!confirm('Deseja realmente excluir este vínculo?')) return
    try {
      await deleteDoc(doc(db, 'vinculos', id))
      fetchData()
    } catch (error) {
      console.error('Erro ao deletar vínculo:', error)
    }
  }

  if (!isAdmin) return <div>Acesso negado</div>
  if (!usuarios.length || !clientes.length || !vinculos.length) return <div>Carregando...</div>

  // Agrupar vínculos por loja
  const vinculosPorLoja = clientes.map(cliente => {
    return {
      cliente,
      motoboys: vinculos
        .filter(v => v.clienteId === cliente.id)
        .map(v => usuarios.find(u => u.id === v.motoboyId))
        .filter(Boolean)
    }
  }).filter(v => v.motoboys.length > 0) // só mostrar lojas com motoboys

  return (
    <main className={styles.container}>
      <button className={styles.backBtn} onClick={() => router.back()}>← Voltar</button>
      <h1 className={styles.title}>Vínculos por Loja</h1>

      <button className={styles.addBtn} onClick={() => handleOpenModal()}>Adicionar Vínculo</button>

      {/* Exibição por loja */}
      <div className={styles.cards}>
        {vinculosPorLoja.map(v => (
          <div key={v.cliente.id} className={styles.card}>
            <p><strong>Loja:</strong> {v.cliente.nome || v.cliente.nomeEmpresa}</p>
            <p><strong>Motoboys:</strong></p>
            <ul>
              {v.motoboys.map(m => (
                <li key={m.id}>
                  {m.nome || m.nomeEmpresa}
                  {/* Botões de editar e excluir individual por vínculo */}
                  <button 
                    className={styles.editBtn} 
                    onClick={() => {
                      const vinculoSelecionado = vinculos.find(vc => vc.clienteId === v.cliente.id && vc.motoboyId === m.id)
                      handleOpenModal(vinculoSelecionado)
                    }}
                  >
                    Editar
                  </button>
                  <button 
                    className={styles.deleteBtn} 
                    onClick={() => {
                      const vinculoSelecionado = vinculos.find(vc => vc.clienteId === v.cliente.id && vc.motoboyId === m.id)
                      handleDelete(vinculoSelecionado.id)
                    }}
                  >
                    Excluir
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>{editVinculo ? 'Editar Vínculo' : 'Adicionar Vínculo'}</h2>
            <form onSubmit={handleSubmit} className={styles.form}>
              <label>
                Loja:
                <select name="clienteId" value={form.clienteId} onChange={handleChange}>
                  <option value="">Selecione</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nome || c.nomeEmpresa}</option>
                  ))}
                </select>
              </label>

              <label>
                Motoboy:
                <select name="motoboyId" value={form.motoboyId} onChange={handleChange}>
                  <option value="">Selecione</option>
                  {usuarios.map(u => (
                    <option key={u.id} value={u.id}>{u.nome || u.nomeEmpresa}</option>
                  ))}
                </select>
              </label>

              <label>
                Status:
                <select name="status" value={form.status} onChange={handleChange}>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </label>

              <div className={styles.formActions}>
                <button type="submit" className={styles.saveBtn}>Salvar</button>
                <button type="button" className={styles.cancelBtn} onClick={handleCloseModal}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
