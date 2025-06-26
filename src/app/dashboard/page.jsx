"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/firebaseClient";
import styles from "./dashboard.module.css";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [perfil, setPerfil] = useState(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading]);

  useEffect(() => {
    async function fetchPerfil() {
      if (!user) return;
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (!data.perfilCompleto) router.push("/completar-perfil");
        else setPerfil(data);
      }
    }
    fetchPerfil();
  }, [user]);

  if (loading || !perfil) return <p>Carregando...</p>;

  return (
    <main className={styles.main}>
      <h1>Bem-vindo, {perfil.name}!</h1>
      <p>Empresa: {perfil.empresa || "não informada"}</p>
      <p>Função: {perfil.role}</p>
      <button className={styles.button} onClick={() => router.push("/completar-perfil")}>Editar Perfil</button>
      <button className={styles.logout} onClick={() => auth.signOut().then(() => router.push("/login"))}>Sair</button>
    </main>
  );
}
