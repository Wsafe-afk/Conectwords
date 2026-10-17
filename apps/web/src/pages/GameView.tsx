import React, { useEffect, useRef, useState } from 'react';
import type { RoomView } from '@conecta/shared';
import { Avatar } from '../components/Avatar.js';
import { HeartLives } from '../components/HeartLives.js';
import { Timer } from '../components/Timer.js';
import { PrefixChips } from '../components/PrefixChips.js';
import { SpeechBubble } from '../components/SpeechBubble.js';
import { WordHistory } from '../components/WordHistory.js';
import { ReactionsBar } from '../components/ReactionsBar.js';
import { Keyboard } from '../components/Keyboard.js';
import { getSocket } from '../lib/socket.js';
import { useRoomStore } from '../store/roomStore.js';
import { vibrate } from '../lib/haptics.js';
import { sound } from '../fx/sound.js';
import { AlertCircle, Check, X } from 'lucide-react';
import { cleanDraftText } from '@conecta/shared';

interface GameViewProps {
  room: RoomView;
  myPlayerId: string;
}

export const GameView: React.FC<GameViewProps> = ({ room, myPlayerId }) => {
  const { currentDrafts, lastReject, clockOffset, setReject } = useRoomStore();
  const [inputText, setInputText] = useState('');
  const seqRef = useRef(1);
  const draftThrottleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const game = room.game!;
  const isMyTurn = game.currentPlayerId === myPlayerId;
  const currentPlayer = room.players.find((p) => p.id === game.currentPlayerId);
  const myPlayer = room.players.find((p) => p.id === myPlayerId);
  const isEliminated = myPlayer?.status === 'ELIMINATED';

  // Limpa o campo quando um novo turno começa (evita rascunho antigo reaparecer)
  const prevTurnIdRef = useRef(game.turnId);
  useEffect(() => {
    if (prevTurnIdRef.current !== game.turnId) {
      prevTurnIdRef.current = game.turnId;
      setInputText('');
    }
  }, [game.turnId]);

  // O aviso de rejeição some sozinho depois de alguns segundos
  useEffect(() => {
    if (!lastReject) return;
    const timeout = setTimeout(() => setReject(null), 3500);
    return () => clearTimeout(timeout);
  }, [lastReject, setReject]);

  // Atualiza o texto local e transmite o rascunho (RF-012, throttle ~50ms)
  const sendDraft = (text: string) => {
    const cleaned = cleanDraftText(text);
    setInputText(cleaned);

    if (!isMyTurn || isEliminated) return;

    if (draftThrottleTimeout.current) {
      clearTimeout(draftThrottleTimeout.current);
    }
    draftThrottleTimeout.current = setTimeout(() => {
      const socket = getSocket();
      if (socket) {
        seqRef.current += 1;
        socket.emit('draft:update', { text: cleaned, seq: seqRef.current });
      }
    }, 50);
  };

  const handleKey = (char: string) => {
    if (inputText.length >= 32) return;
    sound.pop();
    vibrate(8);
    sendDraft(inputText + char);
  };

  const handleBackspace = () => {
    sound.pop();
    vibrate(8);
    sendDraft(inputText.slice(0, -1));
  };

  const handleSubmitWord = () => {
    if (!isMyTurn || isEliminated || !inputText.trim()) return;
    vibrate(15);
    const socket = getSocket();
    if (socket) {
      socket.emit('word:submit', { word: inputText.trim() }, (res: any) => {
        if (res?.ok) {
          setInputText('');
        }
      });
    }
  };

  // Preenche o campo ao tocar em um chip de prefixo (RF-015)
  const handleSelectPrefix = (prefix: string) => {
    if (!isMyTurn || isEliminated) return;
    sendDraft(prefix);
  };

  // Suporte a teclado físico (desktop) — mesma lógica dos botões do app
  useEffect(() => {
    if (!isMyTurn || isEliminated) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Backspace') {
        e.preventDefault();
        sendDraft(inputText.slice(0, -1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmitWord();
      } else if (/^[a-zA-ZÀ-ÿ]$/.test(e.key)) {
        e.preventDefault();
        if (inputText.length < 32) sendDraft(inputText + e.key.toUpperCase());
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMyTurn, isEliminated, inputText]);

  const opponentDraft = currentDrafts[game.currentPlayerId]?.text || '';

  // Validação visual ao vivo: o texto começa com o prefixo exigido?
  const prefixOk =
    inputText.length === 0
      ? null
      : game.requiredPrefixes.some((p) =>
          inputText.toUpperCase().startsWith(p.toUpperCase())
        );

  return (
    <div className="w-full max-w-md mx-auto flex flex-col flex-1 min-h-0 gap-1.5 pb-1">
      {/* 1. TOPO: Lista compacta de Jogadores e Vidas */}
      <div className="shrink-0 bg-white/90 backdrop-blur rounded-2xl border-3 border-cartoon-dark p-1.5 shadow-cartoon">
        <div className="flex items-center justify-around overflow-x-auto gap-2">
          {room.players.map((p) => {
            const isTurn = p.id === game.currentPlayerId;
            return (
              <div
                key={p.id}
                className={`flex flex-col items-center min-w-[56px] transition-transform ${
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
                <div className="mt-0.5">
                  <HeartLives lives={p.lives} maxLives={room.settings.lives} size="sm" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. CENTRO: balão da digitação ao vivo (dos outros) + rejeição + histórico */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-1.5 overflow-y-auto py-1">
        {!isMyTurn && currentPlayer && (
          <SpeechBubble
            text={opponentDraft}
            speakerName={currentPlayer.nickname}
            isMe={false}
          />
        )}

        {lastReject && isMyTurn && (
          <div
            role="status"
            aria-live="polite"
            className="px-3 py-1.5 bg-cartoon-coral text-white rounded-2xl border-2 border-cartoon-dark shadow-cartoon text-xs font-black flex items-center gap-1.5 animate-shake"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{lastReject.detail}</span>
          </div>
        )}

        <WordHistory words={game.words} players={room.players} />
      </div>

      {/* 3. BASE: reações + cronômetro + prefixo + campo/teclado sempre visíveis */}
      <div className="shrink-0 space-y-1.5">
        <ReactionsBar />

        <div className="flex items-center justify-center gap-2">
          <Timer
            deadlineAt={game.deadlineAt}
            clockOffset={clockOffset}
            totalSeconds={room.settings.turnSeconds}
          />
          <PrefixChips
            requiredPrefixes={game.requiredPrefixes}
            onSelectPrefix={handleSelectPrefix}
            disabled={!isMyTurn || isEliminated}
            compact
          />
        </div>

        {isEliminated ? (
          <div className="p-3 bg-red-100 rounded-2xl border-2 border-cartoon-coral text-center font-bold text-cartoon-coral text-sm">
            Você foi eliminado e agora está assistindo a partida! 👀
          </div>
        ) : isMyTurn ? (
          <>
            {/* Campo de palavra (tela, não dispara teclado nativo) */}
            <div
              className={`min-h-[44px] flex items-center px-3 rounded-2xl border-3 shadow-cartoon overflow-hidden transition-colors ${
                prefixOk === null
                  ? 'border-cartoon-dark bg-white'
                  : prefixOk
                    ? 'border-cartoon-mint bg-green-50'
                    : 'border-cartoon-coral bg-red-50'
              }`}
            >
              {inputText ? (
                <span className="text-xl font-black tracking-wide text-cartoon-dark break-all">
                  {inputText.toUpperCase()}
                </span>
              ) : (
                <span className="text-sm font-bold text-gray-300">Toque nas letras…</span>
              )}
              <span className="inline-block w-2 h-6 bg-cartoon-sky animate-pulse ml-1 shrink-0" />
              {prefixOk !== null && (
                <span className="ml-auto shrink-0 pl-2">
                  {prefixOk ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <X className="w-5 h-5 text-cartoon-coral" />
                  )}
                </span>
              )}
            </div>

            <Keyboard
              onKey={handleKey}
              onBackspace={handleBackspace}
              onEnter={handleSubmitWord}
              canSubmit={!!inputText.trim()}
            />
          </>
        ) : (
          <div className="p-3 bg-cartoon-cream rounded-2xl border-2 border-cartoon-dark/30 text-center font-bold text-cartoon-dark/70 text-sm">
            Vez de <span className="text-cartoon-coral font-black">{currentPlayer?.nickname}</span>.
            Aguarde sua vez!
          </div>
        )}
      </div>
    </div>
  );
};
