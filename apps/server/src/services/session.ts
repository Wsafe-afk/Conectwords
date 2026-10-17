import { nanoid } from 'nanoid';

export interface SessionData {
  playerId: string;
  roomCode: string;
  createdAt: number;
}

export class SessionService {
  private sessions = new Map<string, SessionData>();

  createSession(playerId: string, roomCode: string): string {
    const token = `sess_${nanoid(24)}`;
    this.sessions.set(token, {
      playerId,
      roomCode,
      createdAt: Date.now(),
    });
    return token;
  }

  getSession(token: string): SessionData | null {
    return this.sessions.get(token) || null;
  }

  removeSession(token: string): void {
    this.sessions.delete(token);
  }
}

export const sessionService = new SessionService();
