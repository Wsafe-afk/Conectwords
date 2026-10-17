import type { Server, Socket } from 'socket.io';
import {
  ChooseLetterSchema,
  DraftUpdateSchema,
  KickPlayerSchema,
  ReactionSendSchema,
  TimeSyncSchema,
  UpdateSettingsSchema,
  WordSubmitSchema,
  type Room,
} from '@conecta/shared';
import {
  deriveNextPrefixes,
  getNextActivePlayer,
  reassignHostIfHostLeft,
  shuffleArray,
  toRoomView,
  validateWord,
} from '../domain/index.js';
import { roomStore } from '../services/room-store.js';
import { sessionService } from '../services/session.js';
import { timerService } from '../services/timer-service.js';
import { dictionaryService } from '../services/dictionary.js';

interface SocketData {
  playerId: string;
  roomCode: string;
}

export function setupWebSocket(io: Server) {
  // Middleware de autenticação via sessionToken
  io.use(async (socket, next) => {
    const sessionToken = socket.handshake.auth?.sessionToken as string | undefined;
    if (!sessionToken) {
      return next(new Error('UNAUTHORIZED'));
    }

    const session = sessionService.getSession(sessionToken);
    if (!session) {
      return next(new Error('UNAUTHORIZED'));
    }

    const room = await roomStore.get(session.roomCode);
    if (!room) {
      return next(new Error('ROOM_NOT_FOUND'));
    }

    const player = room.players.find((p) => p.id === session.playerId);
    if (!player) {
      return next(new Error('UNAUTHORIZED'));
    }

    socket.data = {
      playerId: session.playerId,
      roomCode: session.roomCode,
    } as SocketData;

    next();
  });

  io.on('connection', async (socket: Socket) => {
    const { playerId, roomCode } = socket.data as SocketData;
    const roomChannel = `room:${roomCode.toUpperCase()}`;

    socket.join(roomChannel);

    const room = await roomStore.get(roomCode);
    if (!room) return;

    const player = room.players.find((p) => p.id === playerId);
    if (player) {
      player.connected = true;
      player.disconnectedAt = null;
      room.version++;
      await roomStore.save(room);

      // Envia o estado completo para o cliente que acabou de conectar
      socket.emit('room:state', toRoomView(room));

      // Notifica a sala que o jogador está conectado
      socket.to(roomChannel).emit('player:connection', { playerId, connected: true });
    }

    // Sincronização de relógio (latência / offset)
    socket.on('time:sync', (payload, ack) => {
      const parsed = TimeSyncSchema.safeParse(payload);
      if (parsed.success) {
        const response = {
          clientTime: parsed.data.clientTime,
          serverTime: Date.now(),
        };
        socket.emit('time:sync:ack', response);
        if (typeof ack === 'function') ack(response);
      }
    });

    // Atualização de configurações da sala (host, no lobby)
    socket.on('settings:update', async (payload, ack) => {
      const currentRoom = await roomStore.get(roomCode);
      if (!currentRoom || currentRoom.phase !== 'LOBBY' || currentRoom.hostId !== playerId) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Não autorizado ou estado inválido.' });
        return;
      }

      const parsed = UpdateSettingsSchema.safeParse(payload);
      if (!parsed.success) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Configurações inválidas.' });
        return;
      }

      currentRoom.settings = { ...currentRoom.settings, ...parsed.data };
      currentRoom.version++;
      await roomStore.save(currentRoom);

      io.to(roomChannel).emit('settings:changed', currentRoom.settings);
      if (typeof ack === 'function') ack({ ok: true });
    });

    // Expulsar jogador (host, no lobby)
    socket.on('player:kick', async (payload, ack) => {
      const currentRoom = await roomStore.get(roomCode);
      if (!currentRoom || currentRoom.phase !== 'LOBBY' || currentRoom.hostId !== playerId) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Apenas o host pode expulsar no lobby.' });
        return;
      }

      const parsed = KickPlayerSchema.safeParse(payload);
      if (!parsed.success) return;

      const targetId = parsed.data.playerId;
      if (targetId === playerId) return; // host não pode se auto-expulsar

      currentRoom.players = currentRoom.players.filter((p) => p.id !== targetId);
      currentRoom.version++;
      await roomStore.save(currentRoom);

      io.to(roomChannel).emit('player:left', { playerId: targetId, reason: 'kicked' });
      if (typeof ack === 'function') ack({ ok: true });
    });

    // Iniciar partida (host, no lobby com >= 2 jogadores)
    socket.on('game:start', async (_, ack) => {
      const currentRoom = await roomStore.get(roomCode);
      if (!currentRoom || currentRoom.phase !== 'LOBBY' || currentRoom.hostId !== playerId) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Não autorizado.' });
        return;
      }

      if (currentRoom.players.length < 2) {
        if (typeof ack === 'function') ack({ ok: false, error: 'São necessários pelo menos 2 jogadores para iniciar.' });
        return;
      }

      // Sorteia a ordem dos turnos
      const turnOrder = shuffleArray(currentRoom.players.map((p) => p.id));
      const chooserId = turnOrder[0];
      const deadlineAt = Date.now() + 15_000; // 15 segundos para escolher a letra

      currentRoom.phase = 'CHOOSING_LETTER';
      currentRoom.turnOrder = turnOrder;

      // Reseta vidas e status dos jogadores
      for (const p of currentRoom.players) {
        p.lives = currentRoom.settings.lives;
        p.status = 'ACTIVE';
      }

      currentRoom.game = {
        startLetter: null,
        chooserId,
        currentPlayerId: turnOrder[1 % turnOrder.length],
        turnId: 0,
        deadlineAt,
        requiredPrefixes: [],
        words: [],
        usedSet: [],
        winnerId: null,
      };

      currentRoom.version++;
      await roomStore.save(currentRoom);

      io.to(roomChannel).emit('game:started', { turnOrder, chooserId, deadlineAt });
      if (typeof ack === 'function') ack({ ok: true });

      // Agenda timeout de 15s para escolha automática de letra se não escolher
      timerService.scheduleLetterTimer(roomCode, 15_000, async () => {
        await executeLetterChoice(io, roomCode, chooserId, null, true);
      });
    });

    // Escolha da letra inicial
    socket.on('letter:choose', async (payload, ack) => {
      const parsed = ChooseLetterSchema.safeParse(payload);
      if (!parsed.success) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Letra inválida.' });
        return;
      }

      const success = await executeLetterChoice(io, roomCode, playerId, parsed.data.letter, false);
      if (typeof ack === 'function') ack({ ok: success });
    });

    // Digitação em tempo real (draft)
    socket.on('draft:update', async (payload) => {
      const parsed = DraftUpdateSchema.safeParse(payload);
      if (!parsed.success) return;

      const currentRoom = await roomStore.get(roomCode);
      if (!currentRoom || currentRoom.phase !== 'PLAYING' || !currentRoom.game) return;

      if (currentRoom.game.currentPlayerId !== playerId) {
        return; // Apenas o jogador da vez pode transmitir rascunho
      }

      // Transmite para todos na sala exceto quem digitou (spec RF-012, RF-013)
      socket.to(roomChannel).emit('draft:changed', {
        playerId,
        text: parsed.data.text.slice(0, 32),
        seq: parsed.data.seq,
      });
    });

    // Envio e confirmação de palavra
    socket.on('word:submit', async (payload, ack) => {
      const parsed = WordSubmitSchema.safeParse(payload);
      if (!parsed.success) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Palavra inválida.' });
        return;
      }

      const currentRoom = await roomStore.get(roomCode);
      if (!currentRoom || currentRoom.phase !== 'PLAYING' || !currentRoom.game) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Partida não está em andamento.' });
        return;
      }

      if (currentRoom.game.currentPlayerId !== playerId) {
        socket.emit('word:rejected', {
          reason: 'NOT_YOUR_TURN',
          detail: 'Não é a sua vez de jogar.',
        });
        if (typeof ack === 'function') ack({ ok: false, error: 'Não é a sua vez.' });
        return;
      }

      // Validação de palavra no domínio
      const validation = validateWord({
        rawWord: parsed.data.word,
        minWordLength: currentRoom.settings.minWordLength,
        requiredPrefixes: currentRoom.game.requiredPrefixes,
        usedSet: currentRoom.game.usedSet,
        dictionaryHas: (norm) => dictionaryService.has(norm),
      });

      if (!validation.valid) {
        // Envia rejeição apenas para o jogador da vez (o turno continua)
        socket.emit('word:rejected', {
          reason: validation.reason,
          detail: validation.message,
        });
        if (typeof ack === 'function') ack({ ok: false, error: validation.message });
        return;
      }

      // Palavra aceita! Cancela timer do turno atual
      timerService.clearTimer(roomCode);

      const entry = {
        playerId,
        word: parsed.data.word.trim(),
        normalized: validation.normalized,
        matchedPrefix: validation.matchedPrefix,
        at: Date.now(),
      };

      currentRoom.game.words.push(entry);
      currentRoom.game.usedSet.push(validation.normalized);

      // Deriva os próximos prefixos válidos
      const nextPrefixes = deriveNextPrefixes(validation.normalized);
      currentRoom.game.requiredPrefixes = nextPrefixes;

      io.to(roomChannel).emit('word:accepted', { entry, nextPrefixes });
      if (typeof ack === 'function') ack({ ok: true });

      // Passa a vez para o próximo jogador
      await advanceTurn(io, currentRoom);
    });

    // Reações rápidas (emojis)
    socket.on('reaction:send', (payload) => {
      const parsed = ReactionSendSchema.safeParse(payload);
      if (parsed.success) {
        io.to(roomChannel).emit('reaction:received', {
          playerId,
          emoji: parsed.data.emoji,
        });
      }
    });

    // Jogar de novo (host, em FINISHED)
    socket.on('game:playAgain', async (_, ack) => {
      const currentRoom = await roomStore.get(roomCode);
      if (!currentRoom || currentRoom.phase !== 'FINISHED' || currentRoom.hostId !== playerId) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Apenas o host pode reiniciar.' });
        return;
      }

      currentRoom.phase = 'LOBBY';
      currentRoom.game = null;
      for (const p of currentRoom.players) {
        p.lives = currentRoom.settings.lives;
        p.status = 'ACTIVE';
      }
      currentRoom.version++;
      await roomStore.save(currentRoom);

      io.to(roomChannel).emit('room:state', toRoomView(currentRoom));
      if (typeof ack === 'function') ack({ ok: true });
    });

    // Sair voluntariamente da sala
    socket.on('room:leave', async () => {
      await handlePlayerDisconnectOrLeave(io, roomCode, playerId, true);
    });

    // Desconexão do socket
    socket.on('disconnect', async () => {
      await handlePlayerDisconnectOrLeave(io, roomCode, playerId, false);
    });
  });
}

/**
 * Executa a escolha de letra (manual ou automática)
 */
async function executeLetterChoice(
  io: Server,
  roomCode: string,
  chooserId: string,
  chosenLetter: string | null,
  isAuto: boolean
): Promise<boolean> {
  const room = await roomStore.get(roomCode);
  if (!room || room.phase !== 'CHOOSING_LETTER' || !room.game) return false;
  if (!isAuto && room.game.chooserId !== chooserId) return false;

  timerService.clearTimer(roomCode);

  let letter = chosenLetter;
  if (!letter) {
    // Sorteia letra A-Z
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    letter = alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  letter = letter.toUpperCase();
  room.game.startLetter = letter;
  room.phase = 'PLAYING';
  room.game.requiredPrefixes = [letter.toLowerCase()];
  room.game.turnId = 1;

  // 2º jogador da ordem inicia digitando (spec 2.2 #3)
  const secondPlayer = getNextActivePlayer(room.turnOrder, room.players, room.game.chooserId);
  room.game.currentPlayerId = secondPlayer ? secondPlayer.id : room.game.chooserId;

  const deadlineAt = Date.now() + room.settings.turnSeconds * 1000;
  room.game.deadlineAt = deadlineAt;
  room.version++;
  await roomStore.save(room);

  const roomChannel = `room:${roomCode.toUpperCase()}`;
  io.to(roomChannel).emit('letter:chosen', { letter, auto: isAuto });
  io.to(roomChannel).emit('turn:started', {
    turnId: room.game.turnId,
    playerId: room.game.currentPlayerId,
    requiredPrefixes: room.game.requiredPrefixes,
    deadlineAt,
  });

  // Agenda timeout do primeiro turno
  scheduleTurnTimeout(io, roomCode, room.game.turnId, room.settings.turnSeconds * 1000);
  return true;
}

/**
 * Passa o turno para o próximo jogador
 */
async function advanceTurn(io: Server, room: Room) {
  if (!room.game) return;

  const nextPlayer = getNextActivePlayer(room.turnOrder, room.players, room.game.currentPlayerId);
  if (!nextPlayer) return;

  room.game.currentPlayerId = nextPlayer.id;
  room.game.turnId++;
  const deadlineAt = Date.now() + room.settings.turnSeconds * 1000;
  room.game.deadlineAt = deadlineAt;
  room.version++;
  await roomStore.save(room);

  const roomChannel = `room:${room.code.toUpperCase()}`;
  io.to(roomChannel).emit('turn:started', {
    turnId: room.game.turnId,
    playerId: nextPlayer.id,
    requiredPrefixes: room.game.requiredPrefixes,
    deadlineAt,
  });

  scheduleTurnTimeout(io, room.code, room.game.turnId, room.settings.turnSeconds * 1000);
}

/**
 * Agenda o timeout de um turno com proteção por turnId
 */
function scheduleTurnTimeout(io: Server, roomCode: string, turnId: number, durationMs: number) {
  timerService.scheduleTurnTimer(roomCode, turnId, durationMs, async () => {
    const room = await roomStore.get(roomCode);
    if (!room || room.phase !== 'PLAYING' || !room.game || room.game.turnId !== turnId) {
      return;
    }

    const currentPlayer = room.players.find((p) => p.id === room.game!.currentPlayerId);
    if (!currentPlayer) return;

    // Perde 1 vida
    currentPlayer.lives = Math.max(0, currentPlayer.lives - 1);
    const roomChannel = `room:${roomCode.toUpperCase()}`;

    io.to(roomChannel).emit('turn:timeout', {
      playerId: currentPlayer.id,
      livesLeft: currentPlayer.lives,
    });

    if (currentPlayer.lives === 0) {
      currentPlayer.status = 'ELIMINATED';
      io.to(roomChannel).emit('player:eliminated', { playerId: currentPlayer.id });
    }

    // Checa se sobrou apenas 1 jogador ativo
    const activePlayers = room.players.filter((p) => p.status === 'ACTIVE');
    if (activePlayers.length <= 1) {
      room.phase = 'FINISHED';
      room.game.winnerId = activePlayers[0]?.id || null;
      room.version++;
      await roomStore.save(room);

      io.to(roomChannel).emit('game:finished', {
        winnerId: room.game.winnerId,
        stats: {
          totalWords: room.game.words.length,
          longestWord: room.game.words.reduce((max, cur) => (cur.word.length > max.length ? cur.word : max), ''),
        },
      });
      return;
    }

    // Mais de 1 ativo: avança mantendo os mesmos prefixos exigidos (spec 2.2 #7)
    await advanceTurn(io, room);
  });
}

/**
 * Trata desconexão ou saída voluntária
 */
async function handlePlayerDisconnectOrLeave(
  io: Server,
  roomCode: string,
  playerId: string,
  voluntaryLeave: boolean
) {
  const room = await roomStore.get(roomCode);
  if (!room) return;

  const roomChannel = `room:${roomCode.toUpperCase()}`;

  if (voluntaryLeave && room.phase === 'LOBBY') {
    // No lobby, saída voluntária remove de vez
    room.players = room.players.filter((p) => p.id !== playerId);
    if (room.players.length === 0) {
      await roomStore.delete(roomCode);
      return;
    }
    if (room.hostId === playerId) {
      const newHost = reassignHostIfHostLeft(room);
      if (newHost) io.to(roomChannel).emit('host:changed', { hostId: newHost });
    }
    room.version++;
    await roomStore.save(room);
    io.to(roomChannel).emit('player:left', { playerId, reason: 'left' });
  } else {
    // Queda de rede ou durante partida: marca desconectado com período de graça
    const player = room.players.find((p) => p.id === playerId);
    if (player) {
      player.connected = false;
      player.disconnectedAt = Date.now();
      room.version++;
      await roomStore.save(room);
      io.to(roomChannel).emit('player:connection', { playerId, connected: false });
    }
  }
}
