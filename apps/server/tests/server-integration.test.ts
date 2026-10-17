import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerRoutes } from '../src/http/routes.js';
import { dictionaryService } from '../src/services/dictionary.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify();
  await dictionaryService.load();
  await registerRoutes(app);
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('HTTP Routes Integration (RF-001..005, CA-001..003)', () => {
  it('GET /ready retorna 200 e número de palavras', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/ready',
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ready');
    expect(body.wordsCount).toBeGreaterThan(1000);
  });

  it('POST /api/rooms cria sala com código de 5 letras e retorna host e sessionToken (CA-001)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/rooms',
      payload: { nickname: 'Ana' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.code).toHaveLength(5);
    expect(body.sessionToken).toBeDefined();
    expect(body.room.hostId).toBe(body.playerId);
    expect(body.room.players[0].nickname).toBe('Ana');
  });

  it('POST /api/rooms/:code/join permite outro jogador entrar e resolve apelido duplicado (RF-005, CA-002)', async () => {
    // 1. Cria sala
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/rooms',
      payload: { nickname: 'Ana' },
    });
    const { code } = createRes.json();

    // 2. Entra com mesmo apelido 'Ana'
    const joinRes = await app.inject({
      method: 'POST',
      url: `/api/rooms/${code}/join`,
      payload: { nickname: 'Ana' },
    });
    expect(joinRes.statusCode).toBe(200);
    const joinBody = joinRes.json();
    expect(joinBody.room.players).toHaveLength(2);
    expect(joinBody.room.players[1].nickname).toBe('Ana2'); // sufixo automático!
  });

  it('GET /api/rooms/:code retorna 404 para sala inexistente (CA-003)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/rooms/ZZZZZ',
    });
    expect(res.statusCode).toBe(404);
  });
});
