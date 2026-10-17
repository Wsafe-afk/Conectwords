# Contratos de API — "Conecta Palavras"

Todos os payloads são validados por schemas Zod em `packages/shared`. Campos extras são rejeitados.

## 1. REST (Fastify)

### `POST /api/rooms`
Cria sala.
```jsonc
// Request
{ "nickname": "Ana" }
// 201
{ "code": "K7M2P", "playerId": "pl_abc", "sessionToken": "…", "room": { /* RoomView */ } }
// 400 INVALID_NICKNAME | 429 RATE_LIMITED
```

### `POST /api/rooms/:code/join`
```jsonc
{ "nickname": "Bia" }
// 200 → { "playerId", "sessionToken", "room": RoomView }
// 404 ROOM_NOT_FOUND | 409 ROOM_FULL | 409 GAME_IN_PROGRESS | 400 INVALID_NICKNAME | 429 RATE_LIMITED
```

### `GET /api/rooms/:code`
Verifica se a sala existe e aceita entrada (para a tela de convite).
```jsonc
// 200
{ "code": "K7M2P", "phase": "LOBBY", "players": 3, "maxPlayers": 6, "joinable": true }
// 404 ROOM_NOT_FOUND
```

### `GET /health` → `200 { "status": "ok" }`
### `GET /ready` → `200` se Redis e dicionário OK, senão `503`
### `GET /metrics` → formato Prometheus (protegido por token/IP interno)

### Formato de erro (REST e WS)
```json
{ "error": { "code": "ROOM_FULL", "message": "A sala está cheia." } }
```

## 2. WebSocket (Socket.IO)

**Conexão:** `io(URL, { auth: { sessionToken } })`. Token inválido ⇒ `connect_error` com `UNAUTHORIZED`.
Ao conectar, o servidor coloca o socket na room `room:{code}` e envia `room:state`.

### 2.1 Cliente → Servidor

| Evento | Payload | Quem pode | Descrição |
|---|---|---|---|
| `time:sync` | `{ clientTime }` | todos | Retorna `time:sync:ack { clientTime, serverTime }` |
| `settings:update` | `Partial<RoomSettings>` | host, em LOBBY | |
| `player:kick` | `{ playerId }` | host, em LOBBY | |
| `game:start` | `{}` | host, LOBBY, ≥ 2 jogadores | |
| `letter:choose` | `{ letter: "A".."Z" }` | chooser, em CHOOSING_LETTER | |
| `draft:update` | `{ text, seq }` | jogador da vez | Texto parcial (≤ 32) |
| `word:submit` | `{ word }` | jogador da vez | |
| `reaction:send` | `{ emoji }` | qualquer na sala | Emoji de lista fixa |
| `game:playAgain` | `{}` | host, em FINISHED | Volta para LOBBY |
| `room:leave` | `{}` | todos | |

Todo evento do cliente aceita **ack** `(res) => …` com `{ ok: true }` ou `{ ok: false, error }`.

### 2.2 Servidor → Cliente

| Evento | Payload | Para quem |
|---|---|---|
| `room:state` | `RoomView` completo (+ `version`) | conexão/reconexão |
| `player:joined` | `{ player }` | sala |
| `player:left` | `{ playerId, reason: 'left'\|'kicked'\|'timeout' }` | sala |
| `player:connection` | `{ playerId, connected }` | sala |
| `host:changed` | `{ hostId }` | sala |
| `settings:changed` | `RoomSettings` | sala |
| `game:started` | `{ turnOrder, chooserId, deadlineAt }` | sala |
| `letter:chosen` | `{ letter, auto: boolean }` | sala |
| `turn:started` | `{ turnId, playerId, requiredPrefixes, deadlineAt }` | sala |
| `draft:changed` | `{ playerId, text, seq }` | sala **exceto** remetente |
| `word:accepted` | `{ entry: WordEntry, nextPrefixes }` | sala |
| `word:rejected` | `{ reason: RejectReason, detail? }` | **só remetente** |
| `turn:timeout` | `{ playerId, livesLeft }` | sala |
| `player:eliminated` | `{ playerId }` | sala |
| `game:finished` | `{ winnerId, stats }` | sala |
| `reaction:received` | `{ playerId, emoji }` | sala |
| `server:degraded` | `{}` | sala |
| `error` | `{ code, message }` | remetente |

### 2.3 Códigos
```ts
type RejectReason =
  | 'NOT_YOUR_TURN'
  | 'INVALID_CHARS'
  | 'TOO_SHORT'
  | 'WRONG_PREFIX'
  | 'ALREADY_USED'
  | 'NOT_IN_DICTIONARY'
  | 'RATE_LIMITED';

type ErrorCode =
  | 'UNAUTHORIZED' | 'ROOM_NOT_FOUND' | 'ROOM_FULL' | 'GAME_IN_PROGRESS'
  | 'INVALID_NICKNAME' | 'INVALID_PAYLOAD' | 'INVALID_STATE'
  | 'FORBIDDEN' | 'RATE_LIMITED' | 'INTERNAL';
```

### 2.4 `RoomView` (o que o cliente recebe)
Subconjunto seguro do `Room`: `code`, `phase`, `hostId`, `settings`, `players` (sem token), `turnOrder`, e `game` com `startLetter`, `currentPlayerId`, `turnId`, `deadlineAt`, `requiredPrefixes`, `words`, `winnerId`, mais `serverNow` e `version`. Nunca inclui o dicionário nem segredos.

## 3. Sequências principais

### Rodada normal
```
Jogador da vez (A)         Servidor                     Demais
      │ draft:update "ale"     │                            │
      ├───────────────────────▶│ draft:changed (A,"ale") ──▶│
      │ word:submit "alegria"  │ valida (2.3 da spec)       │
      │◀── ack ok ─────────────┤ word:accepted ────────────▶│
      │                        │ turn:started (B, prefixos)▶│
```

### Rejeição
```
A: word:submit "barco"  →  servidor: word:rejected {WRONG_PREFIX}  →  só A recebe (turno continua)
```

### Timeout
```
Servidor (deadline) → turn:timeout {A, livesLeft} → [player:eliminated] → turn:started (B, mesmos prefixos)
```

### Reconexão
```
Cliente reconecta com sessionToken → servidor marca connected:true → envia room:state → cliente re-renderiza
```

## 4. Garantias
- Eventos de uma sala são entregues **em ordem** (fila serial por sala + `version` incremental).
- Se o cliente perceber salto de `version`, deve pedir `room:state` (evento `room:resync`).
- Idempotência: `word:submit` repetido para o mesmo `turnId` após aceito retorna `NOT_YOUR_TURN`.
