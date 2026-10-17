import { describe, it, expect } from 'vitest';
import { normalizeWord, isValidWordCharacters, generateRoomCode } from '../src/normalize.js';
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from '../src/constants.js';

describe('normalizeWord', () => {
  it('converte palavras com acentos e ç para formato normalizado', () => {
    expect(normalizeWord('ação')).toBe('acao');
    expect(normalizeWord('Coração')).toBe('coracao');
    expect(normalizeWord('Épico')).toBe('epico');
    expect(normalizeWord('VOVÔ')).toBe('vovo');
    expect(normalizeWord('Saudade')).toBe('saudade');
  });

  it('remove espaços e caracteres especiais', () => {
    expect(normalizeWord('  guarda-chuva  ')).toBe('guardachuva');
    expect(normalizeWord('olá mundo!')).toBe('olamundo');
  });
});

describe('isValidWordCharacters', () => {
  it('aceita palavras apenas com letras latinas e acentos', () => {
    expect(isValidWordCharacters('amigo')).toBe(true);
    expect(isValidWordCharacters('mãe')).toBe(true);
    expect(isValidWordCharacters('ÁGUA')).toBe(true);
  });

  it('rejeita números, hífens e caracteres especiais', () => {
    expect(isValidWordCharacters('guarda-chuva')).toBe(false);
    expect(isValidWordCharacters('teste123')).toBe(false);
    expect(isValidWordCharacters('palavra!')).toBe(false);
    expect(isValidWordCharacters('duas palavras')).toBe(false);
  });
});

describe('generateRoomCode', () => {
  it('gera códigos de 5 caracteres usando apenas o alfabeto permitido', () => {
    for (let i = 0; i < 20; i++) {
      const code = generateRoomCode();
      expect(code).toHaveLength(ROOM_CODE_LENGTH);
      for (const char of code) {
        expect(ROOM_CODE_ALPHABET).toContain(char);
      }
    }
  });
});
