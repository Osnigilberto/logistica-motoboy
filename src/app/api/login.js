let users = []; // você deve compartilhar ou usar DB real em vez disso

export async function POST(req) {
  const { email, senha, role } = await req.json();

  if (!email || !senha || !role) {
    return new Response(JSON.stringify({ error: "Campos obrigatórios faltando." }), { status: 400 });
  }

  // Aqui só simula login, buscando no array
  const user = users.find(u => u.email === email && u.senha === senha && u.role === role);
  if (!user) {
    return new Response(JSON.stringify({ error: "Usuário ou senha inválidos." }), { status: 401 });
  }

  // Simula retorno de token (não faça isso em produção)
  return new Response(JSON.stringify({ message: "Login bem sucedido!", userId: user.id }), { status: 200 });
}
