import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { useFx } from '../fx/useFx.js';

interface TimerProps {
  deadlineAt: number;
  clockOffset: number;
  totalSeconds: number;
}

export const Timer: React.FC<TimerProps> = ({
  deadlineAt,
  clockOffset,
  totalSeconds,
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(totalSeconds);
  const { playTick } = useFx();

  useEffect(() => {
    let lastTickedSecond = -1;

    const interval = setInterval(() => {
      const now = Date.now() + clockOffset;
      const msLeft = Math.max(0, deadlineAt - now);
      const secs = Math.ceil(msLeft / 1000);

      setSecondsLeft(secs);

      // Efeito sonoro nos últimos 5 segundos (uma vez por segundo)
      if (secs <= 5 && secs > 0 && secs !== lastTickedSecond) {
        lastTickedSecond = secs;
        playTick();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [deadlineAt, clockOffset, playTick]);

  const isLowTime = secondsLeft <= 5;
  const isCritical = secondsLeft <= 2;

  // Cor do cronômetro
  let colorClass = 'bg-cartoon-mint text-cartoon-dark border-cartoon-dark';
  if (secondsLeft <= 10 && secondsLeft > 5) {
    colorClass = 'bg-cartoon-yellow text-cartoon-dark border-cartoon-dark';
  } else if (isLowTime) {
    colorClass = 'bg-cartoon-coral text-white border-cartoon-dark animate-pulse';
  }

  return (
    <div
      className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border-3 shadow-cartoon font-black transition-all ${colorClass} ${
        isCritical ? 'scale-110' : ''
      }`}
    >
      <Clock className={`w-5 h-5 ${isLowTime ? 'animate-spin' : ''}`} />
      <span className="text-xl tabular-nums">{secondsLeft}s</span>
    </div>
  );
};
