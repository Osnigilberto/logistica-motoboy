import { getToken } from "next-auth/jwt";
import { db } from "@/lib/firebaseAdmin";

export async function POST(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.sub) return new Response("Não autorizado", { status: 401 });

  const data = await req.json();

  try {
    const userRef = db.collection("users").doc(token.sub);
    await userRef.set(
      {
        empresa: data.empresa,
        cnpjCpf: data.cnpjCpf,
        telefone: data.telefone,
        endereco: data.endereco, // objeto com rua, numero, cidade, estado, pais
        responsavel: data.responsavel,
        perfilCompleto: true,
      },
      { merge: true }
    );

    return new Response(JSON.stringify({ message: "Perfil completo!" }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
