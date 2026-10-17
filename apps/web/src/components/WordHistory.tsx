import React, { useState } from 'react';
import type { Player, WordEntry } from '@conecta/shared';
import { ChevronUp, ChevronDown, History } from 'lucide-react';

interface WordHistoryProps {
  words: WordEntry[];
  players: Player[];
}

export const WordHistory: React.FC<WordHistoryProps> = ({ words, players }) => {
  const [isOpen, setIsOpen] = useState(false);

  const getPlayerName = (playerId: string) => {
    return players.find((p) => p.id === playerId)?.nickname || 'Jogador';
  };

  return (
    <div className="w-full max-w-md mx-auto mt-2">
      {/* Botão de alternância do Bottom Sheet */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2 bg-white/90 backdrop-blur rounded-2xl border-2 border-cartoon-dark shadow-cartoon-sm text-cartoon-dark font-black text-sm hover:bg-white active:translate-y-0.5 transition-all cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-cartoon-sky" />
          <span>Histórico da Corrente ({words.length})</span>
        </div>
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
      </button>

      {/* Conteúdo expandido */}
      {isOpen && (
        <div className="mt-2 p-3 bg-white rounded-2xl border-3 border-cartoon-dark shadow-cartoon max-h-56 overflow-y-auto space-y-2">
          {words.length === 0 ? (
            <p className="text-center text-sm font-bold text-gray-400 py-3">
              Nenhuma palavra jogada ainda.
            </p>
          ) : (
            words
              .slice()
              .reverse()
              .map((entry, idx) => {
                const prefixLen = entry.matchedPrefix.length;
                const prefixPart = entry.word.slice(0, prefixLen);
                const restPart = entry.word.slice(prefixLen);

                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-xl bg-cartoon-cream/50 border border-cartoon-dark/20 text-sm font-bold"
                  >
                    <div>
                      <span className="text-cartoon-coral font-black bg-cartoon-yellow/50 px-1 py-0.5 rounded border border-cartoon-coral/30 mr-0.5">
                        {prefixPart.toUpperCase()}
                      </span>
                      <span className="text-cartoon-dark font-bold">
                        {restPart.toUpperCase()}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 font-semibold">
                      {getPlayerName(entry.playerId)}
                    </span>
                  </div>
                );
              })
          )}
        </div>
      )}
    </div>
  );
};
