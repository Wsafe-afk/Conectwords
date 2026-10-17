import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRoomStore } from '../store/roomStore.js';
import { initSocket, disconnectSocket, getSocket } from '../lib/socket.js';
import { useFx } from '../fx/useFx.js';
import { vibrate } from '../lib/haptics.js';
import { Lobby } from './Lobby.js';
import { ChoosingLetter } from './ChoosingLetter.js';
import { GameView } from './GameView.js';
import { FinishedView } from './FinishedView.js';
import { SoundToggle } from '../components/SoundToggle.js';
import { WifiOff, Home, LogOut, Gamepad2 } from 'lucide-react';

export const RoomPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const {
    sessionToken,
    playerId,
    roomCode,
    room,
  } = useRoomStore();

  const { playAccepted, playRejected, playLifeLost, playYourTurn } = useFx();
  const [connecting, setConnecting] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [leaveConfirm, setLeaveConfirm] = useState(false);

  // Título da aba reflete a sala atual
  useEffect(() => {
    document.title = room ? `Sala ${room.code} · Conecta Palavras` : 'Conecta Palavras';
    return () => {
      document.title = 'Conecta Palavras — Jogo Multiplayer de Palavras';
    };
  }, [room?.code]);

  // Refs para as ações do store — sempre atualizadas, nunca causam re-run do effect
  const storeRef = useRef(useRoomStore.getState());
  useEffect(() => {
    return useRoomStore.subscribe((state) => {
      storeRef.current = state;
    });
  }, []);

  const fxRef = useRef({ playAccepted, playRejected, playLifeLost, playYourTurn });
  useEffect(() => {
    fxRef.current = { playAccepted, playRejected, playLifeLost, playYourTurn };
  }, [playAccepted, playRejected, playLifeLost, playYourTurn]);

  useEffect(() => {
    const targetCode = code?.toUpperCase();
    const snap = useRoomStore.getState();

    if (!snap.sessionToken || snap.roomCode !== targetCode || !snap.playerId) {
      // Se não tiver sessão para este código, redireciona para a tela de convite
      navigate(`/s/${targetCode}`);
      return;
    }

    const socket = initSocket(snap.sessionToken);

    socket.on('connect', () => {
      setConnecting(false);
      setErrorMsg(null);
      setReconnecting(false);
      // Sincroniza relógio
      socket.emit('time:sync', { clientTime: Date.now() });
    });

    socket.on('disconnect', (reason) => {
      // Não mostra o aviso quando fomos nós que desconectamos (sair da sala)
      if (reason !== 'io client disconnect') {
        setReconnecting(true);
      }
    });

    socket.on('connect_error', (err) => {
      setConnecting(false);
      setErrorMsg(err.message === 'UNAUTHORIZED' ? 'Sessão expirada ou inválida.' : 'Erro de conexão com o servidor.');
    });

    socket.on('time:sync:ack', (data) => {
      storeRef.current.syncClock(data.clientTime, data.serverTime);
    });

    socket.on('room:state', (roomView) => {
      storeRef.current.setRoom(roomView);
      storeRef.current.clearDrafts();
      if (roomView.phase !== 'FINISHED') storeRef.current.setFinalStats(null);
    });

    socket.on('player:joined', (data) => {
      storeRef.current.addPlayer(data.player);
    });

    socket.on('player:left', (data) => {
      // Fui eu que saí/foi expulso: volta para a tela inicial
      if (data.playerId === snap.playerId) {
        useRoomStore.getState().clearSession();
        navigate('/');
        return;
      }
      storeRef.current.removePlayer(data.playerId);
    });

    socket.on('player:connection', (data) => {
      storeRef.current.updatePlayerConnection(data.playerId, data.connected);
    });

    socket.on('host:changed', (data) => {
      storeRef.current.setHost(data.hostId);
    });

    socket.on('settings:changed', (settings) => {
      storeRef.current.updateSettings(settings);
    });

    socket.on('game:started', (data) => {
      const current = useRoomStore.getState().room;
      if (!current) return;
      storeRef.current.setFinalStats(null);
      storeRef.current.setRoom({
        ...current,
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
        storeRef.current.setRoom({
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
        storeRef.current.setRoom({
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
      // Novo turno: limpa rascunhos antigos e o aviso de rejeição
      storeRef.current.clearDrafts();

      // Avisa quem vai jogar (som + vibração)
      if (data.playerId === snap.playerId) {
        fxRef.current.playYourTurn();
        vibrate([60, 40, 60]);
      }
    });

    socket.on('draft:changed', (data) => {
      storeRef.current.setDraft(data.playerId, data.text, data.seq);
    });

    socket.on('word:accepted', (data) => {
      fxRef.current.playAccepted();
      storeRef.current.addWordAccepted(data.entry, data.nextPrefixes);
    });

    socket.on('word:rejected', (data) => {
      fxRef.current.playRejected();
      vibrate([40, 60, 40]);
      storeRef.current.setReject({ reason: data.reason, detail: data.detail });
    });

    socket.on('turn:timeout', (data) => {
      fxRef.current.playLifeLost();
      if (data.playerId === snap.playerId) vibrate(120);
      const current = useRoomStore.getState().room;
      if (current) {
        const players = current.players.map((p) =>
          p.id === data.playerId ? { ...p, lives: data.livesLeft } : p
        );
        storeRef.current.setRoom({ ...current, players });
      }
    });

    socket.on('player:eliminated', (data) => {
      const current = useRoomStore.getState().room;
      if (current) {
        const players = current.players.map((p) =>
          p.id === data.playerId ? { ...p, status: 'ELIMINATED' as const } : p
        );
        storeRef.current.setRoom({ ...current, players });
      }
    });

    socket.on('game:finished', (data) => {
      const current = useRoomStore.getState().room;
      if (current && current.game) {
        storeRef.current.setRoom({
          ...current,
          phase: 'FINISHED',
          game: {
            ...current.game,
            winnerId: data.winnerId,
          },
        });
      }
      storeRef.current.setFinalStats(data.stats || null);
    });

    socket.on('reaction:received', (data) => {
      storeRef.current.addFloatingReaction(data.playerId, data.emoji);
    });

    return () => {
      disconnectSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]); // Apenas 'code' como dependência — o socket só deve ser criado/destruído quando o código da sala muda

  const finishLeave = () => {
    useRoomStore.getState().clearSession();
    navigate('/');
  };

  // Confirmação em dois toques para não sair por engano
  const handleLeave = () => {
    if (!leaveConfirm) {
      setLeaveConfirm(true);
      setTimeout(() => setLeaveConfirm(false), 3000);
      return;
    }
    setLeaveConfirm(false);

    const socket = getSocket();
    if (socket && socket.connected) {
      let done = false;
      const finishOnce = () => {
        if (done) return;
        done = true;
        finishLeave();
      };
      socket.emit('room:leave', {}, finishOnce);
      // Fallback: não deixa o jogador preso se o servidor não responder
      setTimeout(finishOnce, 1200);
    } else {
      finishLeave();
    }
  };

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
    <div className="min-h-[var(--app-height)] flex flex-col p-2 sm:p-5 max-w-lg mx-auto">
      {/* Aviso de reconexão */}
      {reconnecting && (
        <div className="fixed top-0 inset-x-0 z-[90] flex justify-center px-4 pt-2 pointer-events-none">
          <div className="flex items-center gap-2 px-4 py-2 bg-cartoon-coral text-white border-3 border-cartoon-dark rounded-2xl shadow-cartoon font-black text-sm animate-fade-in">
            <WifiOff className="w-4 h-4 animate-pulse" />
            <span>Reconectando…</span>
          </div>
        </div>
      )}

      {/* Barra superior: código da sala, som e sair */}
      <div className="shrink-0 flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/80 backdrop-blur rounded-xl border-2 border-cartoon-dark/25 text-xs font-black text-cartoon-dark/70 select-none">
          <Gamepad2 className="w-3.5 h-3.5" />
          <span className="tracking-wider">{room.code}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <SoundToggle size="sm" />
          <button
            type="button"
            onClick={handleLeave}
            aria-label={leaveConfirm ? 'Confirmar saída da sala' : 'Sair da sala'}
            title="Sair da sala"
            className={`flex items-center justify-center gap-1 h-9 px-2 rounded-xl border-2 border-cartoon-dark shadow-cartoon-sm active:translate-y-0.5 active:shadow-none transition-all cursor-pointer ${
              leaveConfirm
                ? 'bg-cartoon-coral text-white text-xs font-black animate-pulse'
                : 'bg-white text-cartoon-dark hover:bg-gray-50'
            }`}
          >
            <LogOut className="w-4 h-4" />
            {leaveConfirm && <span>Sair?</span>}
          </button>
        </div>
      </div>

      {room.phase === 'LOBBY' && <Lobby room={room} myPlayerId={playerId!} />}
      {room.phase === 'CHOOSING_LETTER' && <ChoosingLetter room={room} myPlayerId={playerId!} />}
      {room.phase === 'PLAYING' && <GameView room={room} myPlayerId={playerId!} />}
      {room.phase === 'FINISHED' && <FinishedView room={room} myPlayerId={playerId!} />}
    </div>
  );
};
