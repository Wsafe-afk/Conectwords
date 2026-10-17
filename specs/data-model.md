# Modelo de Dados — "Conecta Palavras"

Tipos vivem em `packages/shared` (TypeScript + Zod). Abaixo, a forma lógica.

## 1. Entidades

### Room
| Campo | Tipo | Notas |
|---|---|---|
| `code` | string(5) | Chave pública; alfabeto sem ambíguos |
| `phase` | `'LOBBY' \| 'CHOOSING_LETTER' \| 'PLAYING' \| 'FINISHED'` | |
| `hostId` | PlayerId | |
| `settings` | RoomSettings | |
| `players` | Player[] | Ordem de entrada |
| `turnOrder` | PlayerId[] | Definida no início da partida |
| `game` | GameState \| null | Presente fora do LOBBY |
| `createdAt`, `updatedAt` | epoch ms | |
| `version` | number | Incrementa a cada mutação (para o cliente detectar perda de eventos) |

### RoomSettings
```ts
{
  maxPlayers: number;        // 2..8, padrão 6
  turnSeconds: 10|15|20|30;  // padrão 20
  lives: number;             // 1..5, padrão 3
  minWordLength: number;     // 2..5, padrão 3
}
```

### Player
| Campo | Tipo | Notas |
|---|---|---|
| `id` | string (nanoid) | |
| `nickname` | string 2–16 | Único na sala (sufixo automático) |
| `avatar` | number | Índice do avatar/cor cartoon |
| `connected` | boolean | |
| `disconnectedAt` | epoch ms \| null | Para o período de graça |
| `lives` | number | Só em partida |
| `status` | `'ACTIVE' \| 'ELIMINATED'` | |
| `joinedAt` | epoch ms | Define próximo host |

### GameState
| Campo | Tipo | Notas |
|---|---|---|
| `startLetter` | string(1) \| null | Escolhida no início |
| `chooserId` | PlayerId | 1º da ordem |
| `currentPlayerId` | PlayerId | Jogador da vez |
| `turnId` | number | Incrementa a cada turno (evita timeouts atrasados) |
| `deadlineAt` | epoch ms | Prazo do turno |
| `requiredPrefixes` | string[] | Ex.: `['a','sa']` ou `['b']` |
| `words` | WordEntry[] | Histórico da partida |
| `usedSet` | string[] | Palavras normalizadas (derivável de `words`) |
| `winnerId` | PlayerId \| null | |

### WordEntry
```ts
{
  playerId: string;
  word: string;          // como digitada (exibição)
  normalized: string;    // comparação
  matchedPrefix: string; // 'a' ou 'sa'
  at: number;            // epoch ms
}
```

### Draft (apenas memória, não persiste)
```ts
{ playerId: string; text: string; seq: number }
```

## 2. Regras de integridade
- `players.length ≤ settings.maxPlayers`.
- `hostId` sempre referencia um jogador existente enquanto a sala existe.
- `currentPlayerId` sempre é `ACTIVE` durante `PLAYING`.
- `usedSet` nunca contém duplicatas; é verificado antes de aceitar.
- `requiredPrefixes` tem 1 ou 2 itens; o 2º (quando existe) termina com o 1º.
- `turnId` estritamente crescente.
- Apenas 1 jogador `ACTIVE` ⇒ fase vira `FINISHED`.

## 3. Derivação de prefixos
Dada a palavra normalizada `w` aceita:
- `last1 = w.slice(-1)`
- `last2 = w.slice(-2)` (só se `w.length ≥ 2`)
- `requiredPrefixes = [last1, last2]` (sem duplicatas)

Após **timeout**, `requiredPrefixes` permanece.
Na 1ª palavra da partida: `requiredPrefixes = [startLetter]`.

## 4. Chaves no Redis
| Chave | Tipo | TTL | Conteúdo |
|---|---|---|---|
| `room:{code}` | JSON (string) ou Hash | lobby 30 min / encerrada 1 h (renovado a cada mutação) | Room completo |
| `room:{code}:owner` | string | 10 s (heartbeat) | nodeId dono |
| `session:{token}` | string | 24 h ou até a sala expirar | `{ playerId, roomCode }` |
| `rl:{scope}:{id}` | contador | janela | Rate limit |
| `rooms:active` | Set | — | Códigos ativos (métricas e unicidade) |

> Criação de código: gerar aleatório → `SET room:{code} ... NX`; em colisão, tentar de novo (até 10 vezes).

## 5. Fase 2 (opcional): PostgreSQL
```sql
CREATE TABLE matches (
  id uuid PRIMARY KEY,
  room_code text NOT NULL,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  settings jsonb NOT NULL,
  winner_nickname text
);
CREATE TABLE match_words (
  match_id uuid REFERENCES matches(id),
  seq int NOT NULL,
  nickname text NOT NULL,
  word text NOT NULL,
  matched_prefix text NOT NULL,
  PRIMARY KEY (match_id, seq)
);
```
Usado apenas para estatísticas; nunca no caminho crítico do jogo.
