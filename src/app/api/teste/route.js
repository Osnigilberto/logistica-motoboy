// src/app/api/teste/route.js
export async function GET() {
  return new Response(JSON.stringify({ msg: 'ok' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
