import fs from 'node:fs';
import readline from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeWord } from '@conecta/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Fontes versionadas do dicionário (RF-030/RF-032).
 * - words-ptbr.txt: lista pt-BR derivada do corretor LibreOffice/Hunspell
 *   (projeto pythonprobr/palavras). É a base original do jogo.
 * - words-brispell.txt: lista br.ispell / IME-USP (CC-BY). Complementa
 *   conjugações verbais e palavras comuns que faltavam na base original
 *   (ex.: "iodo", "sopa", "suco", "biscoito", "galera").
 * - words-extra.txt: termos informais, gírias, regionalismos e abreviações
 *   de internet usados pelos jogadores (ex.: "blz", "vlw", "zuera", "parça").
 * O servidor lê todos os arquivos existentes e une tudo em um único Set.
 */
const DICTIONARY_FILES = ['words-ptbr.txt', 'words-brispell.txt', 'words-extra.txt'];

const PRIMARY_FILE = 'words-ptbr.txt';

function resolveDataDir(dictionaryPath?: string): string {
  if (dictionaryPath) return path.dirname(dictionaryPath);
  const candidates = [
    path.resolve(__dirname, '../data'),
    path.resolve(__dirname, '../../src/data'),
    path.resolve(process.cwd(), 'apps/server/src/data'),
    path.resolve(process.cwd(), 'src/data'),
  ];
  return candidates.find((dir) => fs.existsSync(path.join(dir, PRIMARY_FILE))) || candidates[0];
}

export class DictionaryService {
  private wordsSet = new Set<string>();
  private loaded = false;
  private readonly files: string[];

  constructor(dictionaryPath?: string) {
    if (dictionaryPath) {
      // Caminho explícito (usado em testes): carrega um único arquivo.
      this.files = [dictionaryPath];
    } else {
      const dir = resolveDataDir();
      this.files = DICTIONARY_FILES.map((file) => path.join(dir, file));
    }
  }

  async load(): Promise<number> {
    if (this.loaded) return this.wordsSet.size;

    let loadedAny = false;
    for (const file of this.files) {
      if (!fs.existsSync(file)) {
        // O arquivo base é obrigatório; os complementares são opcionais.
        if (path.basename(file) === PRIMARY_FILE) {
          throw new Error(`Arquivo de dicionário não encontrado em: ${file}`);
        }
        continue;
      }
      await this.loadFile(file);
      loadedAny = true;
    }

    if (!loadedAny) {
      throw new Error(`Nenhum arquivo de dicionário encontrado em: ${this.files.join(', ')}`);
    }

    this.loaded = true;
    return this.wordsSet.size;
  }

  /**
   * Lê um arquivo de palavras por linha, normaliza e adiciona ao Set.
   * Ignora vazios e palavras com hífens/espaços (regra da spec).
   */
  private async loadFile(file: string): Promise<void> {
    const fileStream = fs.createReadStream(file, { encoding: 'utf-8' });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      const clean = line.trim();
      if (clean && !clean.includes('-') && !clean.includes(' ')) {
        const norm = normalizeWord(clean);
        if (norm.length >= 2) {
          this.wordsSet.add(norm);
        }
      }
    }
  }

  has(normalizedWord: string): boolean {
    return this.wordsSet.has(normalizedWord);
  }

  isReady(): boolean {
    return this.loaded;
  }

  size(): number {
    return this.wordsSet.size;
  }
}

export const dictionaryService = new DictionaryService();
