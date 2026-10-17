import type { RejectReason, RoomSettings } from './types.js';

export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 5;

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  maxPlayers: 6,
  turnSeconds: 20,
  lives: 3,
  minWordLength: 3,
};

export const DEFAULT_RECONNECT_GRACE_MS = 60_000;
export const DEFAULT_LETTER_CHOOSE_SECONDS = 15;

export const AVAILABLE_EMOJIS = ['🔥', '😂', '👏', '😱', '🧠', '❤️', '⏱️', '🤯'] as const;

export const REJECT_REASON_MESSAGES: Record<RejectReason, string> = {
  NOT_YOUR_TURN: 'Não é a sua vez de jogar.',
  INVALID_CHARS: 'Apenas letras são permitidas (sem números, hífens ou espaços).',
  TOO_SHORT: 'A palavra é mais curta que o tamanho mínimo.',
  WRONG_PREFIX: 'A palavra não começa com o prefixo exigido.',
  ALREADY_USED: 'Esta palavra já foi usada nesta partida.',
  NOT_IN_DICTIONARY: 'Palavra não encontrada no dicionário pt-BR.',
  RATE_LIMITED: 'Muitas tentativas rápidas. Aguarde um instante.',
};
