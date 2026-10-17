import { useMemo } from 'react';
import confetti from 'canvas-confetti';
import { sound } from './sound.js';

export function useFx() {
  const isReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // useMemo mantém as referências estáveis entre renders; sem isso, componentes
  // como o Timer reiniciavam seus efeitos a cada segundo.
  return useMemo(() => {
    const playAccepted = () => {
      sound.success();
      if (!isReducedMotion) {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#FFDE59', '#FF5757', '#7ED957', '#5CE1E6', '#CB6CE6'],
        });
      }
    };

    const playRejected = () => {
      sound.error();
    };

    const playLifeLost = () => {
      sound.lifeLost();
    };

    const playTick = () => {
      sound.tick();
    };

    const playWin = () => {
      sound.win();
      if (!isReducedMotion) {
        const end = Date.now() + 3000;
        const frame = () => {
          confetti({
            particleCount: 5,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#FFDE59', '#FF5757', '#7ED957'],
          });
          confetti({
            particleCount: 5,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#5CE1E6', '#CB6CE6', '#FF914D'],
          });
          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        };
        frame();
      }
    };

    const playPop = () => {
      sound.pop();
    };

    return {
      playAccepted,
      playRejected,
      playLifeLost,
      playTick,
      playWin,
      playPop,
      sound,
    };
  }, [isReducedMotion]);
}
