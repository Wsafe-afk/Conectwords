import { describe, it, expect } from 'vitest';
import { CreateRoomSchema, RoomCodeSchema, ChooseLetterSchema, WordSubmitSchema } from '../src/schemas.js';

describe('Zod Schemas', () => {
  it('valida apelido na criação de sala', () => {
    expect(CreateRoomSchema.safeParse({ nickname: 'Ana' }).success).toBe(true);
    expect(CreateRoomSchema.safeParse({ nickname: 'A' }).success).toBe(false);
    expect(CreateRoomSchema.safeParse({ nickname: 'NomeMuitoLongoComMaisDe16Caracteres' }).success).toBe(false);
    expect(CreateRoomSchema.safeParse({ nickname: '<script>' }).success).toBe(false);
  });

  it('valida código de sala', () => {
    expect(RoomCodeSchema.safeParse('K7M2P').success).toBe(true);
    expect(RoomCodeSchema.safeParse('ABCDE').success).toBe(true);
    expect(RoomCodeSchema.safeParse('ABCD').success).toBe(false); // 4 chars
    expect(RoomCodeSchema.safeParse('ABCDEF').success).toBe(false); // 6 chars
    expect(RoomCodeSchema.safeParse('ABCD1').success).toBe(false); // '1' is ambiguous, not in alphabet
  });

  it('valida escolha de letra', () => {
    expect(ChooseLetterSchema.safeParse({ letter: 'A' }).success).toBe(true);
    expect(ChooseLetterSchema.safeParse({ letter: 'z' }).success).toBe(true);
    expect(ChooseLetterSchema.safeParse({ letter: 'AB' }).success).toBe(false);
    expect(ChooseLetterSchema.safeParse({ letter: '1' }).success).toBe(false);
  });

  it('valida submissão de palavra', () => {
    expect(WordSubmitSchema.safeParse({ word: 'alegria' }).success).toBe(true);
    expect(WordSubmitSchema.safeParse({ word: '' }).success).toBe(false);
  });
});
