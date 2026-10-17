import { describe, it, expect, beforeAll } from 'vitest';
import { normalizeWord } from '@conecta/shared';
import { dictionaryService } from '../src/services/dictionary.js';

describe('DictionaryService', () => {
  beforeAll(async () => {
    await dictionaryService.load();
  });

  it('carrega as fontes e fica pronto', () => {
    expect(dictionaryService.isReady()).toBe(true);
    // União de words-ptbr + words-brispell + words-extra.
    expect(dictionaryService.size()).toBeGreaterThan(400_000);
  });

  it('aceita palavras comuns que faltavam na base original', () => {
    const words = [
      'iodo',
      'sopa',
      'suco',
      'biscoito',
      'galera',
      'colina',
      'geada',
      'gelatina',
      'computador',
      'refrigerante',
      'torneira',
    ];
    for (const word of words) {
      expect(dictionaryService.has(word), `esperava conter "${word}"`).toBe(true);
    }
  });

  it('aceita termos informais, gírias e abreviações', () => {
    const words = [
      'blz',
      'vlw',
      'flw',
      'tmj',
      'mds',
      'zuera',
      'zueira',
      'daora',
      'sussa',
      'deboas',
      'mermo',
      'vibe',
      'parca',
      'mano',
      'perrengue',
      'coxinha',
      'acaraje',
    ];
    for (const word of words) {
      expect(dictionaryService.has(word), `esperava conter "${word}"`).toBe(true);
    }
  });

  it('normaliza acentos na carga (adoçante -> adocante)', () => {
    expect(dictionaryService.has(normalizeWord('adoçante'))).toBe(true);
    expect(dictionaryService.has(normalizeWord('acarajé'))).toBe(true);
    expect(dictionaryService.has('arcoiris')).toBe(true);
  });

  it('não contém palavras inexistentes', () => {
    expect(dictionaryService.has('xilofonormico')).toBe(false);
  });
});
