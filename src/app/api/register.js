let users = []; // simulação simples (em memória)

export async function POST(req) {
  const { nome, email, senha, role } = await req.json();

  if (!email || !senha || !role) {
    return new Response(JSON.stringify({ error: "Campos obrigatórios faltando." }), { status: 400 });
  }

  if (users.find(u => u.email === email && u.role === role)) {
    return new Response(JSON.stringify({ error: "Usuário já existe." }), { status: 409 });
  }

  const user = { id: Date.now(), nome, email, senha, role };
  users.push(user);

  return new Response(JSON.stringify({ message: "Cadastro realizado com sucesso!", userId: user.id }), { status: 201 });
}
