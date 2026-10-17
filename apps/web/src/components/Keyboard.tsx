import React from 'react';

interface KeyboardProps {
  onKey: (char: string) => void;
  onBackspace: () => void;
  onEnter: () => void;
  canSubmit: boolean;
}

// Linhas do teclado (só o que o jogo aceita: letras)
const ROW_1 = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'];
const ROW_2 = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'];
const ROW_3 = ['Z', 'X', 'C', 'V', 'B', 'N', 'M'];
// Acentos são opcionais (o servidor normaliza), mas ajudam a escrever bonito
const ACCENTS = ['Á', 'É', 'Í', 'Ó', 'Ú', 'Ã', 'Õ', 'Â', 'Ê', 'Ç'];

const keyClass =
  'flex-1 min-w-0 h-9 sm:h-10 rounded-lg border-2 border-cartoon-dark bg-white font-black text-sm sm:text-base ' +
  'text-cartoon-dark active:translate-y-0.5 active:bg-cartoon-yellow transition-all select-none flex items-center justify-center';

/**
 * Teclado virtual do próprio app. Evita o teclado nativo do celular (que
 * cobria o campo e empurrava o layout) e mantém a tela sempre compacta.
 */
export const Keyboard: React.FC<KeyboardProps> = ({
  onKey,
  onBackspace,
  onEnter,
  canSubmit,
}) => {
  return (
    <div className="w-full space-y-1 select-none">
      {/* Linha de acentos */}
      <div className="flex justify-center gap-0.5 sm:gap-1">
        {ACCENTS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Letra ${c}`}
            onClick={() => onKey(c)}
            className={`${keyClass} h-7 sm:h-8 text-xs sm:text-sm bg-cartoon-cream`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Linha 1 */}
      <div className="flex justify-center gap-0.5 sm:gap-1">
        {ROW_1.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Letra ${c}`}
            onClick={() => onKey(c)}
            className={keyClass}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Linha 2 + apagar */}
      <div className="flex justify-center gap-0.5 sm:gap-1">
        {ROW_2.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Letra ${c}`}
            onClick={() => onKey(c)}
            className={keyClass}
          >
            {c}
          </button>
        ))}
        <button
          type="button"
          aria-label="Apagar"
          onClick={onBackspace}
          className={`${keyClass} flex-[1.6] bg-cartoon-coral text-white text-lg`}
        >
          ⌫
        </button>
      </div>

      {/* Linha 3 + mandar */}
      <div className="flex justify-center gap-0.5 sm:gap-1">
        <button
          type="button"
          aria-label="Mandar palavra"
          onClick={onEnter}
          disabled={!canSubmit}
          className={`${keyClass} flex-[2.2] bg-cartoon-mint text-sm sm:text-base disabled:opacity-40`}
        >
          Mandar ✓
        </button>
        {ROW_3.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Letra ${c}`}
            onClick={() => onKey(c)}
            className={keyClass}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
};
