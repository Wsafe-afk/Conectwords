import React, { useEffect, useRef, useState } from 'react';
import type { RoomView } from '@conecta/shared';
import { Avatar } from '../components/Avatar.js';
import { HeartLives } from '../components/HeartLives.js';
import { Timer } from '../components/Timer.js';
import { PrefixChips } from '../components/PrefixChips.js';
import { SpeechBubble } from '../components/SpeechBubble.js';
import { WordHistory } from '../components/WordHistory.js';
import { ReactionsBar } from '../components/ReactionsBar.js';
import { Button } from '../components/Button.js';
import { getSocket } from '../lib/socket.js';
import { useRoomStore } from '../store/roomStore.js';
import { Send, AlertCircle } from 'lucide-react';
import { cleanDraftText } from '@conecta/shared';

interface GameViewProps {
  room: RoomView;
  myPlayerId: string;
}

export const GameView: React.FC<GameViewProps> = ({ room, myPlayerId }) => {
  const { currentDrafts, lastReject, clockOffset } = useRoomStore();
  const [inputText, setInputText] = useState('');
  const [seq, setSeq] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const draftThrottleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const game = room.game!;
  const isMyTurn = game.currentPlayerId === myPlayerId;
  const currentPlayer = room.players.find((p) => p.id === game.currentPlayerId);
  const myPlayer = room.players.find((p) => p.id === myPlayerId);
  const isEliminated = myPlayer?.status === 'ELIMINATED';

  // Foco automático no campo quando for a minha vez
  useEffect(() => {
    if (isMyTurn && !isEliminated) {
      setInputText('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [game.turnId, isMyTurn, isEliminated]);

  // Transmite rascunho de digitação em tempo real (RF-012, throttle 50ms)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const cleaned = cleanDraftText(rawValue);
    setInputText(cleaned);

    if (!isMyTurn || isEliminated) return;

    if (draftThrottleTimeout.current) {
      clearTimeout(draftThrottleTimeout.current);
    }

    draftThrottleTimeout.current = setTimeout(() => {
      const socket = getSocket();
      if (socket) {
        const nextSeq = seq + 1;
        setSeq(nextSeq);
        socket.emit('draft:update', { text: cleaned, seq: nextSeq });
      }
    }, 50);
  };

  // Submissão de palavra
  const handleSubmitWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMyTurn || isEliminated || !inputText.trim()) return;

    const socket = getSocket();
    if (socket) {
      socket.emit('word:submit', { word: inputText.trim() }, (res: any) => {
        if (res?.ok) {
          setInputText('');
        }
      });
    }
  };

  // Preenche o input ao tocar em um chip de prefixo (RF-015)
  const handleSelectPrefix = (prefix: string) => {
    if (!isMyTurn || isEliminated) return;
    setInputText(prefix);
    inputRef.current?.focus();
  };

  // Texto atual exibido no balão de fala
  const activeDraftText = isMyTurn
    ? inputText
    : currentDrafts[game.currentPlayerId]?.text || '';

  return (
    <div className="w-full max-w-md mx-auto flex flex-col flex-1 min-h-0 gap-2 pb-1">
      {/* 1. TOPO: Lista de Jogadores e Vidas */}
      <div className="shrink-0 bg-white/90 backdrop-blur rounded-3xl border-3 border-cartoon-dark p-2 sm:p-3 shadow-cartoon">
        <div className="flex items-center justify-around overflow-x-auto gap-3 py-1">
          {room.players.map((p) => {
            const isTurn = p.id === game.currentPlayerId;
            return (
              <div
                key={p.id}
                className={`flex flex-col items-center min-w-[70px] transition-transform ${
                  isTurn ? 'scale-105' : 'opacity-80'
                }`}
              >
                <Avatar
                  player={p}
                  isHost={p.id === room.hostId}
                  isCurrentTurn={isTurn}
                  isMe={p.id === myPlayerId}
                  size="sm"
                />
                <div className="mt-1">
                  <HeartLives
                    lives={p.lives}
                    maxLives={room.settings.lives}
                    size="sm"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. CENTRO: Balão de digitação ao vivo + histórico (rolável se faltar espaço) */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-1.5 overflow-y-auto py-1">
        {/* Balão com a digitação em tempo real */}
        <SpeechBubble
          text={activeDraftText}
          speakerName={currentPlayer?.nickname || 'Jogador'}
          isMe={isMyTurn}
        />

        {/* Alerta de palavra rejeitada */}
        {lastReject && isMyTurn && (
          <div className="mt-1 px-4 py-2 bg-cartoon-coral text-white rounded-2xl border-3 border-cartoon-dark shadow-cartoon text-xs font-black flex items-center gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{lastReject.detail}</span>
          </div>
        )}

        {/* Histórico retrátil da corrente */}
        <WordHistory words={game.words} players={room.players} />
      </div>

      {/* 3. BASE: Cronômetro + prefixo + campo de digitação sempre visíveis acima do teclado */}
      <div className="shrink-0 space-y-2">
        {/* Cronômetro */}
        <div className="flex justify-center">
          <Timer
            deadlineAt={game.deadlineAt}
            clockOffset={clockOffset}
            totalSeconds={room.settings.turnSeconds}
          />
        </div>

        {/* Chips de prefixo exigido tocáveis (RF-015) */}
        <PrefixChips
          requiredPrefixes={game.requiredPrefixes}
          onSelectPrefix={handleSelectPrefix}
          disabled={!isMyTurn || isEliminated}
        />

        <ReactionsBar />

        {isEliminated ? (
          <div className="p-3 bg-red-100 rounded-2xl border-2 border-cartoon-coral text-center font-bold text-cartoon-coral text-sm">
            Você foi eliminado e agora está assistindo a partida! 👀
          </div>
        ) : isMyTurn ? (
          <form onSubmit={handleSubmitWord} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={handleInputChange}
              placeholder="Digite sua palavra..."
              maxLength={32}
              className="input-cartoon flex-1"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="characters"
              spellCheck="false"
            />
            <Button
              type="submit"
              variant="mint"
              size="md"
              disabled={!inputText.trim()}
              className="px-5 shrink-0 flex items-center gap-1.5"
            >
              <Send className="w-5 h-5" />
              <span className="hidden sm:inline">Mandar!</span>
            </Button>
          </form>
        ) : (
          <div className="p-3 bg-cartoon-cream rounded-2xl border-2 border-cartoon-dark/30 text-center font-bold text-cartoon-dark/70 text-sm">
            Vez de <span className="text-cartoon-coral font-black">{currentPlayer?.nickname}</span>. Aguarde sua vez!
          </div>
        )}
      </div>
    </div>
  );
};
