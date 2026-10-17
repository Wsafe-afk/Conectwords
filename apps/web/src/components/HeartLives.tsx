import React from 'react';
import { Heart } from 'lucide-react';

interface HeartLivesProps {
  lives: number;
  maxLives: number;
  size?: 'sm' | 'md';
}

export const HeartLives: React.FC<HeartLivesProps> = ({
  lives,
  maxLives,
  size = 'md',
}) => {
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: maxLives }).map((_, idx) => {
        const isActive = idx < lives;
        return (
          <div
            key={idx}
            className={`transition-all duration-300 transform ${
              isActive ? 'scale-100' : 'scale-75 opacity-30 grayscale'
            }`}
          >
            <Heart
              className={`${iconSize} ${
                isActive
                  ? 'fill-cartoon-coral text-cartoon-coral stroke-cartoon-dark stroke-[2]'
                  : 'fill-gray-300 text-gray-300 stroke-cartoon-dark stroke-[2]'
              }`}
            />
          </div>
        );
      })}
    </div>
  );
};
