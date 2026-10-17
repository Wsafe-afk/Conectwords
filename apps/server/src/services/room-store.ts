import { Redis } from 'ioredis';
import type { Room } from '@conecta/shared';

export interface RoomRepository {
  get(code: string): Promise<Room | null>;
  save(room: Room): Promise<void>;
  delete(code: string): Promise<void>;
  exists(code: string): Promise<boolean>;
  listActiveCodes(): Promise<string[]>;
}

export class InMemoryRoomStore implements RoomRepository {
  private rooms = new Map<string, Room>();

  async get(code: string): Promise<Room | null> {
    const r = this.rooms.get(code.toUpperCase());
    return r ? JSON.parse(JSON.stringify(r)) : null;
  }

  async save(room: Room): Promise<void> {
    room.updatedAt = Date.now();
    this.rooms.set(room.code.toUpperCase(), JSON.parse(JSON.stringify(room)));
  }

  async delete(code: string): Promise<void> {
    this.rooms.delete(code.toUpperCase());
  }

  async exists(code: string): Promise<boolean> {
    return this.rooms.has(code.toUpperCase());
  }

  async listActiveCodes(): Promise<string[]> {
    return Array.from(this.rooms.keys());
  }
}

export class RedisRoomStore implements RoomRepository {
  private redis?: Redis;
  private fallbackStore: InMemoryRoomStore;
  private isConnected = false;

  constructor(redisUrl?: string) {
    this.fallbackStore = new InMemoryRoomStore();
    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl, {
          retryStrategy: (times: number) => Math.min(times * 100, 3000),
          maxRetriesPerRequest: 1,
          lazyConnect: true,
        });

        this.redis.connect().then(() => {
          this.isConnected = true;
          console.log(' Conectado com sucesso ao Redis!');
        }).catch((err: any) => {
          console.warn('⚠️ Não foi possível conectar ao Redis. Usando armazenamento em memória local.', err.message);
          this.isConnected = false;
        });

        this.redis.on('error', () => {
          this.isConnected = false;
        });
        this.redis.on('connect', () => {
          this.isConnected = true;
        });
      } catch (err: any) {
        console.warn('⚠️ Falha ao inicializar Redis:', err.message);
      }
    }
  }

  async get(code: string): Promise<Room | null> {
    if (!this.isConnected || !this.redis) {
      return this.fallbackStore.get(code);
    }
    try {
      const data = await this.redis.get(`room:${code.toUpperCase()}`);
      if (!data) return null;
      return JSON.parse(data) as Room;
    } catch {
      return this.fallbackStore.get(code);
    }
  }

  async save(room: Room): Promise<void> {
    room.updatedAt = Date.now();
    await this.fallbackStore.save(room);

    if (this.isConnected && this.redis) {
      try {
        const ttlSeconds = room.phase === 'LOBBY' ? 1800 : 3600; // 30 min lobby, 1h partida
        await this.redis.set(`room:${room.code.toUpperCase()}`, JSON.stringify(room), 'EX', ttlSeconds);
        await this.redis.sadd('rooms:active', room.code.toUpperCase());
      } catch {
        // Fallback já salvou
      }
    }
  }

  async delete(code: string): Promise<void> {
    await this.fallbackStore.delete(code);
    if (this.isConnected && this.redis) {
      try {
        await this.redis.del(`room:${code.toUpperCase()}`);
        await this.redis.srem('rooms:active', code.toUpperCase());
      } catch {
        // ignora erro no delete do redis
      }
    }
  }

  async exists(code: string): Promise<boolean> {
    if (this.isConnected && this.redis) {
      try {
        const res = await this.redis.exists(`room:${code.toUpperCase()}`);
        return res === 1;
      } catch {
        return this.fallbackStore.exists(code);
      }
    }
    return this.fallbackStore.exists(code);
  }

  async listActiveCodes(): Promise<string[]> {
    if (this.isConnected && this.redis) {
      try {
        return await this.redis.smembers('rooms:active');
      } catch {
        return this.fallbackStore.listActiveCodes();
      }
    }
    return this.fallbackStore.listActiveCodes();
  }
}

export const roomStore = new RedisRoomStore(process.env.REDIS_URL);
