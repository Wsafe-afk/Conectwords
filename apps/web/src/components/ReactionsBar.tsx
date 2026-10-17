import React, { useState } from 'react';
import { AVAILABLE_EMOJIS } from '@conecta/shared';
import { getSocket } from '../lib/socket.js';
import { useRoomStore } from '../store/roomStore.js';
import { sound } from '../fx/sound.js';

export const ReactionsBar: React.FC = () => {
  const { floatingReactions } = useRoomStore();
  const [lastSent, setLastSent] = useState<number>(0);

  const handleSendReaction = (emoji: string) => {
    const now = Date.now();
    // Limite de taxa (máx 1 a cada 300ms)
    if (now - lastSent < 300) return;
    setLastSent(now);

    sound.pop();
    const socket = getSocket();
    if (socket) {
      socket.emit('reaction:send', { emoji });
    }
  };

  return (
    <>
      {/* Camada flutuante de emojis subindo */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {floatingReactions.map((r) => (
          <div
            key={r.id}
            style={{ left: `${r.x}%` }}
            className="absolute bottom-16 text-4xl select-none animate-float-up"
          >
            {r.emoji}
          </div>
        ))}
      </div>

      {/* Barra de botões de emojis */}
      <div className="flex items-center justify-center gap-1.5 py-1 px-3 bg-white/80 backdrop-blur rounded-2xl border-2 border-cartoon-dark/30 shadow-cartoon-sm max-w-fit mx-auto">
        {AVAILABLE_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => handleSendReaction(emoji)}
            className="text-xl p-1 hover:scale-125 active:scale-90 transition-transform cursor-pointer select-none"
            title={`Reagir com ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </>
  );
};
