# Especificação — "Conecta Palavras"

> Status: Rascunho v1 · Idioma do jogo: pt-BR · Tipo: Web app multiplayer em tempo real

## 1. Visão geral
Site para jogar **Conecte as Palavras** com amigos. Um jogador cria uma sala, compartilha o código, os outros entram e o jogo começa. Cada jogador, na sua vez, digita uma palavra que começa com a(s) letra(s) em que a palavra anterior terminou. Todos veem a digitação ao vivo.

## 2. Regras do jogo

### 2.1 Glossário
- **Letra inicial:** letra escolhida no começo da partida pelo primeiro jogador da ordem (o "escolhedor").
- **Prefixo exigido:** o que a próxima palavra precisa começar.
- **Encadeamento:** a palavra seguinte deve começar com **a última letra** OU **as duas últimas letras** da palavra anterior (o jogador escolhe qual usar).
- **Normalização:** para comparar, a palavra é convertida para minúsculas e sem acentos (`ação` → `acao`). Cedilha e til entram na regra de remoção de acento. Hífen e espaços não são aceitos.

### 2.2 Fluxo de uma partida
1. O host inicia a partida (mínimo 2 jogadores).
2. A ordem dos turnos é sorteada. O **1º da ordem escolhe a letra inicial** (A–Z, com botões grandes). Se não escolher em 15 s, o servidor sorteia uma letra.
3. O **2º jogador** deve digitar uma palavra que comece com a letra inicial.
4. A partir daí, cada jogador deve digitar uma palavra cujo início seja **a última letra ou as duas últimas letras** da palavra anterior.
5. A ordem dos turnos é circular entre jogadores ativos.
6. A palavra **não pode ser repetida** na mesma partida (comparação normalizada).
7. Cada turno tem um tempo limite. Estourou o tempo: perde **1 vida**, e o próximo jogador continua com o **mesmo prefixo exigido**.
8. Com 0 vidas, o jogador é eliminado (vira espectador). O último jogador com vidas vence.
9. Ao final, tela de resultado com vencedor, palavras jogadas, maior palavra e botão "Jogar de novo" (volta ao lobby, mantendo a sala).

### 2.3 Validação de palavra (ordem de checagem)
1. Contém apenas letras A–Z após normalização.
2. Tamanho ≥ tamanho mínimo da sala (padrão 3).
3. Começa com o prefixo exigido (1 ou 2 letras conforme as opções válidas do turno).
4. Não foi usada antes na partida.
5. Existe no dicionário pt-BR.

Palavra inválida **não** custa vida: o jogador vê o motivo e pode tentar de novo até o tempo acabar.

### 2.4 Configurações da sala (definidas pelo host no lobby)
| Opção | Valores | Padrão |
|---|---|---|
| Máx. jogadores | 2–8 | 6 |
| Tempo por turno | 10 / 15 / 20 / 30 s | 20 s |
| Vidas | 1–5 | 3 |
| Tamanho mínimo da palavra | 2–5 | 3 |

## 3. Requisitos funcionais

### Menu inicial e salas
- **RF-001** A home exibe dois caminhos: **Criar sala** e **Entrar com código**, ambos pedindo apelido (2–16 caracteres).
- **RF-002** Criar sala gera um **código de 5 caracteres** (alfabeto sem ambíguos: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`), único entre salas ativas.
- **RF-003** O criador vira **host** e vê o código com botões "Copiar código" e "Compartilhar" (Web Share API quando disponível; link `/s/ABCDE`).
- **RF-004** Entrar com código inexistente, sala cheia ou partida já em andamento exibe erro claro e amigável.
- **RF-005** Apelidos duplicados na mesma sala recebem sufixo automático (`Ana`, `Ana2`).
- **RF-006** O lobby lista jogadores em tempo real (entrada, saída, status de conexão) e permite ao host alterar configurações e iniciar.
- **RF-007** Se o host sair, o host passa ao jogador mais antigo na sala. Sala vazia é destruída após 2 min.
- **RF-008** O host pode remover um jogador no lobby.

### Partida
- **RF-010** O jogador pode ser reconectado (queda de rede, recarregar página) à mesma identidade por até 60 s, via token de sessão guardado no `localStorage`.
- **RF-011** A interface sempre destaca de quem é a vez, o prefixo exigido, o cronômetro e as vidas de cada jogador.
- **RF-012** **Digitação em tempo real:** enquanto o jogador da vez digita, todos os outros veem o texto aparecendo letra por letra (com apagar incluído) no balão de fala dele.
- **RF-013** Somente o jogador da vez pode enviar rascunho e confirmar palavra; eventos de outros são ignorados pelo servidor.
- **RF-014** O jogador confirma a palavra com Enter / botão "Mandar!". O servidor valida (2.3) e responde a todos com aceita ou rejeitada (com motivo, só para quem enviou).
- **RF-015** Prefixo exigido é mostrado com chips tocáveis (ex.: `A` e `AO`) que preenchem o início do campo, para facilitar no celular.
- **RF-016** Histórico da corrente: lista rolável das palavras jogadas, com quem jogou, e o trecho de encaixe destacado.
- **RF-017** Expiração do turno é decidida **pelo servidor** (RF-020), nunca pelo relógio do cliente. O cliente exibe a contagem usando o prazo (`deadline`) recebido e corrige o desvio de relógio.
- **RF-018** Reações rápidas (emojis) enviáveis por qualquer jogador a qualquer momento, com limite de frequência.
- **RF-019** Ao eliminar ou vencer, a UI mostra animações dedicadas e o jogador eliminado segue como espectador, vendo tudo ao vivo.
- **RF-020** Estouro de tempo: servidor retira 1 vida, emite o evento e passa a vez.

### Dicionário
- **RF-030** O servidor carrega uma lista de palavras pt-BR no boot (arquivo versionado) e valida em memória em O(1).
- **RF-031** A lista é normalizada na carga; palavras com formas acentuadas diferentes que colidem contam como a mesma.
- **RF-032** Fonte da lista e licença documentadas em `docs/dictionary.md`.

## 4. Requisitos não funcionais
- **RNF-001 Latência:** propagação de rascunho ≤ 150 ms p95 dentro do mesmo país.
- **RNF-002 Capacidade:** 2.000 salas simultâneas (≈ 8.000 conexões) em 2 nós pequenos, com escala horizontal.
- **RNF-003 Disponibilidade:** reinício de nó recupera salas ativas do Redis em ≤ 5 s; clientes reconectam automaticamente.
- **RNF-004 Segurança:** rate limit por IP e por socket; validação de schema; limite de tamanho de payload (1 KB); sem execução de HTML do usuário (apelido e palavras são sempre texto escapado); CORS restrito.
- **RNF-005 Anti-trapaça:** servidor valida tudo; cliente não recebe o dicionário.
- **RNF-006 Performance de UI:** LCP ≤ 2,5 s em 4G; bundle inicial ≤ 200 KB gzip; animações a 60 fps usando `transform`/`opacity`.
- **RNF-007 Acessibilidade:** `prefers-reduced-motion` desativa efeitos pesados; textos ≥ 16 px nos campos de entrada (evita zoom automático no iOS); contraste AA; `aria-live` para anúncios de turno.
- **RNF-008 Observabilidade:** logs JSON com `roomCode` e `playerId`; métricas Prometheus (salas ativas, conexões, latência de validação, erros); `/health` e `/ready`.
- **RNF-009 Privacidade:** nenhum dado persistido além do estado da sala, com TTL (sala encerrada: 1 h; lobby ocioso: 30 min).

## 5. Experiência visual (cartoon)
- Paleta vibrante, contornos grossos escuros, sombras sólidas deslocadas ("sticker look").
- Fonte display arredondada para títulos (ex.: *Baloo 2* ou *Fredoka*) e fonte legível para o texto.
- Efeitos:
  - **Palavra aceita:** letras "pulam" uma a uma (squash & stretch), estrelas e confete; trecho de encaixe brilha.
  - **Palavra rejeitada:** campo faz shake e balão de "Ops!".
  - **Perda de vida:** coração "estoura" e a tela treme levemente.
  - **Tempo acabando (≤ 5 s):** cronômetro pulsa e fica vermelho.
  - **Vitória:** confete em chuva + troféu quicando.
  - **Digitação alheia:** balão de fala com cursor piscante e letras que "pipocam".
- Efeitos sonoros curtos, opcionais, com botão de mudo (padrão: ligado após primeiro toque do usuário).
- Todos os efeitos têm versão reduzida sob `prefers-reduced-motion`.

## 6. Telas (mobile first)
1. **Home:** logo animado, campo de apelido, botões *Criar sala* / *Entrar*.
2. **Entrar:** campo de código (5 caixinhas) com teclado alfanumérico.
3. **Lobby:** código gigante + copiar/compartilhar, avatares, configurações (host), botão *Começar*.
4. **Escolha da letra:** grade A–Z com botões grandes.
5. **Partida:** topo = jogadores e vidas; centro = balão de fala do jogador atual + prefixo + cronômetro; base = campo de digitação fixo acima do teclado + histórico em *bottom sheet*.
6. **Resultado:** vencedor, estatísticas, *Jogar de novo*.

## 7. Critérios de aceite (Given / When / Then)

**CA-001 — Criar sala**
Dado que informei o apelido "Ana", quando toco em *Criar sala*, então vejo o lobby com um código de 5 caracteres e sou listada como host.

**CA-002 — Entrar na sala**
Dado um código válido de sala em lobby, quando outro jogador entra, então todos no lobby o veem aparecer em até 1 s.

**CA-003 — Sala cheia / em andamento**
Dado uma sala com o máximo de jogadores ou com partida em andamento, quando alguém tenta entrar, então recebe mensagem específica e não entra.

**CA-004 — Início**
Dado ≥ 2 jogadores, quando o host toca *Começar*, então o 1º da ordem vê a escolha de letra e os demais veem "Fulano está escolhendo a letra…".

**CA-005 — Encadeamento com 1 ou 2 letras**
Dado que a palavra anterior foi "casa", quando o próximo envia "alegria" (começa com `a`) ou "saudade" (começa com `sa`), então ambas são aceitas; "barco" é rejeitada com o motivo "não começa com A ou SA".

**CA-006 — Repetição**
Dado que "sapo" já foi jogada, quando alguém envia "Sapo" ou "sàpo" em prefixo válido, então é rejeitada como repetida.

**CA-007 — Palavra inexistente**
Dado uma palavra fora do dicionário, quando enviada, então é rejeitada com "palavra não encontrada" e o jogador continua no turno.

**CA-008 — Digitação ao vivo**
Dado que é a vez de Ana, quando ela digita "ale", então os outros jogadores veem "ale" no balão dela em ≤ 150 ms p95; ao apagar uma letra, veem "al".

**CA-009 — Turno de outro**
Dado que não é minha vez, quando tento enviar rascunho ou palavra (inclusive via console), então o servidor ignora e registra o evento como tentativa inválida.

**CA-010 — Timeout**
Dado que o tempo do turno acabou, então o jogador perde 1 vida, a vez passa e o prefixo exigido permanece.

**CA-011 — Eliminação e vitória**
Dado que restou apenas 1 jogador com vidas, então a partida termina e todos veem a tela de resultado.

**CA-012 — Reconexão**
Dado que perdi a conexão durante a partida, quando volto em ≤ 60 s, então retomo minha posição com o estado atual; se for minha vez, o tempo restante é o real.

**CA-013 — Host saiu**
Dado que o host saiu do lobby, então o jogador mais antigo vira host e todos são notificados.

**CA-014 — Mobile**
Dado um viewport de 360×640 com teclado aberto, então o campo de digitação, o prefixo e o cronômetro permanecem visíveis sem rolagem da página.

**CA-015 — Movimento reduzido**
Dado `prefers-reduced-motion: reduce`, então nenhum efeito de tremor, confete ou animação contínua é exibido; feedback é dado por cor e texto.

## 8. Decisões assumidas (revise se discordar)
1. O dicionário é só **pt-BR**; outros idiomas ficam para uma versão futura.
2. Palavra inválida **não** custa vida; só o estouro de tempo custa.
3. Após timeout, o **prefixo exigido não muda**.
4. Sem contas: identidade = apelido + token de sessão anônimo.
5. Modo único na v1: **sobrevivência por vidas**. Modo de pontos fica como evolução.
6. Palavras com hífen, espaços ou números **não** são aceitas.

## 9. Questões em aberto
- Qual lista de palavras pt-BR usar (licença e qualidade)? Candidatas a avaliar: listas abertas do projeto *LibreOffice/Hunspell pt-BR* e a lista do *VOLP* (verificar licença).
- Incluir verbos conjugados e plurais? (Afeta muito o tamanho e a dificuldade; assumido que **sim**, via Hunspell expandido.)
- Haverá moderação de apelidos ofensivos (lista de bloqueio)?
