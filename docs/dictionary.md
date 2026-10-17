# Dicionário pt-BR — "Conecta Palavras"

Este documento descreve a fonte, organização e critérios de inclusão do dicionário do jogo (requisitos RF-030, RF-031 e RF-032).

## Fonte e Licença

O dicionário é a **união** de três arquivos versionados em `apps/server/src/data/`:

1. **`words-ptbr.txt`** — lista pt-BR derivada do corretor ortográfico **LibreOffice / Hunspell pt-BR** (projeto aberto [pythonprobr/palavras](https://github.com/pythonprobr/palavras), licenças LGPL/MPL/BSD). É a base original do jogo.
2. **`words-brispell.txt`** — lista **br.ispell** disponibilizada pelo IME-USP ([ime.usp.br/~pf/dicios](https://www.ime.usp.br/~pf/dicios), licença **CC-BY**). Foi adicionada para cobrir **conjugações verbais e palavras comuns que faltavam** na base do LibreOffice (ex.: *iodo*, *sopa*, *suco*, *biscoito*, *galera*, *colina*, *geada*, *gelatina*).
3. **`words-extra.txt`** — lista curada de **termos informais, gírias, regionalismos e abreviações de internet** usados pelos jogadores (ex.: *blz*, *vlw*, *flw*, *tmj*, *mds*, *zuera*, *daora*, *sussa*, *deboas*, *parça*, *mano*), além de anglicismos já incorporados ao pt-BR (ex.: *cookie*, *brownie*, *vodka*, *yakisoba*) e regionalismos culinários (ex.: *acarajé*, *coxinha*, *galinhada*).

Critérios para a lista extra:

- Palavras reais do pt-BR (incluindo formas coloquiais) que apareçam na fala/escrita dos jogadores.
- Abreviações de internet amplamente usadas em conversas e jogos.
- Sem nomes próprios adicionados manualmente e sem termos ofensivos.
- Cada linha deve conter **apenas letras A-Z e acentos** (sem espaços ou hífens).

> Observação: as listas 1 e 2 são complementares e quase não se sobrepõem (a base do LibreOffice não inclui muitas formas individuais — o próprio projeto de origem documenta essa limitação). A união cobre ~490 mil formas normalizadas.

## Tratamento

- As palavras são normalizadas na carga do servidor: minúsculas, remoção de acentos e diacríticos (incluindo `ç → c`) e remoção de qualquer caractere que não seja `a-z`.
- **Colisões de acento:** formas que colidem após a normalização (ex.: *pôde* / *pode*, *avô* / *avó*, *adoçante* / *adocante*) contam como a mesma entrada no conjunto indexado.
- Palavras com hífen ou espaço (ex.: *arco-íris*) são ignoradas; a forma sem hífen pode ser incluída manualmente em `words-extra.txt` (ex.: *arcoiris*).

## Carregamento em Memória

- No boot do servidor, o `DictionaryService` lê **todos** os arquivos existentes em `apps/server/src/data/`, aplica `normalizeWord()` e armazena em um único `Set<string>`.
- O arquivo base (`words-ptbr.txt`) é obrigatório; os complementares são opcionais e, se ausentes, o servidor apenas registra menos palavras.
- A validação ocorre em tempo constante $O(1)$.
- O endpoint `/ready` valida a prontidão do dicionário antes de aceitar tráfego de jogo.
