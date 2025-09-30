// populate-medals.js
// Script Node.js para popular a coleção 'medalhas' no Firestore

const admin = require('firebase-admin');

// Importa a chave de serviço (Service Account) do Firebase
// Certifique-se de que este arquivo está na mesma pasta ou ajuste o caminho
const serviceAccount = require('./serviceAccountKey.json');

// Inicializa o Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Array com todas as 50 medalhas
// Cada item é um objeto plano {nome, descricao, raridade}, compatível com Firestore
const medalhas = [
  // ---------- COMUM (15) ----------
  {"nome": "Primeira entrega", "descricao": "Completou a primeira entrega", "raridade": "comum"},
  {"nome": "3 entregas em um dia", "descricao": "Entregou 3 vezes no mesmo dia", "raridade": "comum"},
  {"nome": "Entrega noturna", "descricao": "Primeira entrega à noite", "raridade": "comum"},
  {"nome": "Entrega de alimentos", "descricao": "Primeira entrega de comida", "raridade": "comum"},
  {"nome": "Entrega de pacote", "descricao": "Primeira entrega de pacote", "raridade": "comum"},
  {"nome": "Entrega curta", "descricao": "Completou entregas menores que X km", "raridade": "comum"},
  {"nome": "Entrega longa", "descricao": "Completou entregas maiores que X km", "raridade": "comum"},
  {"nome": "Estrada diária", "descricao": "Rodou 10 km de entregas", "raridade": "comum"},
  {"nome": "Duas em uma", "descricao": "Fez duas entregas em uma viagem", "raridade": "comum"},
  {"nome": "Dias consecutivos", "descricao": "Entregou por 2 dias seguidos", "raridade": "comum"},
  {"nome": "Primeira semana", "descricao": "Completou 5 entregas na primeira semana", "raridade": "comum"},
  {"nome": "Multi-bairro", "descricao": "Entregou em 2 bairros diferentes", "raridade": "comum"},
  {"nome": "Transporte leve", "descricao": "Entregou encomendas pequenas", "raridade": "comum"},
  {"nome": "Transporte pesado", "descricao": "Entregou encomendas médias", "raridade": "comum"},
  {"nome": "Rota conhecida", "descricao": "Completou todas entregas em um bairro", "raridade": "comum"},

  // ---------- RARA (15) ----------
  {"nome": "10 entregas na semana", "descricao": "Completou 10 entregas na semana", "raridade": "rara"},
  {"nome": "20 entregas na semana", "descricao": "Completou 20 entregas na semana", "raridade": "rara"},
  {"nome": "5 entregas rápidas no dia", "descricao": "Completou 5 entregas rápidas no mesmo dia", "raridade": "rara"},
  {"nome": "Rodou 50 km na semana", "descricao": "Percorreu 50 km de entregas na semana", "raridade": "rara"},
  {"nome": "Turno longo", "descricao": "Trabalhou 8h em um dia", "raridade": "rara"},
  {"nome": "3 dias consecutivos", "descricao": "Entregou por 3 dias seguidos", "raridade": "rara"},
  {"nome": "Especialista em alimentos", "descricao": "Completou 20 entregas de comida", "raridade": "rara"},
  {"nome": "Pacotes pesados", "descricao": "Entregou 10 encomendas pesadas", "raridade": "rara"},
  {"nome": "Multi-bairro avançado", "descricao": "Entregou em 5 bairros diferentes", "raridade": "rara"},
  {"nome": "Semana sem erros", "descricao": "Completou todas entregas da semana", "raridade": "rara"},
  {"nome": "Turno duplo", "descricao": "Fez entregas em dois turnos no mesmo dia", "raridade": "rara"},
  {"nome": "Rotas variadas", "descricao": "Entregou em 10 bairros diferentes", "raridade": "rara"},
  {"nome": "Transporte premium", "descricao": "Entregou encomendas grandes e pesadas", "raridade": "rara"},
  {"nome": "Produtividade alta", "descricao": "Mais de 15 entregas em uma semana", "raridade": "rara"},
  {"nome": "Rodas em movimento", "descricao": "Percorreu mais de 100 km na semana", "raridade": "rara"},

  // ---------- ÉPICA (10) ----------
  {"nome": "Entregador do mês", "descricao": "Maior número de entregas do mês", "raridade": "épica"},
  {"nome": "Mestre das rotas", "descricao": "Completou todas rotas do mês", "raridade": "épica"},
  {"nome": "50 entregas em um mês", "descricao": "Completou 50 entregas no mês", "raridade": "épica"},
  {"nome": "7 dias consecutivos sem erro", "descricao": "Entregou por 7 dias seguidos sem falhas", "raridade": "épica"},
  {"nome": "Entrega expressa", "descricao": "Média de entrega rápida em 10 entregas", "raridade": "épica"},
  {"nome": "Longa distância", "descricao": "Completou entregas acima de X km em um mês", "raridade": "épica"},
  {"nome": "Rota completa", "descricao": "Percorreu todas rotas de um bairro no mês", "raridade": "épica"},
  {"nome": "Turno épico", "descricao": "Mais de 10h de entregas em um dia", "raridade": "épica"},
  {"nome": "Multi-bairro épico", "descricao": "Entregou em 15 bairros diferentes", "raridade": "épica"},
  {"nome": "Marathon mensal", "descricao": "Rodou 500 km em um mês", "raridade": "épica"},

  // ---------- LENDÁRIA (10) ----------
  {"nome": "Mestre das entregas", "descricao": "100 entregas sem erros", "raridade": "lendária"},
  {"nome": "Lenda da velocidade", "descricao": "Média recorde de entrega no mês", "raridade": "lendária"},
  {"nome": "Super entregador", "descricao": "50 entregas em menos de 30 dias", "raridade": "lendária"},
  {"nome": "Rodas de ouro", "descricao": "Percorreu mais de 1000 km no ano", "raridade": "lendária"},
  {"nome": "Entregador imbatível", "descricao": "Trabalhou 30 dias consecutivos", "raridade": "lendária"},
  {"nome": "Rota lendária", "descricao": "Percorreu todas rotas da cidade", "raridade": "lendária"},
  {"nome": "Marathon anual", "descricao": "Rodou 5000 km no ano", "raridade": "lendária"},
  {"nome": "Multi-bairro lendário", "descricao": "Entregou em todos bairros da cidade", "raridade": "lendária"},
  {"nome": "Mega entrega", "descricao": "Completou encomenda grande e pesada sem falha", "raridade": "lendária"},
  {"nome": "Jornada perfeita", "descricao": "Todas entregas do ano sem atraso", "raridade": "lendária"}
];

// Função para popular o Firestore usando batch
async function populate() {
  const batch = db.batch();

  // Para cada medalha, cria um documento com ID baseado na raridade + índice
  medalhas.forEach((medalha, index) => {
    const id = `${medalha.raridade}_${String(index + 1).padStart(2, '0')}`;
    batch.set(db.collection('medalhas').doc(id), medalha);
  });

  // Envia o batch para o Firestore
  await batch.commit();
  console.log('Medalhas populadas com sucesso!');
}

// Executa a função e captura erros
populate().catch(console.error);
