import {
  isValidWordCharacters,
  normalizeWord,
  type RejectReason,
  REJECT_REASON_MESSAGES,
} from '@conecta/shared';

export interface WordValidationInput {
  rawWord: string;
  minWordLength: number;
  requiredPrefixes: string[];
  usedSet: Set<string> | string[];
  dictionaryHas: (normalized: string) => boolean;
}

export type WordValidationResult =
  | {
      valid: true;
      normalized: string;
      matchedPrefix: string;
    }
  | {
      valid: false;
      reason: RejectReason;
      message: string;
    };

/**
 * Deriva os próximos prefixos válidos (1 ou 2 letras finais) a partir da palavra normalizada.
 * Ex: "casa" -> ["a", "sa"]
 * Ex: "sol" -> ["l", "ol"]
 * Ex: "a" -> ["a"]
 */
export function deriveNextPrefixes(normalizedWord: string): string[] {
  if (!normalizedWord) return [];
  const last1 = normalizedWord.slice(-1);
  if (normalizedWord.length < 2) {
    return [last1];
  }
  const last2 = normalizedWord.slice(-2);
  const prefixes = [last1];
  if (last2 !== last1 && !prefixes.includes(last2)) {
    prefixes.push(last2);
  }
  return prefixes;
}

/**
 * Validação de palavra na ordem da spec (seção 2.3):
 * 1. Apenas letras válidas A-Z (sem números, espaços ou símbolos)
 * 2. Tamanho >= tamanho mínimo da sala (padrão 3)
 * 3. Começa com um dos prefixos exigidos
 * 4. Não foi usada antes na mesma partida
 * 5. Existe no dicionário pt-BR
 */
export function validateWord(input: WordValidationInput): WordValidationResult {
  const { rawWord, minWordLength, requiredPrefixes, usedSet, dictionaryHas } = input;

  // 1. Checagem de caracteres
  if (!isValidWordCharacters(rawWord)) {
    return {
      valid: false,
      reason: 'INVALID_CHARS',
      message: REJECT_REASON_MESSAGES.INVALID_CHARS,
    };
  }

  const normalized = normalizeWord(rawWord);

  // 2. Checagem de tamanho mínimo
  if (normalized.length < minWordLength) {
    return {
      valid: false,
      reason: 'TOO_SHORT',
      message: REJECT_REASON_MESSAGES.TOO_SHORT,
    };
  }

  // 3. Checagem do prefixo exigido
  // Se houver mais de um prefixo compatível, prefira o mais longo (ex: 'sa' em vez de 'a' para 'saudade')
  const sortedPrefixes = [...requiredPrefixes].sort((a, b) => b.length - a.length);
  const matchedPrefix = sortedPrefixes.find((p) => normalized.startsWith(p.toLowerCase()));

  if (!matchedPrefix) {
    const formattedPrefixes = requiredPrefixes.map((p) => p.toUpperCase()).join(' ou ');
    return {
      valid: false,
      reason: 'WRONG_PREFIX',
      message: `A palavra deve começar com ${formattedPrefixes}.`,
    };
  }

  // 4. Checagem de repetição na partida
  const used = usedSet instanceof Set ? usedSet : new Set(usedSet);
  if (used.has(normalized)) {
    return {
      valid: false,
      reason: 'ALREADY_USED',
      message: REJECT_REASON_MESSAGES.ALREADY_USED,
    };
  }

  // 5. Checagem no dicionário pt-BR
  if (!dictionaryHas(normalized)) {
    return {
      valid: false,
      reason: 'NOT_IN_DICTIONARY',
      message: REJECT_REASON_MESSAGES.NOT_IN_DICTIONARY,
    };
  }

  return {
    valid: true,
    normalized,
    matchedPrefix,
  };
}
