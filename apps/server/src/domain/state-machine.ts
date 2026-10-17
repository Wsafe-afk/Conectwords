import type {
  Player,
  Room,
  RoomPhase,
  RoomSettings,
  RoomView,
} from '@conecta/shared';

/**
 * Cria uma nova sala no estado LOBBY
 */
export function createInitialRoom(
  code: string,
  hostPlayer: Player,
  settings: RoomSettings
): Room {
  const now = Date.now();
  return {
    code,
    phase: 'LOBBY',
    hostId: hostPlayer.id,
    settings,
    players: [hostPlayer],
    turnOrder: [],
    game: null,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
}

/**
 * Converte o modelo interno de Room para a visão segura exposta aos clientes
 */
export function toRoomView(room: Room, serverNow: number = Date.now()): RoomView {
  return {
    code: room.code,
    phase: room.phase,
    hostId: room.hostId,
    settings: room.settings,
    players: room.players,
    turnOrder: room.turnOrder,
    game: room.game
      ? {
          startLetter: room.game.startLetter,
          chooserId: room.game.chooserId,
          currentPlayerId: room.game.currentPlayerId,
          turnId: room.game.turnId,
          deadlineAt: room.game.deadlineAt,
          requiredPrefixes: room.game.requiredPrefixes,
          words: room.game.words,
          winnerId: room.game.winnerId,
        }
      : null,
    serverNow,
    version: room.version,
  };
}

/**
 * Resolve apelidos duplicados adicionando sufixo numérico (ex: Ana -> Ana2)
 */
export function resolveDuplicateNickname(
  existingNicknames: string[],
  requested: string
): string {
  const normalizedRequested = requested.trim().toLowerCase();
  const exists = existingNicknames.some(
    (n) => n.trim().toLowerCase() === normalizedRequested
  );
  if (!exists) return requested.trim();

  let counter = 2;
  while (
    existingNicknames.some(
      (n) => n.trim().toLowerCase() === `${normalizedRequested}${counter}`
    )
  ) {
    counter++;
  }
  return `${requested.trim()}${counter}`;
}

/**
 * Embaralha a ordem dos jogadores para a partida
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Encontra o próximo jogador ACTIVE na ordem circular dos turnos
 */
export function getNextActivePlayer(
  turnOrder: string[],
  players: Player[],
  currentPlayerId: string
): Player | null {
  const activePlayers = players.filter((p) => p.status === 'ACTIVE');
  if (activePlayers.length === 0) return null;

  const currentIdx = turnOrder.indexOf(currentPlayerId);
  const total = turnOrder.length;

  for (let step = 1; step <= total; step++) {
    const nextPlayerId = turnOrder[(currentIdx + step) % total];
    const player = players.find((p) => p.id === nextPlayerId);
    if (player && player.status === 'ACTIVE') {
      return player;
    }
  }

  return activePlayers[0] || null;
}

/**
 * Trata a saída do host, passando a liderança para o jogador mais antigo
 */
export function reassignHostIfHostLeft(room: Room): string | null {
  const currentHost = room.players.find((p) => p.id === room.hostId);
  if (currentHost) return room.hostId;

  if (room.players.length === 0) return null;

  // Encontra o jogador com menor joinedAt
  const oldestPlayer = [...room.players].sort((a, b) => a.joinedAt - b.joinedAt)[0];
  room.hostId = oldestPlayer.id;
  return room.hostId;
}
