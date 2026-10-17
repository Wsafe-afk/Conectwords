import { describe, it, expect } from 'vitest';
import {
  deriveNextPrefixes,
  validateWord,
  getNextActivePlayer,
  resolveDuplicateNickname,
  reassignHostIfHostLeft,
  createInitialRoom,
} from '../src/domain/index.js';
import type { Player, RoomSettings } from '@conecta/shared';

const mockDictionary = new Set(['casa', 'alegria', 'saudade', 'dia', 'amor', 'sapo', 'pato']);
const mockDictHas = (word: string) => mockDictionary.has(word);

describe('deriveNextPrefixes (CA-005)', () => {
  it('deriva última e duas últimas letras para palavras normais', () => {
    expect(deriveNextPrefixes('casa')).toEqual(['a', 'sa']);
    expect(deriveNextPrefixes('amor')).toEqual(['r', 'or']);
    expect(deriveNextPrefixes('sol')).toEqual(['l', 'ol']);
  });

  it('evita duplicatas quando a última e as duas últimas são idênticas ou colidem', () => {
    expect(deriveNextPrefixes('aa')).toEqual(['a', 'aa']);
  });

  it('lida com palavra de apenas 1 letra', () => {
    expect(deriveNextPrefixes('a')).toEqual(['a']);
  });
});

describe('validateWord - Ordem de checagem (Spec 2.3, CA-005..007)', () => {
  const defaultOpts = {
    minWordLength: 3,
    requiredPrefixes: ['a', 'sa'],
    usedSet: new Set(['amor']),
    dictionaryHas: mockDictHas,
  };

  it('1. Rejeita caracteres inválidos (números, hífens, símbolos)', () => {
    const res = validateWord({ ...defaultOpts, rawWord: 'guarda-chuva' });
    expect(res.valid).toBe(false);
    if (!res.valid) expect(res.reason).toBe('INVALID_CHARS');
  });

  it('2. Rejeita palavra menor que tamanho mínimo', () => {
    const res = validateWord({ ...defaultOpts, rawWord: 'ai' });
    expect(res.valid).toBe(false);
    if (!res.valid) expect(res.reason).toBe('TOO_SHORT');
  });

  it('3. Rejeita palavra com prefixo errado', () => {
    const res = validateWord({ ...defaultOpts, rawWord: 'barco' });
    expect(res.valid).toBe(false);
    if (!res.valid) expect(res.reason).toBe('WRONG_PREFIX');
  });

  it('4. Rejeita palavra já usada na partida', () => {
    const res = validateWord({ ...defaultOpts, rawWord: 'Amor' }); // já em usedSet
    expect(res.valid).toBe(false);
    if (!res.valid) expect(res.reason).toBe('ALREADY_USED');
  });

  it('5. Rejeita palavra ausente no dicionário', () => {
    const res = validateWord({ ...defaultOpts, rawWord: 'abacaxi' }); // não está no mock
    expect(res.valid).toBe(false);
    if (!res.valid) expect(res.reason).toBe('NOT_IN_DICTIONARY');
  });

  it('Aceita palavras válidas com 1 letra de prefixo ("alegria" -> "a")', () => {
    const res = validateWord({ ...defaultOpts, rawWord: 'Alegria' });
    expect(res.valid).toBe(true);
    if (res.valid) {
      expect(res.normalized).toBe('alegria');
      expect(res.matchedPrefix).toBe('a');
    }
  });

  it('Aceita palavras válidas com 2 letras de prefixo ("saudade" -> "sa")', () => {
    const res = validateWord({ ...defaultOpts, rawWord: 'Saudade' });
    expect(res.valid).toBe(true);
    if (res.valid) {
      expect(res.normalized).toBe('saudade');
      expect(res.matchedPrefix).toBe('sa');
    }
  });
});

describe('Ordem de turnos circular e eliminação (CA-010, CA-011)', () => {
  const p1: Player = {
    id: 'p1',
    nickname: 'Jogador 1',
    avatar: 1,
    connected: true,
    disconnectedAt: null,
    lives: 3,
    status: 'ACTIVE',
    joinedAt: 100,
  };
  const p2: Player = {
    id: 'p2',
    nickname: 'Jogador 2',
    avatar: 2,
    connected: true,
    disconnectedAt: null,
    lives: 0,
    status: 'ELIMINATED',
    joinedAt: 200,
  };
  const p3: Player = {
    id: 'p3',
    nickname: 'Jogador 3',
    avatar: 3,
    connected: true,
    disconnectedAt: null,
    lives: 2,
    status: 'ACTIVE',
    joinedAt: 300,
  };

  const turnOrder = ['p1', 'p2', 'p3'];
  const players = [p1, p2, p3];

  it('pula jogadores eliminados e rotaciona para o próximo ACTIVE', () => {
    const nextAfterP1 = getNextActivePlayer(turnOrder, players, 'p1');
    expect(nextAfterP1?.id).toBe('p3'); // p2 está ELIMINATED

    const nextAfterP3 = getNextActivePlayer(turnOrder, players, 'p3');
    expect(nextAfterP3?.id).toBe('p1'); // volta para p1
  });
});

describe('Apelidos duplicados e sucessão de host (RF-005, RF-007, CA-013)', () => {
  it('adiciona sufixo numérico quando o apelido já existe na sala', () => {
    expect(resolveDuplicateNickname(['Ana', 'Bia'], 'Ana')).toBe('Ana2');
    expect(resolveDuplicateNickname(['Ana', 'Ana2', 'Bia'], 'Ana')).toBe('Ana3');
    expect(resolveDuplicateNickname(['Ana', 'Bia'], 'Carlos')).toBe('Carlos');
  });

  it('passa o cargo de host para o jogador mais antigo quando o host sai', () => {
    const p1: Player = {
      id: 'p1',
      nickname: 'Ana',
      avatar: 1,
      connected: true,
      disconnectedAt: null,
      lives: 3,
      status: 'ACTIVE',
      joinedAt: 100,
    };
    const p2: Player = {
      id: 'p2',
      nickname: 'Bia',
      avatar: 2,
      connected: true,
      disconnectedAt: null,
      lives: 3,
      status: 'ACTIVE',
      joinedAt: 200,
    };
    const p3: Player = {
      id: 'p3',
      nickname: 'Caio',
      avatar: 3,
      connected: true,
      disconnectedAt: null,
      lives: 3,
      status: 'ACTIVE',
      joinedAt: 300,
    };

    const settings: RoomSettings = { maxPlayers: 6, turnSeconds: 20, lives: 3, minWordLength: 3 };
    const room = createInitialRoom('K7M2P', p1, settings);
    room.players.push(p2, p3);

    // Ana sai
    room.players = room.players.filter((p) => p.id !== 'p1');
    const newHostId = reassignHostIfHostLeft(room);

    expect(newHostId).toBe('p2'); // Bia é a mais antiga restante
    expect(room.hostId).toBe('p2');
  });
});
