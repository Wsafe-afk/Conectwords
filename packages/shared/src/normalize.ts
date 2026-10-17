import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from './constants.js';

/**
 * Normaliza uma palavra para comparação no jogo:
 * - Converte para minúsculas
 * - Remove acentos e diacríticos (incluindo til e cedilha: ação -> acao)
 * - Remove espaços e caracteres que não sejam a-z
 */
export function normalizeWord(word: string): string {
  if (!word) return '';
  return word
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ç/g, 'c')
    .replace(/[^a-z]/g, '');
}

/**
 * Valida se a palavra original digitada contém apenas letras válidas (com ou sem acento),
 * rejeitando hífens, números, espaços ou símbolos.
 */
export function isValidWordCharacters(rawWord: string): boolean {
  if (!rawWord || typeof rawWord !== 'string') return false;
  const trimmed = rawWord.trim();
  if (trimmed.length === 0) return false;
  // Permite apenas letras latinas com ou sem acentos/cedilha
  return /^[A-Za-zÀ-ÿ]+$/.test(trimmed);
}

/**
 * Limpa o rascunho de digitação em tempo real (máx 32 caracteres)
 */
export function cleanDraftText(text: string): string {
  if (!text) return '';
  return text.trim().slice(0, 32);
}

/**
 * Gera um código de sala aleatório de 5 caracteres usando o alfabeto sem ambiguidade
 */
export function generateRoomCode(): string {
  let result = '';
  const charsLen = ROOM_CODE_ALPHABET.length;
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    const randomIndex = Math.floor(Math.random() * charsLen);
    result += ROOM_CODE_ALPHABET[randomIndex];
  }
  return result;
}
