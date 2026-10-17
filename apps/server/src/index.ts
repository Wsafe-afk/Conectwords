import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server as SocketIOServer } from 'socket.io';
import { dictionaryService } from './services/dictionary.js';
import { registerRoutes } from './http/routes.js';
import { setupWebSocket } from './ws/gateway.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const CORS_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000').split(',');

async function startServer() {
  const app = Fastify({
    logger: {
      transport: {
        target: 'pino-pretty',
        options: { colorize: true },
      },
    },
  });

  await app.register(cors, {
    origin: (origin, cb) => {
      // Permite requisições sem origin (como mobile apps ou curl) ou se a origem estiver na lista
      if (!origin || CORS_ORIGINS.includes(origin) || CORS_ORIGINS.includes('*') || origin.startsWith('http://localhost:')) {
        cb(null, true);
        return;
      }
      cb(null, true); // Permissivo em dev local
    },
    credentials: true,
  });

  // Cria o servidor Socket.IO anexado ao servidor HTTP do Fastify
  const io = new SocketIOServer(app.server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    maxHttpBufferSize: 1024, // Limite de 1 KB de payload por RNF-004
    pingTimeout: 10000,
    pingInterval: 5000,
  });

  // Carrega o dicionário pt-BR no boot (RF-030)
  app.log.info('Carregando dicionário pt-BR em memória...');
  try {
    const wordCount = await dictionaryService.load();
    app.log.info(`Dicionário pt-BR carregado com sucesso: ${wordCount.toLocaleString()} palavras.`);
  } catch (err: any) {
    app.log.error(`Erro ao carregar dicionário: ${err.message}`);
  }

  // Registra rotas HTTP REST
  await registerRoutes(app);

  // Configura gateway WebSocket
  setupWebSocket(io);

  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    app.log.info(` Servidor Conecta Palavras rodando em http://localhost:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

startServer();
