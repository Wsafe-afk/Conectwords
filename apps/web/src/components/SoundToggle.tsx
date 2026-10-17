import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { sound } from '../fx/sound.js';

interface SoundToggleProps {
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Botão de liga/desliga do som, mantendo o mesmo estado em todas as telas.
 */
export const SoundToggle: React.FC<SoundToggleProps> = ({ size = 'md', className = '' }) => {
  const [muted, setMuted] = useState(sound.isMuted());

  const handleToggle = () => {
    const isNowMuted = sound.toggleMute();
    setMuted(isNowMuted);
    if (!isNowMuted) sound.pop(); // feedback ao reativar
  };

  const sizeClasses =
    size === 'sm' ? 'w-9 h-9 rounded-xl' : 'w-12 h-12 rounded-2xl';
  const iconClasses = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={muted ? 'Ativar som' : 'Desativar som'}
      title={muted ? 'Ativar som' : 'Desativar som'}
      className={`flex items-center justify-center bg-white border-2 border-cartoon-dark shadow-cartoon-sm hover:bg-gray-50 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer ${sizeClasses} ${className}`}
    >
      {muted ? (
        <VolumeX className={`${iconClasses} text-red-500`} />
      ) : (
        <Volume2 className={`${iconClasses} text-cartoon-dark`} />
      )}
    </button>
  );
};
