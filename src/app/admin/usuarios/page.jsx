'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthProvider'
import { useRouter } from 'next/navigation'
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from 'firebase/firestore'
import { app } from '@/firebase/firebaseClient'
import styles from './usuarios.module.css'

const db = getFirestore(app)
const usersCollection = collection(db, 'users')
const ADMIN_UID = 'TkIu3cI2itQ2K4xAkHQ9l9KTvp83'

export default function Usuarios() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [usuarios, setUsuarios] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editUsuario, setEditUsuario] = useState(null)
  const [form, setForm] = useState({
    nome: '',
    nomeEmpresa: '',
    email: '',
    tipo: 'cliente',
    telefone: '',
    documento: '',
    responsavel: '',
    photoURL: ''
  })

  const isAdmin = user?.uid === ADMIN_UID

  // 🔹 Busca usuários do Firestore
  const fetchUsuarios = async () => {
    setLoadingData(true)
    try {
      const snapshot = await getDocs(usersCollection)
      const lista = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
      setUsuarios(lista)
    } catch (error) {
      console.error('Erro ao buscar usuários:', error)
    } finally {
      setLoadingData(false)
    }
  }

  // 🔹 Inicializa fetch e valida admin
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }
    if (user) fetchUsuarios()
  }, [user, loading, router])

  // 🔹 Atualiza formulário
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  // 🔹 Abre modal para adicionar ou editar usuário
  const handleOpenModal = (usuario = null) => {
    if (!isAdmin) return alert('Apenas admins podem gerenciar usuários')
    if (usuario) {
      setEditUsuario(usuario)
      setForm({
        nome: usuario.nome || '',
        nomeEmpresa: usuario.nomeEmpresa || '',
        email: usuario.email || '',
        tipo: usuario.tipo || 'cliente',
        telefone: usuario.telefone || '',
        documento: usuario.documento || '',
        responsavel: usuario.responsavel || '',
        photoURL: usuario.photoURL || ''
      })
    } else {
      setEditUsuario(null)
      setForm({
        nome: '',
        nomeEmpresa: '',
        email: '',
        tipo: 'cliente',
        telefone: '',
        documento: '',
        responsavel: '',
        photoURL: ''
      })
    }
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setEditUsuario(null)
    setForm({
      nome: '',
      nomeEmpresa: '',
      email: '',
      tipo: 'cliente',
      telefone: '',
      documento: '',
      responsavel: '',
      photoURL: ''
    })
  }

  // 🔹 Salva usuário no Firestore
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nome && !form.nomeEmpresa) return alert('Preencha o nome ou nome da empresa')
    if (!form.email) return alert('Preencha o email')
    try {
      if (editUsuario) {
        await updateDoc(doc(db, 'users', editUsuario.id), form)
      } else {
        await addDoc(usersCollection, form)
      }
      fetchUsuarios()
      handleCloseModal()
    } catch (error) {
      console.error('Erro ao salvar usuário:', error)
    }
  }

  // 🔹 Exclui usuário
  const handleDelete = async (id) => {
    if (!confirm('Deseja realmente excluir este usuário?')) return
    try {
      await deleteDoc(doc(db, 'users', id))
      fetchUsuarios()
    } catch (error) {
      console.error('Erro ao deletar usuário:', error)
    }
  }

  if (loadingData) {
    return (
      <main className={styles.container}>
        <div className={styles.skeleton}></div>
        <div className={styles.skeleton}></div>
        <div className={styles.skeleton}></div>
      </main>
    )
  }

  return (
    <main className={styles.container}>
      <button className={styles.backBtn} onClick={() => router.back()}>← Voltar</button>
      <h1 className={styles.title}>Usuários</h1>

      {isAdmin && (
        <button className={styles.addBtn} onClick={() => handleOpenModal()}>Adicionar Usuário</button>
      )}

      {usuarios.length === 0 ? (
        <p className={styles.empty}>Nenhum usuário cadastrado.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Avatar</th>
              <th>Nome / Empresa</th>
              <th>Email</th>
              <th>Tipo</th>
              <th>Telefone</th>
              <th>Documento</th>
              <th>Responsável</th>
              {isAdmin && <th>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {usuarios.map(u => {
              // 🔹 Define a classe da badge dinamicamente
              const badgeClass = u.tipo === 'motoboy' ? 'motoboy' : 'cliente'
              return (
                <tr key={u.id}>
                  <td>
                    <img
                      src={u.photoURL || '/avatar-padrao.png'}
                      alt={u.nome || u.nomeEmpresa || 'Usuário'}
                      className={styles.avatarTable}
                    />
                  </td>
                  <td>{u.nome || u.nomeEmpresa || '—'}</td>
                  <td>{u.email || '—'}</td>
                  <td>
                    <span className={`${styles.badge} ${styles[badgeClass]}`}>
                      {u.tipo || '—'}
                    </span>
                  </td>
                  <td>{u.telefone || '—'}</td>
                  <td>{u.documento || '—'}</td>
                  <td>{u.responsavel || '—'}</td>
                  {isAdmin && (
                    <td className={styles.actionsTable}>
                      <button className={styles.editBtn} onClick={() => handleOpenModal(u)}>Editar</button>
                      <button className={styles.deleteBtn} onClick={() => handleDelete(u.id)}>Excluir</button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>{editUsuario ? 'Editar Usuário' : 'Adicionar Usuário'}</h2>
            <form onSubmit={handleSubmit} className={styles.form}>
              <label>
                Nome:
                <input type="text" name="nome" value={form.nome} onChange={handleChange} />
              </label>
              <label>
                Nome da Empresa:
                <input type="text" name="nomeEmpresa" value={form.nomeEmpresa} onChange={handleChange} />
              </label>
              <label>
                Email:
                <input type="email" name="email" value={form.email} onChange={handleChange} />
              </label>
              <label>
                Tipo:
                <select name="tipo" value={form.tipo} onChange={handleChange}>
                  <option value="cliente">Cliente</option>
                  <option value="motoboy">Motoboy</option>
                </select>
              </label>
              <label>
                Telefone:
                <input type="text" name="telefone" value={form.telefone} onChange={handleChange} />
              </label>
              <label>
                Documento:
                <input type="text" name="documento" value={form.documento} onChange={handleChange} />
              </label>
              <label>
                Responsável:
                <input type="text" name="responsavel" value={form.responsavel} onChange={handleChange} />
              </label>
              <label>
                Foto (URL):
                <input type="text" name="photoURL" value={form.photoURL} onChange={handleChange} />
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
