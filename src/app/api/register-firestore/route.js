import { db } from "@/firebase/firebaseClient";
import { doc, setDoc } from "firebase/firestore";

export async function POST(request) {
  try {
    const { uid, name, email, role } = await request.json();

    if (!uid || !email || !name || !role) {
      return new Response(JSON.stringify({ error: "Dados incompletos" }), { status: 400 });
    }

    const userRef = doc(db, "usuarios", uid);
    await setDoc(userRef, {
      name,
      email,
      role,
      perfilCompleto: false,
      createdAt: Date.now()
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("Erro ao registrar usuário:", error);
    return new Response(JSON.stringify({ error: "Erro ao registrar usuário" }), { status: 500 });
  }
}
