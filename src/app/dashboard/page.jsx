"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/firebase/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import styles from "./dashboard.module.css";

export default function Dashboard() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [usuario, setUsuario] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        const userRef = doc(db, "usuarios", user.uid);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists() || !userDoc.data().perfilCompleto) {
          router.push("/completar-perfil");
          return;
        }

        setUsuario(userDoc.data());
        setErro(null);
      } catch (error) {
        console.error(error);
        setErro("Erro ao carregar dados. Verifique sua conexão.");
      } finally {
        setCarregando(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (carregando) {
    return (
      <div className={styles.spinnerWrapper}>
        <div className={styles.spinner}></div>
        <p>Carregando dados do usuário...</p>
      </div>
    );
  }

  if (erro) {
    return (
      <main className={styles.main}>
        <p className={styles.erro}>{erro}</p>
        <button onClick={() => router.refresh()} className={styles.button}>
          Tentar novamente
        </button>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <h1 className={styles.titulo}>
        Bem-vindo, {usuario.nome || "usuário"}!
      </h1>
      <p>Empresa: {usuario.empresa || "não informado"}</p>
      <p>Tipo de conta: <strong>{usuario.role}</strong></p>

      <div className={styles.botoes}>
        <button
          onClick={() => router.push("/dashboard/editar-perfil")}
          className={styles.button}
        >
          Editar Perfil
        </button>

        <button
          onClick={() => auth.signOut().then(() => router.push("/login"))}
          className={styles.logout}
        >
          Sair
        </button>
      </div>
    </main>
  );
}
