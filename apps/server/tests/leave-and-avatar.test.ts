import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { Server as SocketIOServer } from 'socket.io';
import { io as ClientSocket, type Socket as ClientSocketType } from 'socket.io-client';
import { registerRoutes } from '../src/http/routes.js';
import { setupWebSocket } from '../src/ws/gateway.js';
import { dictionaryService } from '../src/services/dictionary.js';

let app: FastifyInstance;
let serverPort: number;

const openSockets: ClientSocketType[] = [];

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
  openSockets.forEach((s) => s.disconnect());
  await app.close();
});

function connect(baseUrl: string, sessionToken: string): Promise<ClientSocketType> {
  return new Promise((resolve, reject) => {
    const socket = ClientSocket(baseUrl, {
      auth: { sessionToken },
      transports: ['websocket'],
    });
    openSockets.push(socket);
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', reject);
  });
}

async function createRoom(nickname: string, avatar?: number) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/rooms',
    payload: { nickname, ...(avatar !== undefined ? { avatar } : {}) },
  });
  return res.json();
}

async function joinRoom(code: string, nickname: string, avatar?: number) {
  const res = await app.inject({
    method: 'POST',
    url: `/api/rooms/${code}/join`,
    payload: { nickname, ...(avatar !== undefined ? { avatar } : {}) },
  });
  return res.json();
}

describe('Avatar escolhido pelo jogador', () => {
  it('aceita avatar na criação e na entrada da sala', async () => {
    const ana = await createRoom('Dono', 3);
    expect(ana.room.players[0].avatar).toBe(3);

    const bia = await joinRoom(ana.code, 'Convidada', 7);
    const joined = bia.room.players.find((p: any) => p.nickname === 'Convidada');
    expect(joined.avatar).toBe(7);
  });

  it('rejeita avatar fora do intervalo 0..7', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/rooms',
      payload: { nickname: 'Teste', avatar: 99 },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('Saída voluntária da sala (room:leave)', () => {
  it('remove o jogador na hora durante a partida, passa o turno e mantém o jogo', async () => {
    const baseUrl = `http://127.0.0.1:${serverPort}`;

    const ana = await createRoom('Ana');
    const bia = await joinRoom(ana.code, 'Bia');
    const caio = await joinRoom(ana.code, 'Caio');

    const socketAna = await connect(baseUrl, ana.sessionToken);
    const socketBia = await connect(baseUrl, bia.sessionToken);
    const socketCaio = await connect(baseUrl, caio.sessionToken);

    const startedPromise = new Promise<any>((resolve) => socketAna.once('game:started', resolve));
    await new Promise<void>((resolve) => socketAna.emit('game:start', {}, () => resolve()));
    const started = await startedPromise;

    const socketsById: Record<string, ClientSocketType> = {
      [ana.playerId]: socketAna,
      [bia.playerId]: socketBia,
      [caio.playerId]: socketCaio,
    };

    // Chooser escolhe a letra; primeiro turno começa (aguarda o evento chegar em todos os sockets)
    const turnStartedPromise = new Promise<any>((resolve) => {
      let received = 0;
      const onTurnStarted = (data: any) => {
        received++;
        if (received === 3) resolve(data);
      };
      [socketAna, socketBia, socketCaio].forEach((s) => s.once('turn:started', onTurnStarted));
    });
    socketsById[started.chooserId].emit('letter:choose', { letter: 'C' });
    const turn = await turnStartedPromise;

    const leaverId = turn.playerId as string;
    const leaverSocket = socketsById[leaverId];
    const remainingSockets = [socketAna, socketBia, socketCaio].filter((s) => s !== leaverSocket);

    const leftPromise = new Promise<any>((resolve) => {
      remainingSockets.forEach((s) => s.once('player:left', resolve));
    });
    const nextTurnPromise = new Promise<any>((resolve) => {
      remainingSockets.forEach((s) => s.once('turn:started', resolve));
    });

    // Sair voluntariamente no meio da partida
    await new Promise<void>((resolve) => leaverSocket.emit('room:leave', {}, () => resolve()));

    // Os demais são avisados imediatamente, com motivo 'left'
    const left = await leftPromise;
    expect(left.playerId).toBe(leaverId);
    expect(left.reason).toBe('left');

    // O turno passa para o próximo jogador ativo
    const nextTurn = await nextTurnPromise;
    expect(nextTurn.playerId).not.toBe(leaverId);

    // A sala mantém apenas os 2 jogadores restantes (sem período de graça)
    const info = (await app.inject({ method: 'GET', url: `/api/rooms/${ana.code}` })).json();
    expect(info.players).toBe(2);
    expect(info.phase).toBe('PLAYING');
  });

  it('queda de conexão mantém o jogador na sala (período de graça)', async () => {
    const baseUrl = `http://127.0.0.1:${serverPort}`;

    const ana = await createRoom('Ana2');
    const bia = await joinRoom(ana.code, 'Bia2');

    const socketBia = await connect(baseUrl, bia.sessionToken);
    socketBia.disconnect();

    await new Promise((r) => setTimeout(r, 200));

    const info = (await app.inject({ method: 'GET', url: `/api/rooms/${ana.code}` })).json();
    expect(info.players).toBe(2); // ainda na sala, aguardando reconexão
  });
});
