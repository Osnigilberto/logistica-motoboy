// src/app/api/rota.js
export async function POST() {
  return new Response(JSON.stringify({ msg: 'ok' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
