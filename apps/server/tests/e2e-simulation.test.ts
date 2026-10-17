import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { Server as SocketIOServer } from 'socket.io';
import { io as ClientSocket, type Socket as ClientSocketType } from 'socket.io-client';
import { registerRoutes } from '../src/http/routes.js';
import { setupWebSocket } from '../src/ws/gateway.js';
import { dictionaryService } from '../src/services/dictionary.js';

let app: FastifyInstance;
let serverPort: number;

beforeAll(async () => {
  app = Fastify();
  await dictionaryService.load();
  await registerRoutes(app);

  const io = new SocketIOServer(app.server, {
    cors: { origin: '*' },
  });
  setupWebSocket(io);

  await app.listen({ port: 0, host: '127.0.0.1' });
  const address = app.server.address();
  if (typeof address === 'object' && address) {
    serverPort = address.port;
  }
});

afterAll(async () => {
  await app.close();
});

describe('Simulação E2E de Partida em Tempo Real (CA-001..011)', () => {
  let socketAna: ClientSocketType;
  let socketBia: ClientSocketType;

  afterAll(() => {
    socketAna?.disconnect();
    socketBia?.disconnect();
  });

  it('Executa fluxo completo: criação, entrada, início, escolha de letra, digitação ao vivo e submissão', async () => {
    const baseUrl = `http://127.0.0.1:${serverPort}`;

    // 1. Ana cria sala
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/rooms',
      payload: { nickname: 'Ana' },
    });
    const anaData = createRes.json();
    const roomCode = anaData.code;
    expect(roomCode).toHaveLength(5);

    // 2. Bia entra na sala
    const joinRes = await app.inject({
      method: 'POST',
      url: `/api/rooms/${roomCode}/join`,
      payload: { nickname: 'Bia' },
    });
    const biaData = joinRes.json();
    expect(biaData.room.players).toHaveLength(2);

    // 3. Conexão via WebSocket
    socketAna = ClientSocket(baseUrl, {
      auth: { sessionToken: anaData.sessionToken },
      transports: ['websocket'],
    });

    socketBia = ClientSocket(baseUrl, {
      auth: { sessionToken: biaData.sessionToken },
      transports: ['websocket'],
    });

    await Promise.all([
      new Promise<void>((resolve) => socketAna.on('connect', () => resolve())),
      new Promise<void>((resolve) => socketBia.on('connect', () => resolve())),
    ]);

    // 4. Ana (Host) inicia a partida
    const gameStartedPromise = new Promise<{ turnOrder: string[]; chooserId: string }>((resolve) => {
      socketBia.on('game:started', (data) => resolve(data));
    });

    await new Promise<void>((resolve) => {
      socketAna.emit('game:start', {}, (res: any) => {
        expect(res.ok).toBe(true);
        resolve();
      });
    });

    const gameStartedData = await gameStartedPromise;
    expect(gameStartedData.turnOrder).toHaveLength(2);

    const chooserSocket = gameStartedData.chooserId === anaData.playerId ? socketAna : socketBia;
    const secondPlayerId = gameStartedData.turnOrder[1 % 2];
    const secondSocket = secondPlayerId === anaData.playerId ? socketAna : socketBia;
    const otherSocket = chooserSocket === socketAna ? socketBia : socketAna;

    // 5. Chooser escolhe a letra 'C'
    const letterChosenPromise = new Promise<{ letter: string }>((resolve) => {
      otherSocket.on('letter:chosen', (data) => resolve(data));
    });

    const turnStartedPromise = new Promise<{ turnId: number; playerId: string; requiredPrefixes: string[] }>((resolve) => {
      secondSocket.on('turn:started', (data) => resolve(data));
    });

    chooserSocket.emit('letter:choose', { letter: 'C' });

    const letterData = await letterChosenPromise;
    expect(letterData.letter).toBe('C');

    const turnData = await turnStartedPromise;
    expect(turnData.playerId).toBe(secondPlayerId);
    expect(turnData.requiredPrefixes).toEqual(['c']);

    // 6. Digitação ao vivo (draft:update -> draft:changed para o outro)
    const draftReceivedPromise = new Promise<{ playerId: string; text: string }>((resolve) => {
      // O outro jogador deve receber o draft
      const listenerSocket = secondSocket === socketAna ? socketBia : socketAna;
      listenerSocket.on('draft:changed', (data) => resolve(data));
    });

    secondSocket.emit('draft:update', { text: 'cas', seq: 1 });
    const draftData = await draftReceivedPromise;
    expect(draftData.text).toBe('cas');
    expect(draftData.playerId).toBe(secondPlayerId);

    // 7. Envio de palavra ("casa")
    const wordAcceptedPromise = new Promise<{ entry: any; nextPrefixes: string[] }>((resolve) => {
      socketAna.on('word:accepted', (data) => resolve(data));
    });

    await new Promise<void>((resolve) => {
      secondSocket.emit('word:submit', { word: 'casa' }, (res: any) => {
        expect(res.ok).toBe(true);
        resolve();
      });
    });

    const acceptedData = await wordAcceptedPromise;
    expect(acceptedData.entry.word).toBe('casa');
    expect(acceptedData.entry.matchedPrefix).toBe('c');
    expect(acceptedData.nextPrefixes).toEqual(['a', 'sa']); // CA-005 encadeamento com 1 e 2 letras!
  });
});
