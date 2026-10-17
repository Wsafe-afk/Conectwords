import React from 'react';
import { AVATAR_EMOJIS } from '@conecta/shared';
import { sound } from '../fx/sound.js';

interface AvatarPickerProps {
  value: number;
  onChange: (index: number) => void;
}

/**
 * Seletor de avatar — os mesmos emojis usados no jogo (índice estável).
 */
export const AvatarPicker: React.FC<AvatarPickerProps> = ({ value, onChange }) => {
  return (
    <div>
      <span className="block text-sm font-black text-cartoon-dark mb-1">Seu Avatar</span>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Escolha de avatar">
        {AVATAR_EMOJIS.map((emoji, idx) => {
          const isSelected = value === idx;
          return (
            <button
              key={emoji}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`Avatar ${emoji}`}
              onClick={() => {
                sound.pop();
                onChange(idx);
              }}
              className={`w-9 h-9 flex items-center justify-center text-lg rounded-xl border-2 transition-all cursor-pointer select-none ${
                isSelected
                  ? 'bg-cartoon-yellow border-cartoon-dark shadow-cartoon-sm scale-105'
                  : 'bg-white border-cartoon-dark/30 hover:border-cartoon-dark hover:bg-gray-50'
              }`}
            >
              {emoji}
            </button>
          );
        })}
      </div>
    </div>
  );
};
