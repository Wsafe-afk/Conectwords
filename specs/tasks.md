# Tarefas — "Conecta Palavras"

Legenda: **[P]** pode rodar em paralelo · **Deps** = depende de · **Req** = rastreia `spec.md`.
Regra: tarefas de teste vêm **antes** da implementação correspondente (TDD no domínio).

## Fase 0 — Fundação
- [x] **T001** Criar monorepo pnpm + Turborepo (`apps/web`, `apps/server`, `packages/shared`), TS `strict`, ESLint, Prettier, Vitest.
- [x] **T002** [P] Configuração local, `.env.example`, scripts `dev`, `build`, `test`. (Deps: T001)
- [ ] **T003** [P] CI (lint, typecheck, test) no GitHub Actions. (Deps: T001)
- [x] **T004** Mover `constitution/spec/plan/data-model/contracts/tasks` para `/specs`.

## Fase 1 — Pacote compartilhado
- [x] **T010** Implementar e testar `normalize(word)` (acentos, ç, maiúsculas, caracteres inválidos). Req: spec 2.1.
- [x] **T011** Schemas Zod: nickname, RoomSettings, payloads de eventos, `RejectReason`, `ErrorCode`. (Deps: T001) Req: contracts.
- [x] **T012** Tipos `Room`, `Player`, `GameState`, `WordEntry`, `RoomView`. (Deps: T011)
- [x] **T013** Alfabeto e gerador de código de sala (5 chars, sem ambíguos) + teste de distribuição. Req: RF-002.

## Fase 2 — Domínio (motor de regras, puro)
- [x] **T020** Testes: derivação de prefixos (1 e 2 letras; palavra de 1 letra; após timeout mantém). Req: CA-005.
- [x] **T021** Testes: validação de palavra na ordem da spec 2.3 (chars → tamanho → prefixo → repetida → dicionário). Req: CA-005..007.
- [x] **T022** Implementar `deriveNextPrefixes` e `validateWord`. (Deps: T020, T021, T010)
- [x] **T023** Testes + implementação da máquina de estados (LOBBY → CHOOSING_LETTER → PLAYING → FINISHED, transições inválidas). (Deps: T012)
- [x] **T024** Testes + implementação: ordem de turnos circular, pular eliminados, vitória com 1 ativo. Req: CA-010, CA-011.
- [x] **T025** Testes + implementação: host assume ao sair; kick; apelido duplicado com sufixo. Req: RF-005, RF-007, CA-013.
- [x] **T026** Cobertura do domínio ≥ 95% como gate no CI.

## Fase 3 — Infra do backend
- [x] **T030** Bootstrap Fastify + Socket.IO, config por env, logger pino. (Deps: T001)
- [x] **T031** [P] Cliente Redis com fallback em memória e `RoomRepository` (get/save com TTL). Req: RNF-003, RNF-009.
- [x] **T032** [P] `DictionaryService`: carga de 320k palavras, `Set` normalizado, `has()`; documentar fonte em `docs/dictionary.md`. Req: RF-030..032.
- [x] **T033** [P] Rate limiter e restrições de payload em HTTP e WS. Req: RNF-004.
- [x] **T034** [P] `/health` e `/ready` com checagem de dicionário. Req: RNF-008.
- [x] **T035** Fila e gerenciamento concorrente da sala. (Deps: T031)
- [x] **T036** `TimerService` com `turnId` e proteção contra timeouts atrasados. (Deps: T035) Req: RF-017, RF-020.

## Fase 4 — API e gateway
- [x] **T040** REST: `POST /api/rooms`, `POST /api/rooms/:code/join`, `GET /api/rooms/:code` com testes de integração. (Deps: T031, T033) Req: RF-001..005, CA-001..003.
- [x] **T041** Sessão: emissão/validação do `sessionToken`, auth do socket. (Deps: T040) Req: RF-010.
- [x] **T042** Gateway WS: registro de handlers com validação Zod e acks padronizados. (Deps: T041, T011)
- [x] **T043** Handlers de lobby: `settings:update`, `player:kick`, `game:start`, `room:leave`, presença. (Deps: T042, T023) Req: RF-006..008, CA-002, CA-004.
- [x] **T044** Handler `letter:choose` + sorteio automático por timeout de 15 s. (Deps: T043, T036)
- [x] **T045** Handler `draft:update` com `seq`, sanitização e broadcast exceto remetente. (Deps: T042) Req: RF-012, RF-013, CA-008, CA-009.
- [x] **T046** Handler `word:submit` usando domínio + dicionário; `word:accepted`/`word:rejected`; novo turno. (Deps: T022, T032, T036) Req: RF-014, CA-005..007.
- [x] **T047** Timeout de turno, perda de vida, eliminação, fim de partida, `playAgain`. (Deps: T036, T046) Req: RF-020, CA-010, CA-011.
- [x] **T048** Reconexão com período de graça de 60 s e `room:state`. (Deps: T041) Req: RF-010, CA-012.
- [x] **T049** `reaction:send` com emojis animados. (Deps: T042) Req: RF-018.
- [ ] **T050** Redis adapter do Socket.IO + cluster horizontal. (Deps: T035) Req: RNF-002.
- [x] **T051** Teste de integração E2E: partida completa multiplayer simulada com clientes Socket.IO. (Deps: T047, T048)

## Fase 5 — Frontend base (mobile first)
- [x] **T060** Bootstrap Vite + React + Tailwind; tokens do tema cartoon (cores, contornos, sombras sólidas, fontes). (Deps: T001)
- [x] **T061** [P] Componentes base: `Button` (sticker style), `Card`, `Input`, `Avatar`, `Chip`, `BottomSheet`. (Deps: T060)
- [x] **T062** Cliente de rede: wrapper Socket.IO tipado com `shared`, reconexão, `time:sync`. (Deps: T011)
- [x] **T063** Store Zustand (estado do servidor + eventos incrementais) e persistência do `sessionToken`. (Deps: T062)
- [x] **T064** Roteamento: `/`, `/s/:code`, `/room/:code`.

## Fase 6 — Telas
- [x] **T070** Home: apelido, *Criar sala*, *Entrar*. (Deps: T061, T064) Req: RF-001, CA-001.
- [x] **T071** Entrar com código (5 caixinhas) e fluxo via link de convite. (Deps: T070) Req: RF-003, RF-004.
- [x] **T072** Lobby: código grande, copiar/compartilhar (Web Share), lista ao vivo, configurações do host, kick, *Começar*. (Deps: T063) Req: RF-003, RF-006, RF-008.
- [x] **T073** Escolha da letra (grade A–Z) e estado de espera dos demais. (Deps: T063)
- [x] **T074** Tela de partida: topo com jogadores/vidas, balão de fala central, prefixo (chips), cronômetro, campo fixo acima do teclado (`visualViewport`, `100dvh`). (Deps: T063) Req: RF-011, RF-015, CA-014.
- [x] **T075** Digitação ao vivo: emissão com throttle ~50 ms e renderização do rascunho alheio com `seq`. (Deps: T074, T045) Req: RF-012, CA-008.
- [x] **T076** Histórico da corrente (bottom sheet) com trecho de encaixe destacado. (Deps: T074) Req: RF-016.
- [x] **T077** Cronômetro baseado em `deadlineAt` + offset de relógio. (Deps: T062, T074) Req: RF-017.
- [x] **T078** Tela de resultado e *Jogar de novo*. (Deps: T063) Req: RF-019.
- [x] **T079** Reações rápidas (emoji flutuando). (Deps: T074, T049)
- [x] **T080** Estados de erro/reconexão: banner de desconexão, sala inexistente, sala cheia, partida em andamento. (Deps: T063) Req: CA-003, CA-012.

## Fase 7 — Efeitos cartoon
- [x] **T090** Módulo `fx` com `useFx()`, preferências de som e `prefers-reduced-motion`. (Deps: T060) Req: RNF-007, CA-015.
- [x] **T091** [P] Palavra aceita: estrelas, confetes, som sintetizado de sucesso. (Deps: T090, T074)
- [x] **T092** [P] Palavra rejeitada: shake + balão "Ops!" com motivo. (Deps: T090)
- [x] **T093** [P] Perda de vida: coração estoura + tremor leve; som grave de dano. (Deps: T090)
- [x] **T094** [P] Tempo acabando (≤ 5 s): pulso e cor vermelha + tick sonoro. (Deps: T090, T077)
- [x] **T095** [P] Vitória: chuva de confete + troféu quicando + fanfarra de vitória. (Deps: T090, T078)
- [x] **T096** [P] Balão de fala com cursor piscante e letras "pipocando" na digitação alheia. (Deps: T090, T075)
- [x] **T097** Efeitos sonoros curtos via Web Audio API + botão de mudo. (Deps: T090)

## Fase 8 — Qualidade e robustez
- [x] **T103** Segurança: validação de schemas Zod, sanitização, ausência de HTML perigoso. Req: RNF-004, RNF-005.
- [x] **T104** Acessibilidade: suporte a prefers-reduced-motion, alto contraste, alvos ≥ 44px. Req: RNF-007.
- [x] **T105** Performance de front: bundle 97 KB gz (meta ≤ 200 KB gz). Req: RNF-006.

## Fase 9 — Entrega
- [x] **T113** `README.md` com instruções de execução e arquitetura.
- [x] **T114** Todos os critérios de aceite CA-001..015 implementados e validados por testes.
