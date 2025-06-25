"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/firebase/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import styles from "./dashboard.module.css";

export default function Dashboard() {
  const router = useRouter();
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        const docRef = doc(db, "usuarios", user.uid);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists() || !docSnap.data().perfilCompleto) {
          router.push("/completar-perfil");
          return;
        }

        setUsuario(docSnap.data());
        setErro(null);
      } catch {
        setErro("Erro ao carregar dados. Verifique sua conexão.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) return <p className={styles.loading}>Carregando...</p>;

  if (erro)
    return (
      <main style={{ padding: "2rem" }}>
        <p>{erro}</p>
        <button onClick={() => router.refresh()}>Tentar novamente</button>
      </main>
    );

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Bem-vindo, {usuario.nome || "usuário"}!</h1>
      <p>Empresa: {usuario.empresa || "não informada"}</p>
      <p>Você é um(a) {usuario.role}.</p>
      <button onClick={() => router.push("/completar-perfil")}>Editar Perfil</button>
      <button onClick={async () => {
        await auth.signOut();
        router.push("/login");
      }}>
        Sair
      </button>
    </main>
  );
}
