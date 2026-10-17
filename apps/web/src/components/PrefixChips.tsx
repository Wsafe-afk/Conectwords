import React from 'react';
import { Sparkles } from 'lucide-react';
import { sound } from '../fx/sound.js';

interface PrefixChipsProps {
  requiredPrefixes: string[];
  onSelectPrefix?: (prefix: string) => void;
  disabled?: boolean;
  compact?: boolean;
}

export const PrefixChips: React.FC<PrefixChipsProps> = ({
  requiredPrefixes,
  onSelectPrefix,
  disabled = false,
  compact = false,
}) => {
  if (!requiredPrefixes || requiredPrefixes.length === 0) return null;

  return (
    <div className={`flex flex-col items-center ${compact ? 'gap-0' : 'gap-1.5 my-2'}`}>
      {!compact && (
        <div className="flex items-center gap-1 text-xs font-black uppercase text-cartoon-dark/70 tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-cartoon-orange" />
          <span>Comece com:</span>
        </div>
      )}

      <div className={`flex flex-wrap items-center justify-center ${compact ? 'gap-1.5' : 'gap-2'}`}>
        {requiredPrefixes.map((prefix) => (
          <button
            key={prefix}
            type="button"
            disabled={disabled}
            onClick={() => {
              sound.pop();
              onSelectPrefix?.(prefix.toUpperCase());
            }}
            className={`group relative bg-cartoon-yellow rounded-2xl border-3 border-cartoon-dark shadow-cartoon hover:bg-yellow-300 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer select-none ${
              compact ? 'px-3 py-1' : 'px-4 py-2'
            }`}
            title="Toque para preencher o campo"
          >
            <span className={`font-black text-cartoon-dark tracking-wide ${compact ? 'text-lg' : 'text-xl'}`}>
              {prefix.toUpperCase()}
            </span>
            {!compact && (
              <span className="hidden group-hover:inline-block ml-1 text-xs text-cartoon-dark/60 font-bold">
                (toque)
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
