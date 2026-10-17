import React, { useRef, useState } from 'react';
import { Delete, Send } from 'lucide-react';

interface KeyboardProps {
  onKey: (char: string) => void;
  onBackspace: () => void;
  onEnter: () => void;
  canSubmit: boolean;
}

// Layout QWERTY padrão (3 linhas escalonadas, como Wordle / teclado do celular)
const ROW_1 = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'];
const ROW_2 = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'];
const ROW_3 = ['Z', 'X', 'C', 'V', 'B', 'N', 'M'];

// Acentos disponíveis ao segurar a tecla (toque longo), como no teclado nativo
const ACCENTS: Record<string, string[]> = {
  A: ['Á', 'À', 'Â', 'Ã'],
  E: ['É', 'Ê', 'È'],
  I: ['Í'],
  O: ['Ó', 'Ô', 'Õ'],
  U: ['Ú', 'Ü'],
  C: ['Ç'],
};

const keyClass =
  'kbd-key relative flex-1 min-w-0 h-12 sm:h-11 flex items-center justify-center rounded-lg ' +
  'border-2 border-cartoon-dark bg-white font-black text-lg text-cartoon-dark ' +
  'active:translate-y-px active:bg-cartoon-yellow transition-colors';

export const Keyboard: React.FC<KeyboardProps> = ({
  onKey,
  onBackspace,
  onEnter,
  canSubmit,
}) => {
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClick = useRef(false);
  const [popup, setPopup] = useState<{ letter: string; options: string[] } | null>(null);

  const startHold = (letter: string) => {
    setPopup(null); // fecha popup anterior, se houver
    suppressClick.current = false;
    const options = ACCENTS[letter];
    if (!options) return;
    holdTimer.current = setTimeout(() => {
      suppressClick.current = true;
      setPopup({ letter, options });
    }, 300);
  };

  const cancelHold = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  const handleClick = (letter: string) => {
    // Veio de um toque longo: apenas fecha o popup sem inserir a letra base
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    setPopup(null);
    onKey(letter);
  };

  const renderLetter = (letter: string) => (
    <button
      key={letter}
      type="button"
      aria-label={`Letra ${letter}`}
      onPointerDown={() => startHold(letter)}
      onPointerUp={cancelHold}
      onPointerLeave={cancelHold}
      onPointerCancel={cancelHold}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => handleClick(letter)}
      className={keyClass}
    >
      {letter}
    </button>
  );

  return (
    <div className="relative w-full select-none">
      {/* Popup de acentos (toque longo) */}
      {popup && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30 flex gap-1 p-1.5 bg-white rounded-xl border-2 border-cartoon-dark shadow-cartoon">
          {popup.options.map((accent) => (
            <button
              key={accent}
              type="button"
              aria-label={`Letra ${accent}`}
              onClick={() => {
                onKey(accent);
                setPopup(null);
              }}
              className="w-10 h-12 flex items-center justify-center rounded-lg border-2 border-cartoon-dark bg-cartoon-cream font-black text-xl text-cartoon-dark active:bg-cartoon-yellow"
            >
              {accent}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        {/* Linha 1 */}
        <div className="flex gap-1">{ROW_1.map(renderLetter)}</div>

        {/* Linha 2 — escalonada (recuada nas laterais) */}
        <div className="flex gap-1 px-[5%]">{ROW_2.map(renderLetter)}</div>

        {/* Linha 3 — apagar + letras + mandar */}
        <div className="flex gap-1">
          <button
            type="button"
            aria-label="Apagar"
            onClick={() => {
              setPopup(null);
              onBackspace();
            }}
            className={`${keyClass} flex-[1.5] bg-cartoon-cream text-cartoon-dark`}
          >
            <Delete className="w-6 h-6" />
          </button>

          {ROW_3.map(renderLetter)}

          <button
            type="button"
            aria-label="Mandar palavra"
            onClick={() => {
              setPopup(null);
              onEnter();
            }}
            disabled={!canSubmit}
            className={`${keyClass} flex-[1.5] bg-cartoon-mint text-cartoon-dark disabled:opacity-40`}
          >
            <Send className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
