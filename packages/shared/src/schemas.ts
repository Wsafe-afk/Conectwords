import { z } from 'zod';
import { AVAILABLE_EMOJIS, ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from './constants.js';

export const NicknameSchema = z
  .string()
  .trim()
  .min(2, { message: 'O apelido deve ter pelo menos 2 caracteres.' })
  .max(16, { message: 'O apelido pode ter no máximo 16 caracteres.' })
  .regex(/^[^<>]+$/, { message: 'Caracteres especiais não permitidos no apelido.' });

export const RoomCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .length(ROOM_CODE_LENGTH, { message: `O código deve ter ${ROOM_CODE_LENGTH} caracteres.` })
  .regex(new RegExp(`^[${ROOM_CODE_ALPHABET}]+$`), { message: 'Código de sala inválido.' });

export const RoomSettingsSchema = z.object({
  maxPlayers: z.number().int().min(2).max(8).default(6),
  turnSeconds: z.union([z.literal(10), z.literal(15), z.literal(20), z.literal(30)]).default(20),
  lives: z.number().int().min(1).max(5).default(3),
  minWordLength: z.number().int().min(2).max(5).default(3),
});

export const UpdateSettingsSchema = RoomSettingsSchema.partial();

export const CreateRoomSchema = z.object({
  nickname: NicknameSchema,
});

export const JoinRoomSchema = z.object({
  nickname: NicknameSchema,
});

export const ChooseLetterSchema = z.object({
  letter: z
    .string()
    .length(1)
    .toUpperCase()
    .regex(/^[A-Z]$/, { message: 'Apenas uma letra de A a Z é permitida.' }),
});

export const DraftUpdateSchema = z.object({
  text: z.string().max(32),
  seq: z.number().int().nonnegative(),
});

export const WordSubmitSchema = z.object({
  word: z
    .string()
    .trim()
    .min(1)
    .max(50),
});

export const ReactionSendSchema = z.object({
  emoji: z.string().refine((e) => AVAILABLE_EMOJIS.includes(e as any), {
    message: 'Emoji não suportado.',
  }),
});

export const KickPlayerSchema = z.object({
  playerId: z.string().min(1),
});

export const TimeSyncSchema = z.object({
  clientTime: z.number(),
});
