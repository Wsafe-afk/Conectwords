import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRoomStore } from '../store/roomStore.js';
import { initSocket, disconnectSocket } from '../lib/socket.js';
import { useFx } from '../fx/useFx.js';
import { Lobby } from './Lobby.js';
import { ChoosingLetter } from './ChoosingLetter.js';
import { GameView } from './GameView.js';
import { FinishedView } from './FinishedView.js';
import { WifiOff, Home } from 'lucide-react';

export const RoomPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const {
    sessionToken,
    playerId,
    roomCode,
    room,
    setRoom,
    addPlayer,
    removePlayer,
    updatePlayerConnection,
    setHost,
    updateSettings,
    setDraft,
    addWordAccepted,
    setReject,
    addFloatingReaction,
    syncClock,
  } = useRoomStore();

  const { playAccepted, playRejected, playLifeLost } = useFx();
  const [connecting, setConnecting] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const targetCode = code?.toUpperCase();
    if (!sessionToken || roomCode !== targetCode || !playerId) {
      // Se não tiver sessão para este código, redireciona para a tela de convite
      navigate(`/s/${targetCode}`);
      return;
    }

    const socket = initSocket(sessionToken);

    socket.on('connect', () => {
      setConnecting(false);
      setErrorMsg(null);
      // Sincroniza relógio
      socket.emit('time:sync', { clientTime: Date.now() });
    });

    socket.on('connect_error', (err) => {
      setConnecting(false);
      setErrorMsg(err.message === 'UNAUTHORIZED' ? 'Sessão expirada ou inválida.' : 'Erro de conexão com o servidor.');
    });

    socket.on('time:sync:ack', (data) => {
      syncClock(data.clientTime, data.serverTime);
    });

    socket.on('room:state', (roomView) => {
      setRoom(roomView);
    });

    socket.on('player:joined', (data) => {
      addPlayer(data.player);
    });

    socket.on('player:left', (data) => {
      removePlayer(data.playerId);
    });

    socket.on('player:connection', (data) => {
      updatePlayerConnection(data.playerId, data.connected);
    });

    socket.on('host:changed', (data) => {
      setHost(data.hostId);
    });

    socket.on('settings:changed', (settings) => {
      updateSettings(settings);
    });

    socket.on('game:started', (data) => {
      setRoom({
        ...useRoomStore.getState().room!,
        phase: 'CHOOSING_LETTER',
        turnOrder: data.turnOrder,
        game: {
          startLetter: null,
          chooserId: data.chooserId,
          currentPlayerId: data.turnOrder[1 % data.turnOrder.length],
          turnId: 0,
          deadlineAt: data.deadlineAt,
          requiredPrefixes: [],
          words: [],
          winnerId: null,
        },
      });
    });

    socket.on('letter:chosen', (data) => {
      const current = useRoomStore.getState().room;
      if (current && current.game) {
        setRoom({
          ...current,
          game: {
            ...current.game,
            startLetter: data.letter,
          },
        });
      }
    });

    socket.on('turn:started', (data) => {
      const current = useRoomStore.getState().room;
      if (current && current.game) {
        setRoom({
          ...current,
          phase: 'PLAYING',
          game: {
            ...current.game,
            turnId: data.turnId,
            currentPlayerId: data.playerId,
            requiredPrefixes: data.requiredPrefixes,
            deadlineAt: data.deadlineAt,
          },
        });
      }
    });

    socket.on('draft:changed', (data) => {
      setDraft(data.playerId, data.text, data.seq);
    });

    socket.on('word:accepted', (data) => {
      playAccepted();
      addWordAccepted(data.entry, data.nextPrefixes);
    });

    socket.on('word:rejected', (data) => {
      playRejected();
      setReject({ reason: data.reason, detail: data.detail });
    });

    socket.on('turn:timeout', (data) => {
      playLifeLost();
      const current = useRoomStore.getState().room;
      if (current) {
        const players = current.players.map((p) =>
          p.id === data.playerId ? { ...p, lives: data.livesLeft } : p
        );
        setRoom({ ...current, players });
      }
    });

    socket.on('player:eliminated', (data) => {
      const current = useRoomStore.getState().room;
      if (current) {
        const players = current.players.map((p) =>
          p.id === data.playerId ? { ...p, status: 'ELIMINATED' as const } : p
        );
        setRoom({ ...current, players });
      }
    });

    socket.on('game:finished', (data) => {
      const current = useRoomStore.getState().room;
      if (current && current.game) {
        setRoom({
          ...current,
          phase: 'FINISHED',
          game: {
            ...current.game,
            winnerId: data.winnerId,
          },
        });
      }
    });

    socket.on('reaction:received', (data) => {
      addFloatingReaction(data.playerId, data.emoji);
    });

    return () => {
      disconnectSocket();
    };
  }, [code, sessionToken, roomCode, playerId, navigate, setRoom, addPlayer, removePlayer, updatePlayerConnection, setHost, updateSettings, setDraft, addWordAccepted, setReject, addFloatingReaction, syncClock, playAccepted, playRejected, playLifeLost]);

  if (errorMsg) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <div className="p-6 bg-white rounded-3xl border-3 border-cartoon-dark shadow-cartoon max-w-sm space-y-4">
          <WifiOff className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-black text-cartoon-dark">Ops! Algo deu errado</h2>
          <p className="text-sm font-bold text-gray-500">{errorMsg}</p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="btn-cartoon bg-cartoon-yellow px-5 py-2.5 text-base w-full flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            <span>Voltar ao Início</span>
          </button>
        </div>
      </div>
    );
  }

  if (connecting || !room) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <div className="text-4xl animate-bounce mb-3">🎮</div>
        <p className="text-lg font-black text-cartoon-dark">Conectando à sala...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-3 sm:p-5 max-w-lg mx-auto">
      {room.phase === 'LOBBY' && <Lobby room={room} myPlayerId={playerId!} />}
      {room.phase === 'CHOOSING_LETTER' && <ChoosingLetter room={room} myPlayerId={playerId!} />}
      {room.phase === 'PLAYING' && <GameView room={room} myPlayerId={playerId!} />}
      {room.phase === 'FINISHED' && <FinishedView room={room} myPlayerId={playerId!} />}
    </div>
  );
};
