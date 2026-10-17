# Plano Técnico — "Conecta Palavras"

Deriva de `spec.md` e respeita `constitution.md`.

## 1. Stack e justificativas
| Camada | Escolha | Por quê |
|---|---|---|
| Monorepo | **pnpm workspaces** (+ Turborepo) | Compartilhar tipos/schemas entre front e back |
| Frontend | **React 18 + Vite + TypeScript** | Bundle pequeno, ótimo para mobile |
| Estilo | **Tailwind CSS** + tokens CSS (tema cartoon) | Mobile first nativo, iteração rápida |
| Animação | **Framer Motion** + `canvas-confetti` | Squash & stretch, springs, confete |
| Estado cliente | **Zustand** | Simples; o estado vem do servidor |
| Roteamento | **React Router** | `/`, `/s/:code`, `/room/:code` |
| Backend | **Node 22 + Fastify + Socket.IO** | WebSocket com reconexão, rooms e adapter Redis |
| Validação | **Zod** (pacote `shared`) | Mesmo schema nos dois lados |
| Estado das salas | **Redis 7** | Recuperação após restart, TTL, escala horizontal |
| Persistência opcional | PostgreSQL (fase 2: histórico/estatísticas) | Fora do MVP |
| Testes | **Vitest** (unit), **Playwright** (E2E mobile), **k6** (carga) | |
| Observabilidade | **pino** (logs), **prom-client** (métricas) | |
| Deploy | Docker + docker-compose (dev), Fly.io/Render/Railway (prod) | |

## 2. Estrutura do repositório
```
/
├─ apps/
│  ├─ web/                 # React + Vite
│  │  └─ src/{pages,components,fx,hooks,store,lib,i18n}
│  └─ server/              # Fastify + Socket.IO
│     └─ src/
│        ├─ http/          # rotas REST, health
│        ├─ ws/            # gateway Socket.IO, handlers por evento
│        ├─ domain/        # motor de regras (puro)
│        ├─ services/      # RoomService, TimerService, DictionaryService
│        ├─ infra/         # redis, logger, metrics, config
│        └─ data/          # words-ptbr.txt (versionado)
├─ packages/
│  └─ shared/              # tipos, schemas Zod, constantes, normalize()
├─ docs/                   # dictionary.md, runbook.md
└─ specs/                  # constitution, spec, plan, data-model, contracts, tasks
```

## 3. Arquitetura do backend

### 3.1 Camadas
1. **Gateway (ws/http):** autentica sessão, valida payload (Zod), aplica rate limit, chama serviços. Sem regra de negócio.
2. **Serviços:** orquestram I/O (Redis, timers, broadcast).
3. **Domínio (puro):** funções `(state, comando) → { state, eventos } | erro`. Totalmente testável sem rede.

### 3.2 Máquina de estados da sala
```
LOBBY ──start──▶ CHOOSING_LETTER ──letter──▶ PLAYING ──(1 ativo)──▶ FINISHED
   ▲                                              │                      │
   └──────────────────── playAgain ───────────────┴──────────────────────┘
```
Transições inválidas são rejeitadas com erro `INVALID_STATE`.

### 3.3 Autoridade e concorrência
- Cada sala tem **um único escritor lógico**: o nó que detém o *lock de sala* no Redis (`SET room:{code}:owner nodeId NX PX 10000`, renovado por heartbeat). Eventos de qualquer nó que não seja o dono são roteados ao dono via Redis Pub/Sub (ou o balanceador usa *sticky routing* por código da sala — preferido: `hash(code) → nó`).
- Todo comando é aplicado em fila serial por sala (evita corrida entre `submitWord` e `timeout`).
- Estado persistido a cada transição relevante (não a cada rascunho).

### 3.4 Timers
- O turno guarda `deadlineAt` (epoch ms do servidor).
- O nó dono agenda `setTimeout` até o prazo; ao disparar, enfileira o comando `TIMEOUT(turnId)`. O `turnId` impede que um timeout atrasado atue sobre um turno já encerrado.
- Após restart: o nó que assumir a sala lê `deadlineAt` e reagenda (se já passou, aplica timeout imediatamente).

### 3.5 Digitação em tempo real
- Cliente envia `draft:update { text }` com *throttle* ~50 ms e só se mudou.
- Servidor: valida que quem enviou é o jogador da vez, trunca/limpa (`/[^a-zA-ZÀ-ÿ]/` removidos, máx. 32 chars) e faz broadcast `draft:changed { playerId, text, seq }` para a sala, **excluindo** o remetente.
- `seq` monotônico evita que mensagens fora de ordem sobrescrevam as novas.
- Rascunho **não** é persistido; fica só em memória do nó dono.
- Sem validação de dicionário no rascunho (custo zero).

### 3.6 Dicionário
- Arquivo `words-ptbr.txt` carregado no boot em um `Set<string>` de palavras normalizadas (~1M entradas ≈ 60–100 MB; avaliar `Bloom filter`/trie se necessário).
- `normalize(word)`: `toLowerCase()` → `normalize('NFD')` → remove `\p{Diacritic}` → mantém `[a-z]`.
- Endpoint de readiness só fica OK após o dicionário carregar.

### 3.7 Sessões e reconexão
- Ao entrar, o servidor emite `sessionToken` (JWT curto assinado ou ID opaco no Redis) com `playerId` + `roomCode`; o cliente guarda no `localStorage`.
- Em desconexão, o jogador fica `connected:false` por 60 s (período de graça). Se for a vez dele, o timer segue normalmente.
- Passado o prazo no lobby: removido. Em partida: mantido como desconectado e perde por tempo até eliminação.

### 3.8 Segurança e abuso
- Rate limit (token bucket): criação de sala 5/min/IP; entrada 20/min/IP; `draft:update` 30/s/socket; `word:submit` 5/s/socket; reações 3/s/socket.
- Payload máx. 1 KB; `maxHttpBufferSize` do Socket.IO reduzido.
- Origem permitida via `CORS_ORIGINS`.
- Apelido sanitizado (trim, colapsa espaços, 2–16 chars, bloqueia caracteres de controle) + lista de bloqueio opcional.
- Nenhum HTML renderizado: React escapa por padrão; proibido `dangerouslySetInnerHTML`.
- Erros internos nunca vazam stack para o cliente.

### 3.9 Observabilidade
- Logs `pino` com `roomCode`, `playerId`, `event`, `latencyMs`.
- Métricas: `rooms_active`, `sockets_connected`, `words_submitted_total{result}`, `ws_event_duration_seconds`, `timeouts_total`, `redis_errors_total`.
- `/health` (processo vivo) e `/ready` (Redis + dicionário OK).

### 3.10 Escalabilidade
- Socket.IO com `@socket.io/redis-adapter` para broadcast entre nós.
- Balanceador com *sticky sessions* (necessário para long-polling fallback) e roteamento por sala quando possível.
- Salas com TTL no Redis: lobby ocioso 30 min, encerrada 1 h.

## 4. Arquitetura do frontend

### 4.1 Princípios
- **Mobile first:** CSS escrito para 360 px; breakpoints `sm/md/lg` apenas adicionam.
- Usa `100dvh` e `visualViewport` para manter o campo de digitação acima do teclado virtual.
- O store Zustand reflete o **estado do servidor** (`room:state` completo + eventos incrementais); ações do usuário apenas emitem eventos.
- Atualização otimista **somente** para o texto do próprio campo.

### 4.2 Módulo de efeitos (`/fx`)
- `useFx()` expõe `play('accepted' | 'rejected' | 'lifeLost' | 'win' | 'tick')`.
- Respeita `prefers-reduced-motion` e a preferência de som.
- Efeitos pesados (confete) carregados via `import()` sob demanda.
- Componentes: `<SpeechBubble>` (digitação alheia), `<LetterPop>`, `<HeartBurst>`, `<Timer>`, `<Chain>`.

### 4.3 Relógio
- Ao conectar, o cliente calcula `offset = serverNow - clientNow` (com `time:sync`) e exibe `deadlineAt - (Date.now() + offset)`.

### 4.4 Rotas
| Rota | Tela |
|---|---|
| `/` | Home |
| `/s/:code` | Link de convite → pede apelido → entra |
| `/room/:code` | Lobby / Partida / Resultado (conforme `phase`) |

## 5. Estratégia de testes
- **Unit (domínio):** todas as regras de 2.3 e transições de estado; propriedades (fast-check) para `normalize` e encadeamento.
- **Integração:** servidor real + Redis de teste + vários clientes `socket.io-client` simulando partidas completas, timeout, reconexão, host saindo.
- **E2E (Playwright):** 2–3 contextos de navegador em viewport 360×640 jogando uma partida; verificar digitação ao vivo.
- **Carga (k6):** 2.000 salas, 4 jogadores, `draft:update` a 10 ev/s por jogador da vez; metas de RNF-001/002.
- **Acessibilidade:** axe no CI + checagem manual de reduced motion.

## 6. CI/CD
- GitHub Actions: lint → typecheck → unit → integração (service Redis) → build → E2E.
- Deploy de preview por PR; produção por tag.
- Imagens Docker multi-stage; `healthcheck` configurado.

## 7. Configuração (variáveis de ambiente)
`PORT`, `REDIS_URL`, `CORS_ORIGINS`, `SESSION_SECRET`, `NODE_ID`, `LOG_LEVEL`, `DICTIONARY_PATH`, `TURN_DEFAULT_SECONDS`, `RECONNECT_GRACE_SECONDS`.

## 8. Riscos e mitigações
| Risco | Mitigação |
|---|---|
| Qualidade/licença do dicionário | Documentar fonte; permitir lista de exclusão; reportar palavra via feedback (fase 2) |
| Dicionário grande consome memória | Medir; trocar por trie compacto ou Bloom filter + checagem exata |
| Teclado virtual cobre a UI | `visualViewport` + testes em iOS Safari e Chrome Android reais |
| Latência alta degrada digitação ao vivo | Throttle + `seq`; degradar para atualizar só a cada 150 ms se necessário |
| Corrida timeout × envio de palavra | Fila serial por sala + `turnId` |
| Falha do Redis | Retry com backoff; `/ready` falha; sala marcada como instável; clientes recebem `server:degraded` |
