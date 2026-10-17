import React from 'react';
import type { RoomView } from '@conecta/shared';
import { Card } from '../components/Card.js';
import { Timer } from '../components/Timer.js';
import { getSocket } from '../lib/socket.js';
import { Sparkles } from 'lucide-react';
import { sound } from '../fx/sound.js';

interface ChoosingLetterProps {
  room: RoomView;
  myPlayerId: string;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export const ChoosingLetter: React.FC<ChoosingLetterProps> = ({ room, myPlayerId }) => {
  const isChooser = room.game?.chooserId === myPlayerId;
  const chooserName = room.players.find((p) => p.id === room.game?.chooserId)?.nickname || 'Jogador';
  const socket = getSocket();

  const handlePickLetter = (letter: string) => {
    if (!isChooser || !socket) return;
    sound.pop();
    socket.emit('letter:choose', { letter });
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 animate-fade-in text-center pb-8">
      {/* Topo com Cronômetro de 15 segundos */}
      {room.game && (
        <div className="flex justify-center">
          <Timer
            deadlineAt={room.game.deadlineAt}
            clockOffset={0}
            totalSeconds={15}
          />
        </div>
      )}

      {isChooser ? (
        <Card variant="yellow">
          <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase text-cartoon-dark/70 tracking-wider mb-2">
            <Sparkles className="w-4 h-4 text-cartoon-orange" />
            <span>Sua Vez!</span>
          </div>
          <h2 className="text-2xl font-black text-cartoon-dark mb-1">
            Escolha a Letra Inicial
          </h2>
          <p className="text-xs font-bold text-cartoon-dark/60 mb-4">
            A próxima palavra deverá começar com esta letra:
          </p>

          <div className="grid grid-cols-6 sm:grid-cols-7 gap-2">
            {ALPHABET.map((letter) => (
              <button
                key={letter}
                type="button"
                onClick={() => handlePickLetter(letter)}
                className="w-full aspect-square flex items-center justify-center font-black text-xl rounded-xl border-2 border-cartoon-dark bg-white shadow-cartoon-sm hover:bg-cartoon-yellow active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
              >
                {letter}
              </button>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="py-8">
          <div className="text-4xl mb-3 animate-bounce">⏳</div>
          <h2 className="text-2xl font-black text-cartoon-dark mb-2">
            Aguardando a Letra Inicial...
          </h2>
          <p className="font-bold text-cartoon-dark/70 text-sm">
            <span className="text-cartoon-coral font-black">{chooserName}</span> está escolhendo a letra da partida.
          </p>
        </Card>
      )}
    </div>
  );
};
