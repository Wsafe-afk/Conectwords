import React from 'react';
import type { Player } from '@conecta/shared';
import { Crown, WifiOff } from 'lucide-react';

const AVATAR_EMOJIS = ['🐱', '🐶', '🦊', '🐻', '🐼', '🦁', '🐸', '🐵'];
const AVATAR_BG_COLORS = [
  'bg-cartoon-yellow',
  'bg-cartoon-sky',
  'bg-cartoon-coral',
  'bg-cartoon-mint',
  'bg-cartoon-purple',
  'bg-cartoon-orange',
  'bg-emerald-300',
  'bg-pink-300',
];

interface AvatarProps {
  player: Player;
  isHost?: boolean;
  isCurrentTurn?: boolean;
  isMe?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Avatar: React.FC<AvatarProps> = ({
  player,
  isHost = false,
  isCurrentTurn = false,
  isMe = false,
  size = 'md',
}) => {
  const avatarIndex = (player.avatar || 0) % AVATAR_EMOJIS.length;
  const emoji = AVATAR_EMOJIS[avatarIndex];
  const bgColor = AVATAR_BG_COLORS[avatarIndex];

  const sizeClasses = {
    sm: 'w-10 h-10 text-xl',
    md: 'w-14 h-14 text-2xl',
    lg: 'w-20 h-20 text-4xl',
  };

  const isEliminated = player.status === 'ELIMINATED';

  return (
    <div className="relative inline-flex flex-col items-center">
      {/* Indicador de Host (Coroa) */}
      {isHost && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 text-yellow-500 drop-shadow-[0_2px_0_#000]">
          <Crown className="w-5 h-5 fill-yellow-400 stroke-cartoon-dark stroke-[2.5]" />
        </div>
      )}

      {/* Círculo do avatar */}
      <div
        className={`relative flex items-center justify-center rounded-2xl border-3 border-cartoon-dark shadow-cartoon select-none transition-transform ${bgColor} ${
          sizeClasses[size]
        } ${isCurrentTurn ? 'scale-110 ring-4 ring-cartoon-yellow ring-offset-2 animate-bounce' : ''} ${
          isEliminated ? 'opacity-40 grayscale' : ''
        }`}
      >
        <span>{emoji}</span>

        {/* Badge de desconectado */}
        {!player.connected && (
          <div className="absolute -bottom-1 -right-1 bg-red-500 text-white p-0.5 rounded-full border-2 border-black">
            <WifiOff className="w-3 h-3" />
          </div>
        )}
      </div>

      {/* Nome do jogador */}
      <div className="mt-1 flex items-center gap-1 max-w-[85px] truncate text-center">
        <span className="text-xs font-bold text-cartoon-dark truncate">
          {player.nickname}
        </span>
        {isMe && (
          <span className="text-[10px] font-black bg-cartoon-yellow px-1 py-0.2 rounded border border-black">
            Você
          </span>
        )}
      </div>
    </div>
  );
};
