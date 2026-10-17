export interface ActiveTimer {
  timeoutId: NodeJS.Timeout;
  turnId?: number;
  type: 'turn' | 'letter';
}

export class TimerService {
  private activeTimers = new Map<string, ActiveTimer>();

  scheduleTurnTimer(
    roomCode: string,
    turnId: number,
    durationMs: number,
    onTimeout: () => void
  ): void {
    this.clearTimer(roomCode);

    const code = roomCode.toUpperCase();
    const timeoutId = setTimeout(() => {
      const timer = this.activeTimers.get(code);
      if (timer && timer.turnId === turnId) {
        this.activeTimers.delete(code);
        onTimeout();
      }
    }, durationMs);

    this.activeTimers.set(code, {
      timeoutId,
      turnId,
      type: 'turn',
    });
  }

  scheduleLetterTimer(
    roomCode: string,
    durationMs: number,
    onTimeout: () => void
  ): void {
    this.clearTimer(roomCode);

    const code = roomCode.toUpperCase();
    const timeoutId = setTimeout(() => {
      const timer = this.activeTimers.get(code);
      if (timer && timer.type === 'letter') {
        this.activeTimers.delete(code);
        onTimeout();
      }
    }, durationMs);

    this.activeTimers.set(code, {
      timeoutId,
      type: 'letter',
    });
  }

  clearTimer(roomCode: string): void {
    const code = roomCode.toUpperCase();
    const timer = this.activeTimers.get(code);
    if (timer) {
      clearTimeout(timer.timeoutId);
      this.activeTimers.delete(code);
    }
  }
}

export const timerService = new TimerService();
