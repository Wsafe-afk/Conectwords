# Constituição do Projeto — "Conecta Palavras"

Princípios inegociáveis. Toda spec, plano e tarefa deve respeitá-los. Em caso de conflito, a constituição vence.

## 1. Produto
1. **Mobile first.** Todo layout é desenhado primeiro para 360×640 px, com toque como entrada principal. Desktop é uma expansão, nunca o contrário.
2. **Tempo real é o coração.** O que um jogador digita aparece para todos da sala em tempo real (≤ 150 ms em rede normal).
3. **Zero atrito para entrar.** Entrar numa sala exige apenas apelido + código. Sem cadastro, sem e-mail.
4. **Divertido por padrão.** Efeitos cartoonescos (squash & stretch, confete, shake, balões de fala) fazem parte da experiência, mas respeitam `prefers-reduced-motion`.

## 2. Engenharia
1. **Servidor autoritativo.** O cliente nunca decide se uma palavra é válida, de quem é a vez ou quem ganhou. O cliente apenas envia intenções e renderiza o estado recebido.
2. **Spec primeiro.** Nenhuma funcionalidade é implementada sem requisito rastreável em `spec.md` (RF-xxx / RNF-xxx) e tarefa em `tasks.md`.
3. **Teste antes do código** nas regras do jogo: o motor de regras é uma biblioteca pura, sem I/O, com cobertura ≥ 95%.
4. **Validação em toda fronteira.** Todo payload (HTTP e WebSocket) é validado com schema (Zod). Dado inválido é rejeitado, nunca "corrigido".
5. **Estado recuperável.** Reiniciar um nó do backend não pode destruir salas ativas.
6. **Observabilidade desde o dia 1.** Logs estruturados, métricas e health checks.
7. **TypeScript estrito** (`strict: true`) em frontend, backend e pacote compartilhado.
8. **Contratos compartilhados.** Tipos e schemas de eventos vivem em um único pacote (`packages/shared`) usado por cliente e servidor.

## 3. Qualidade e acessibilidade
- Alvos de toque ≥ 44×44 px; contraste WCAG AA; navegação por teclado no desktop.
- Textos em pt-BR por padrão; strings centralizadas para i18n futura.
- Nenhum dado pessoal é armazenado além do apelido, e ele expira com a sala.

## 4. Fora de escopo (por ora)
Contas de usuário, ranking global, chat de texto livre, monetização, app nativo.
