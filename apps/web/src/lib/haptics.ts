import { sound } from '../fx/sound.js';

/**
 * Feedback tátil opcional via Vibration API (Android/Chrome).
 * Silencioso quando não suportado (ex.: iOS) ou quando o som está mutado,
 * usando o mesmo toggle como preferência de feedback.
 */
export function vibrate(pattern: number | number[]): void {
  try {
    if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
    if (sound.isMuted()) return;
    navigator.vibrate(pattern);
  } catch {
    // melhor esforço: nunca quebra o jogo
  }
}
