export type RoomPhase = 'LOBBY' | 'CHOOSING_LETTER' | 'PLAYING' | 'FINISHED';

export type PlayerStatus = 'ACTIVE' | 'ELIMINATED';

export interface RoomSettings {
  maxPlayers: number;        // 2..8, padrão 6
  turnSeconds: 10 | 15 | 20 | 30; // padrão 20
  lives: number;             // 1..5, padrão 3
  minWordLength: number;     // 2..5, padrão 3
}

export interface Player {
  id: string;
  nickname: string;
  avatar: number;
  connected: boolean;
  disconnectedAt: number | null;
  lives: number;
  status: PlayerStatus;
  joinedAt: number;
}

export interface WordEntry {
  playerId: string;
  word: string;          // como digitada (exibição)
  normalized: string;    // comparação
  matchedPrefix: string; // 'a' ou 'sa'
  at: number;            // epoch ms
}

export interface GameState {
  startLetter: string | null;
  chooserId: string;
  currentPlayerId: string;
  turnId: number;
  deadlineAt: number;
  requiredPrefixes: string[];
  words: WordEntry[];
  usedSet: string[];
  winnerId: string | null;
}

export interface Room {
  code: string;
  phase: RoomPhase;
  hostId: string;
  settings: RoomSettings;
  players: Player[];
  turnOrder: string[];
  game: GameState | null;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export interface GameView {
  startLetter: string | null;
  chooserId: string;
  currentPlayerId: string;
  turnId: number;
  deadlineAt: number;
  requiredPrefixes: string[];
  words: WordEntry[];
  winnerId: string | null;
}

export interface RoomView {
  code: string;
  phase: RoomPhase;
  hostId: string;
  settings: RoomSettings;
  players: Player[];
  turnOrder: string[];
  game: GameView | null;
  serverNow: number;
  version: number;
}

export type RejectReason =
  | 'NOT_YOUR_TURN'
  | 'INVALID_CHARS'
  | 'TOO_SHORT'
  | 'WRONG_PREFIX'
  | 'ALREADY_USED'
  | 'NOT_IN_DICTIONARY'
  | 'RATE_LIMITED';

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'GAME_IN_PROGRESS'
  | 'INVALID_NICKNAME'
  | 'INVALID_PAYLOAD'
  | 'INVALID_STATE'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'INTERNAL';

export interface DraftUpdate {
  playerId: string;
  text: string;
  seq: number;
}

export interface ReactionEvent {
  playerId: string;
  emoji: string;
}
