# Conecta Palavras 🎮🔤

Jogo multiplayer em tempo real de encadeamento de palavras, construído com foco em **mobile first**, **alta performance**, **estética cartoon vibrante** e **zero atrito**.

---

## 🚀 Como Executar

### Pré-requisitos
- **Node.js**: versão 20 ou superior
- **pnpm**: versão 9 ou 10+ (instalado via `npm install -g pnpm`)

### 1. Instalar Dependências
```bash
pnpm install
```

### 2. Rodar em Modo de Desenvolvimento
Inicia tanto o servidor backend (porta 3001) quanto o frontend React Vite (porta 5173):
```bash
pnpm dev
```
Abra seu navegador em [http://localhost:5173](http://localhost:5173).

- Para rodar apenas o servidor:
  ```bash
  pnpm dev:server
  ```
- Para rodar apenas o frontend:
  ```bash
  pnpm dev:web
  ```

### 3. Rodar os Testes Automatizados
```bash
pnpm test
```
Executa a suíte de testes unitários do pacote compartilhado, motor puro de regras do domínio e a simulação de partida multiplayer em tempo real com clientes Socket.IO.

### 4. Compilar para Produção (Build)
```bash
pnpm build
```

---

## 📐 Arquitetura

O projeto é estruturado como um monorepo moderno:

```
/
├─ apps/
│  ├─ web/                 # Frontend React 18 + Vite + Tailwind CSS + Framer Motion
│  │  └─ src/
│  │     ├─ components/    # Botões, Cards, Avatares, Balão de fala, Cronômetro, Chips
│  │     ├─ pages/         # Home, Entrar com Código, Lobby, Escolha de Letra, Partida, Resultado
│  │     ├─ fx/            # Síntese Web Audio API e confetes animados
│  │     ├─ store/         # Gerenciamento de estado sincronizado via Zustand
│  │     └─ lib/           # Cliente Socket.IO com reconexão
│  └─ server/              # Backend Node.js + Fastify + Socket.IO
│     └─ src/
│        ├─ domain/        # Motor de regras puro (validação 5 etapas, máquina de estados)
│        ├─ services/      # Dicionário pt-BR (320k palavras), Timer autoritativo, Sessões
│        ├─ http/          # Rotas REST (/api/rooms, /health, /ready)
│        ├─ ws/            # Gateway Socket.IO com digitação ao vivo e eventos em tempo real
│        └─ data/          # words-ptbr.txt (dicionário versionado)
├─ packages/
│  └─ shared/              # Schemas Zod, tipos TypeScript, constantes e normalização
├─ specs/                  # Especificação original, constituição, contratos e tarefas
└─ docs/                   # dictionary.md (fonte do dicionário e licenças)
```

---

## 🎨 Características e Regras do Jogo
1. **Mobile First:** interface pensada para telas a partir de 360×640 px com campo de digitação posicionado acima do teclado virtual (`100dvh`).
2. **Digitação ao Vivo:** o rascunho de quem está na vez aparece letra a letra para os demais em tempo real.
3. **Encadeamento Flexível:** cada jogador pode iniciar sua palavra usando **a última letra** ou **as duas últimas letras** da palavra anterior.
4. **Dicionário pt-BR Oficial:** validação em memória $O(1)$ de mais de 320.000 palavras em português do Brasil.
5. **Estética Cartoon:** sombras sólidas deslocadas ("sticker look"), cores vibrantes, efeitos sonoros sintetizados e confetes.
