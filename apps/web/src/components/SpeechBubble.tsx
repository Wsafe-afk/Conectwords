import React from 'react';

interface SpeechBubbleProps {
  text: string;
  speakerName: string;
  isMe: boolean;
}

export const SpeechBubble: React.FC<SpeechBubbleProps> = ({
  text,
  speakerName,
  isMe,
}) => {
  return (
    <div className="relative w-full max-w-sm mx-auto my-3 animate-fade-in">
      <div className="relative bg-white rounded-3xl border-3 border-cartoon-dark p-4 shadow-cartoon text-center min-h-[75px] flex flex-col items-center justify-center">
        {/* Etiqueta de quem fala */}
        <span className="absolute -top-3 left-4 bg-cartoon-yellow px-2 py-0.5 rounded-full border-2 border-cartoon-dark text-xs font-black shadow-cartoon-sm">
          {isMe ? 'Você está digitando...' : `${speakerName} está digitando...`}
        </span>

        {/* Conteúdo do texto */}
        {text ? (
          <div className="flex items-center justify-center gap-0.5 text-2xl font-black tracking-wider text-cartoon-dark break-all">
            {text.split('').map((char, idx) => (
              <span
                key={idx}
                className="inline-block transform animate-scale-up"
              >
                {char.toUpperCase()}
              </span>
            ))}
            <span className="inline-block w-2.5 h-6 bg-cartoon-dark animate-pulse ml-0.5" />
          </div>
        ) : (
          <div className="flex items-center gap-2 text-gray-400 font-bold text-lg">
            <span>Pensando numa palavra</span>
            <span className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" />
            </span>
          </div>
        )}

        {/* Triângulo / Rabicho do balão */}
        <div className="absolute -bottom-3 left-8 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[12px] border-t-cartoon-dark" />
        <div className="absolute -bottom-[9px] left-8 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-white" />
      </div>
    </div>
  );
};
