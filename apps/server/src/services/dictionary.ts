import fs from 'node:fs';
import readline from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeWord } from '@conecta/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class DictionaryService {
  private wordsSet = new Set<string>();
  private loaded = false;

  constructor(private dictionaryPath?: string) {
    if (!this.dictionaryPath) {
      // Procura em src/data ou dist/data
      const candidates = [
        path.resolve(__dirname, '../data/words-ptbr.txt'),
        path.resolve(__dirname, '../../src/data/words-ptbr.txt'),
        path.resolve(process.cwd(), 'apps/server/src/data/words-ptbr.txt'),
        path.resolve(process.cwd(), 'src/data/words-ptbr.txt'),
      ];
      this.dictionaryPath = candidates.find((p) => fs.existsSync(p)) || candidates[0];
    }
  }

  async load(): Promise<number> {
    if (this.loaded) return this.wordsSet.size;

    if (!fs.existsSync(this.dictionaryPath!)) {
      throw new Error(`Arquivo de dicionário não encontrado em: ${this.dictionaryPath}`);
    }

    const fileStream = fs.createReadStream(this.dictionaryPath!, { encoding: 'utf-8' });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      const clean = line.trim();
      // Ignora vazios e palavras com hífens/espaços (regra da spec)
      if (clean && !clean.includes('-') && !clean.includes(' ')) {
        const norm = normalizeWord(clean);
        if (norm.length >= 2) {
          this.wordsSet.add(norm);
        }
      }
    }

    this.loaded = true;
    return this.wordsSet.size;
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
