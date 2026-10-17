import React, { useEffect } from 'react';
import type { RoomView } from '@conecta/shared';
import { Card } from '../components/Card.js';
import { Button } from '../components/Button.js';
import { Avatar } from '../components/Avatar.js';
import { getSocket } from '../lib/socket.js';
import { useFx } from '../fx/useFx.js';
import { Trophy, RotateCcw, Award, Layers } from 'lucide-react';

interface FinishedViewProps {
  room: RoomView;
  myPlayerId: string;
}

export const FinishedView: React.FC<FinishedViewProps> = ({ room, myPlayerId }) => {
  const isHost = room.hostId === myPlayerId;
  const winner = room.players.find((p) => p.id === room.game?.winnerId);
  const words = room.game?.words || [];
  const longestWord = words.reduce(
    (max, cur) => (cur.word.length > max.length ? cur.word : max),
    ''
  );
  const { playWin } = useFx();
  const socket = getSocket();

  useEffect(() => {
    playWin();
  }, [playWin]);

  const handlePlayAgain = () => {
    if (!isHost || !socket) return;
    socket.emit('game:playAgain');
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 animate-fade-in text-center pb-8">
      {/* Bloco de Vitória */}
      <Card variant="yellow" className="py-6 relative overflow-hidden">
        <div className="text-5xl mb-2 animate-bounce inline-block">
          <Trophy className="w-16 h-16 text-yellow-500 fill-yellow-400 stroke-cartoon-dark stroke-[2.5]" />
        </div>

        <h2 className="text-3xl font-black text-cartoon-dark mb-1">
          {winner ? `${winner.nickname} Venceu!` : 'Fim de Jogo!'}
        </h2>
        <p className="text-sm font-bold text-cartoon-dark/60 mb-5">
          O último sobrevivente da rodada! 🎉
        </p>

        {winner && (
          <div className="flex justify-center mb-4">
            <Avatar player={winner} isHost={winner.id === room.hostId} size="lg" />
          </div>
        )}
      </Card>

      {/* Estatísticas da Partida */}
      <Card className="space-y-3">
        <h3 className="font-black text-cartoon-dark text-base text-left border-b-2 border-cartoon-dark/10 pb-2">
          Estatísticas da Partida
        </h3>

        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="p-3 bg-cartoon-cream rounded-2xl border-2 border-cartoon-dark">
            <div className="flex items-center justify-center gap-1 text-gray-500 text-xs font-bold mb-1">
              <Layers className="w-4 h-4 text-cartoon-sky" />
              <span>Total de Palavras</span>
            </div>
            <span className="text-2xl font-black text-cartoon-dark">
              {words.length}
            </span>
          </div>

          <div className="p-3 bg-cartoon-cream rounded-2xl border-2 border-cartoon-dark">
            <div className="flex items-center justify-center gap-1 text-gray-500 text-xs font-bold mb-1">
              <Award className="w-4 h-4 text-cartoon-coral" />
              <span>Maior Palavra</span>
            </div>
            <span className="text-base font-black text-cartoon-coral truncate block">
              {longestWord ? longestWord.toUpperCase() : '—'}
            </span>
          </div>
        </div>
      </Card>

      {/* Botão de Jogar de Novo */}
      {isHost ? (
        <Button
          type="button"
          variant="mint"
          size="lg"
          onClick={handlePlayAgain}
          className="w-full flex items-center justify-center gap-2 shadow-cartoon-lg"
        >
          <RotateCcw className="w-6 h-6" />
          <span>Jogar de Novo</span>
        </Button>
      ) : (
        <div className="p-4 rounded-2xl bg-cartoon-yellow/20 border-3 border-dashed border-cartoon-dark/40 text-center font-bold text-cartoon-dark/80">
          Aguardando o host reiniciar a sala...
        </div>
      )}
    </div>
  );
};
