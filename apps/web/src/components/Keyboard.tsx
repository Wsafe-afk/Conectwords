import React, { useRef, useState } from 'react';
import { Delete } from 'lucide-react';

interface KeyboardProps {
  onKey: (char: string) => void;
  onBackspace: () => void;
  onEnter: () => void;
  canSubmit: boolean;
}

// Layout QWERTY padrão de teclado de celular (3 linhas escalonadas + linha de funções)
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

// Altura de tecla proporcional a um teclado mobile real (não "estica" para preencher a tela)
const KEY_H = 'h-[clamp(46px,6.5vh,54px)] sm:h-11';

const baseKey =
  'kbd-key relative flex select-none items-center justify-center rounded-[10px] ' +
  'transition-transform duration-75 active:scale-95';

const letterKey = `${baseKey} ${KEY_H} min-w-0 flex-1 bg-white text-[19px] font-semibold text-cartoon-dark shadow-[0_1px_0_0_rgba(15,23,42,0.35)] active:bg-gray-200 sm:text-[17px]`;

const funcKey = `${baseKey} ${KEY_H} min-w-0 flex-1 bg-[#cbd2dc] text-cartoon-dark shadow-[0_1px_0_0_rgba(15,23,42,0.25)] active:bg-[#b6bec9]`;

const submitKey = `${baseKey} ${KEY_H} w-full bg-cartoon-sky text-[15px] font-bold uppercase tracking-wide text-white shadow-[0_1px_0_0_rgba(15,23,42,0.25)] active:bg-cartoon-sky/80 disabled:opacity-40`;

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
      className={letterKey}
    >
      {letter}
    </button>
  );

  return (
    <div className="relative w-full select-none">
      {/* Popup de acentos (toque longo) */}
      {popup && (
        <div className="absolute bottom-full left-1/2 z-30 mb-2 flex -translate-x-1/2 gap-1 rounded-2xl bg-white p-1.5 shadow-lg ring-1 ring-black/10">
          {popup.options.map((accent) => (
            <button
              key={accent}
              type="button"
              aria-label={`Letra ${accent}`}
              onClick={() => {
                onKey(accent);
                setPopup(null);
              }}
              className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-gray-100 text-[19px] font-semibold text-cartoon-dark active:bg-cartoon-sky active:text-white"
            >
              {accent}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        {/* Linha 1 */}
        <div className="flex gap-1.5">{ROW_1.map(renderLetter)}</div>

        {/* Linha 2 — escalonada (recuada nas laterais) */}
        <div className="flex gap-1.5 px-[4.5%]">{ROW_2.map(renderLetter)}</div>

        {/* Linha 3 — Ç + letras + apagar (como shift/delete do teclado nativo) */}
        <div className="flex gap-1.5 px-[9%]">
          <button
            type="button"
            aria-label="Letra c cedilha"
            onClick={() => {
              setPopup(null);
              onKey('Ç');
            }}
            className={`${funcKey} font-semibold`}
          >
            Ç
          </button>
          {ROW_3.map(renderLetter)}
          <button
            type="button"
            aria-label="Apagar"
            onClick={() => {
              setPopup(null);
              onBackspace();
            }}
            className={funcKey}
          >
            <Delete className="h-6 w-6" />
          </button>
        </div>

        {/* Linha 4 — barra de enviar (como a barra inferior do teclado do celular) */}
        <button
          type="button"
          aria-label="Mandar palavra"
          onClick={() => {
            setPopup(null);
            onEnter();
          }}
          disabled={!canSubmit}
          className={submitKey}
        >
          Mandar
        </button>
      </div>
    </div>
  );
};
