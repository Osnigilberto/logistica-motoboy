"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { auth, db } from "@/firebase/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import styles from "./dashboard.module.css";

export default function Dashboard() {
  const router = useRouter();
  const pathname = usePathname();
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

        if (!userDoc.exists()) {
          router.push("/completar-perfil");
          return;
        }

        setUsuario(userDoc.data());
        setErro(null);
      } catch (error) {
        setErro("Erro ao carregar dados. Verifique sua conexão.");
      } finally {
        setCarregando(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (carregando) return <p className={styles.loading}>Carregando...</p>;

  if (erro) {
    return (
      <main style={{ padding: "2rem" }}>
        <p>{erro}</p>
        <button onClick={() => router.push(pathname)}>Tentar Novamente</button>
      </main>
    );
  }

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Bem-vindo, {usuario.nome || "usuário"}!</h1>
      <p>Empresa: {usuario.empresa || "não informado"}</p>
      <p>Você é um {usuario.role}.</p>
      <button onClick={() => router.push("/completar-perfil")}>Editar Perfil</button>
    </main>
  );
}
