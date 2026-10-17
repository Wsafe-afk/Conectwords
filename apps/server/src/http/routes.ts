import type { FastifyInstance } from 'fastify';
import type { Server as SocketIOServer } from 'socket.io';
import { nanoid } from 'nanoid';
import {
  CreateRoomSchema,
  DEFAULT_ROOM_SETTINGS,
  generateRoomCode,
  JoinRoomSchema,
  type Player,
  RoomCodeSchema,
} from '@conecta/shared';
import {
  createInitialRoom,
  resolveDuplicateNickname,
  toRoomView,
} from '../domain/index.js';
import { roomStore } from '../services/room-store.js';
import { sessionService } from '../services/session.js';
import { dictionaryService } from '../services/dictionary.js';

export async function registerRoutes(app: FastifyInstance, io?: SocketIOServer) {
  // GET /health
  app.get('/health', async () => {
    return { status: 'ok' };
  });

  // GET /ready
  app.get('/ready', async (request, reply) => {
    if (!dictionaryService.isReady()) {
      return reply.status(503).send({
        status: 'not_ready',
        error: 'Dicionário ainda carregando...',
      });
    }
    return {
      status: 'ready',
      wordsCount: dictionaryService.size(),
    };
  });

  // POST /api/rooms - Criar sala
  app.post('/api/rooms', async (request, reply) => {
    const parseResult = CreateRoomSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: 'INVALID_NICKNAME',
          message: parseResult.error.errors[0]?.message || 'Apelido inválido.',
        },
      });
    }

    const { nickname } = parseResult.data;

    // Gera código único de 5 caracteres
    let code = '';
    for (let i = 0; i < 10; i++) {
      const candidate = generateRoomCode();
      if (!(await roomStore.exists(candidate))) {
        code = candidate;
        break;
      }
    }
    if (!code) {
      code = generateRoomCode();
    }

    const playerId = `pl_${nanoid(10)}`;
    const hostPlayer: Player = {
      id: playerId,
      nickname,
      avatar: Math.floor(Math.random() * 8),
      connected: false,
      disconnectedAt: null,
      lives: DEFAULT_ROOM_SETTINGS.lives,
      status: 'ACTIVE',
      joinedAt: Date.now(),
    };

    const room = createInitialRoom(code, hostPlayer, DEFAULT_ROOM_SETTINGS);
    await roomStore.save(room);

    const sessionToken = sessionService.createSession(playerId, code);

    return reply.status(201).send({
      code,
      playerId,
      sessionToken,
      room: toRoomView(room),
    });
  });

  // POST /api/rooms/:code/join - Entrar na sala
  app.post('/api/rooms/:code/join', async (request, reply) => {
    const { code } = request.params as { code: string };
    const codeParse = RoomCodeSchema.safeParse(code);
    if (!codeParse.success) {
      return reply.status(400).send({
        error: {
          code: 'ROOM_NOT_FOUND',
          message: 'Código de sala inválido.',
        },
      });
    }

    const bodyParse = JoinRoomSchema.safeParse(request.body);
    if (!bodyParse.success) {
      return reply.status(400).send({
        error: {
          code: 'INVALID_NICKNAME',
          message: bodyParse.error.errors[0]?.message || 'Apelido inválido.',
        },
      });
    }

    const room = await roomStore.get(code);
    if (!room) {
      return reply.status(404).send({
        error: {
          code: 'ROOM_NOT_FOUND',
          message: 'Sala não encontrada. Verifique o código e tente novamente.',
        },
      });
    }

    if (room.players.length >= room.settings.maxPlayers) {
      return reply.status(409).send({
        error: {
          code: 'ROOM_FULL',
          message: 'Esta sala já atingiu o número máximo de jogadores.',
        },
      });
    }

    if (room.phase !== 'LOBBY') {
      return reply.status(409).send({
        error: {
          code: 'GAME_IN_PROGRESS',
          message: 'A partida nesta sala já começou.',
        },
      });
    }

    const existingNicknames = room.players.map((p) => p.nickname);
    const finalNickname = resolveDuplicateNickname(existingNicknames, bodyParse.data.nickname);

    const playerId = `pl_${nanoid(10)}`;
    const newPlayer: Player = {
      id: playerId,
      nickname: finalNickname,
      avatar: Math.floor(Math.random() * 8),
      connected: false,
      disconnectedAt: null,
      lives: room.settings.lives,
      status: 'ACTIVE',
      joinedAt: Date.now(),
    };

    room.players.push(newPlayer);
    room.version++;
    await roomStore.save(room);

    const sessionToken = sessionService.createSession(playerId, room.code);

    // Notifica via WebSocket todos os jogadores já conectados na sala que um novo jogador entrou
    if (io) {
      const roomChannel = `room:${room.code.toUpperCase()}`;
      io.to(roomChannel).emit('player:joined', { player: { ...newPlayer, connected: false } });
    }

    return reply.status(200).send({
      code: room.code,
      playerId,
      sessionToken,
      room: toRoomView(room),
    });
  });

  // GET /api/rooms/:code - Detalhes públicos da sala
  app.get('/api/rooms/:code', async (request, reply) => {
    const { code } = request.params as { code: string };
    const room = await roomStore.get(code);
    if (!room) {
      return reply.status(404).send({
        error: {
          code: 'ROOM_NOT_FOUND',
          message: 'Sala não encontrada.',
        },
      });
    }

    return {
      code: room.code,
      phase: room.phase,
      players: room.players.length,
      maxPlayers: room.settings.maxPlayers,
      joinable: room.phase === 'LOBBY' && room.players.length < room.settings.maxPlayers,
    };
  });
}
