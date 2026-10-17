import { create } from 'zustand';
import type {
  Player,
  RoomSettings,
  RoomView,
  WordEntry,
} from '@conecta/shared';

export interface FloatingReaction {
  id: string;
  emoji: string;
  playerId: string;
  x: number; // posição horizontal percentual (10% a 90%)
}

interface RoomState {
  sessionToken: string | null;
  playerId: string | null;
  roomCode: string | null;
  nickname: string;
  room: RoomView | null;
  clockOffset: number; // serverTime - clientTime
  currentDrafts: Record<string, { text: string; seq: number }>;
  lastError: string | null;
  lastReject: { reason: string; detail: string } | null;
  floatingReactions: FloatingReaction[];

  // Ações
  setNickname: (nickname: string) => void;
  setSession: (sessionToken: string, playerId: string, roomCode: string, nickname: string) => void;
  setRoom: (room: RoomView) => void;
  updateSettings: (settings: RoomSettings) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;
  updatePlayerConnection: (playerId: string, connected: boolean) => void;
  setHost: (hostId: string) => void;
  setDraft: (playerId: string, text: string, seq: number) => void;
  addWordAccepted: (entry: WordEntry, nextPrefixes: string[]) => void;
  setReject: (reject: { reason: string; detail: string } | null) => void;
  clearDrafts: () => void;
  setError: (error: string | null) => void;
  addFloatingReaction: (playerId: string, emoji: string) => void;
  syncClock: (clientTime: number, serverTime: number) => void;
  clearSession: () => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  sessionToken: localStorage.getItem('conecta_session_token'),
  playerId: localStorage.getItem('conecta_player_id'),
  roomCode: localStorage.getItem('conecta_room_code'),
  nickname: localStorage.getItem('conecta_nickname') || '',
  room: null,
  clockOffset: 0,
  currentDrafts: {},
  lastError: null,
  lastReject: null,
  floatingReactions: [],

  setNickname: (nickname) => {
    localStorage.setItem('conecta_nickname', nickname);
    set({ nickname });
  },

  setSession: (sessionToken, playerId, roomCode, nickname) => {
    localStorage.setItem('conecta_session_token', sessionToken);
    localStorage.setItem('conecta_player_id', playerId);
    localStorage.setItem('conecta_room_code', roomCode);
    localStorage.setItem('conecta_nickname', nickname);
    set({ sessionToken, playerId, roomCode, nickname });
  },

  setRoom: (room) => set({ room }),

  updateSettings: (settings) =>
    set((state) => (state.room ? { room: { ...state.room, settings } } : state)),

  addPlayer: (player) =>
    set((state) => {
      if (!state.room) return state;
      const exists = state.room.players.some((p) => p.id === player.id);
      const players = exists
        ? state.room.players.map((p) => (p.id === player.id ? player : p))
        : [...state.room.players, player];
      return { room: { ...state.room, players } };
    }),

  removePlayer: (playerId) =>
    set((state) => {
      if (!state.room) return state;
      const players = state.room.players.filter((p) => p.id !== playerId);
      return { room: { ...state.room, players } };
    }),

  updatePlayerConnection: (playerId, connected) =>
    set((state) => {
      if (!state.room) return state;
      const players = state.room.players.map((p) =>
        p.id === playerId ? { ...p, connected } : p
      );
      return { room: { ...state.room, players } };
    }),

  setHost: (hostId) =>
    set((state) => (state.room ? { room: { ...state.room, hostId } } : state)),

  setDraft: (playerId, text, seq) =>
    set((state) => {
      const prev = state.currentDrafts[playerId];
      if (prev && prev.seq > seq) return state; // ignora mensagens antigas fora de ordem
      return {
        currentDrafts: {
          ...state.currentDrafts,
          [playerId]: { text, seq },
        },
      };
    }),

  addWordAccepted: (entry, nextPrefixes) =>
    set((state) => {
      if (!state.room || !state.room.game) return state;
      const words = [...state.room.game.words, entry];
      return {
        room: {
          ...state.room,
          game: {
            ...state.room.game,
            words,
            requiredPrefixes: nextPrefixes,
          },
        },
        lastReject: null,
      };
    }),

  setReject: (lastReject) => set({ lastReject }),

  clearDrafts: () => set({ currentDrafts: {}, lastReject: null }),

  setError: (lastError) => set({ lastError }),

  addFloatingReaction: (playerId, emoji) => {
    const reaction: FloatingReaction = {
      id: Math.random().toString(36).substring(2, 9),
      playerId,
      emoji,
      x: 15 + Math.random() * 70, // entre 15% e 85%
    };
    set((state) => ({
      floatingReactions: [...state.floatingReactions.slice(-15), reaction],
    }));

    // Auto-remove após 2.5s
    setTimeout(() => {
      set((state) => ({
        floatingReactions: state.floatingReactions.filter((r) => r.id !== reaction.id),
      }));
    }, 2500);
  },

  syncClock: (clientTime, serverTime) => {
    const roundTrip = Date.now() - clientTime;
    const offset = serverTime - (clientTime + roundTrip / 2);
    set({ clockOffset: offset });
  },

  clearSession: () => {
    localStorage.removeItem('conecta_session_token');
    localStorage.removeItem('conecta_player_id');
    localStorage.removeItem('conecta_room_code');
    set({ sessionToken: null, playerId: null, roomCode: null, room: null });
  },
}));
