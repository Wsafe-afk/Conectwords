import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { Server as SocketIOServer } from 'socket.io';
import { dictionaryService } from './services/dictionary.js';
import { registerRoutes } from './http/routes.js';
import { setupWebSocket } from './ws/gateway.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  // Registra rotas HTTP REST (passa o io para notificar a sala em tempo real)
  await registerRoutes(app, io);

  // Configura gateway WebSocket
  setupWebSocket(io);

  // Se o frontend compilado existir, serve os arquivos estáticos (All-in-one deploy no Render)
  const webDistCandidates = [
    path.resolve(__dirname, '../../web/dist'),
    path.resolve(__dirname, '../../../apps/web/dist'),
    path.resolve(process.cwd(), 'apps/web/dist'),
    path.resolve(process.cwd(), 'dist'),
  ];
  const webDistPath = webDistCandidates.find((p) => fs.existsSync(p));

  if (webDistPath) {
    app.log.info(`Servindo arquivos estáticos do frontend de: ${webDistPath}`);
    await app.register(fastifyStatic, {
      root: webDistPath,
      prefix: '/',
      wildcard: false,
    });

    // Fallback SPA para rotas do React (como /room/:code e /s/:code)
    app.setNotFoundHandler((req, reply) => {
      const url = req.raw.url || '';
      if (url.startsWith('/api') || url.startsWith('/socket.io') || url === '/health' || url === '/ready') {
        reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Rota não encontrada.' } });
        return;
      }
      reply.sendFile('index.html');
    });
  }

  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    app.log.info(` Servidor Conecta Palavras rodando em http://localhost:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

startServer();
