# Dicionário pt-BR — "Conecta Palavras"

Este documento descreve a fonte, organização e critérios de inclusão do dicionário do jogo (requisitos RF-030, RF-031 e RF-032).

## Fonte e Licença
- **Base léxica:** Vocabulário ortográfico da Língua Portuguesa (pt-BR), baseado em vocabulários abertos do projeto LibreOffice/Hunspell pt-BR (licenças LGPL/MPL/BSD).
- **Tratamento:** As palavras são normalizadas na carga do servidor (conversão para minúsculas, remoção de acentos e diacríticos, remoção de pontuação).
- **Colisões de acento:** Formas que colidem após normalização (ex.: *pôde* / *pode*, *avô* / *avó*) contam como a mesma entrada no conjunto indexado.

## Carregamento em Memória
- O arquivo `apps/server/src/data/words-ptbr.txt` contém palavras por linha em UTF-8.
- No boot do servidor, o `DictionaryService` lê todas as linhas, aplica `normalizeWord()`, e armazena em um `Set<string>`.
- A validação ocorre em tempo constante $O(1)$.
- O endpoint `/ready` valida a prontidão do dicionário antes de aceitar tráfego de jogo.
