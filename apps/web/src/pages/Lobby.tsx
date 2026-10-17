import React, { useState } from 'react';
import type { RoomView, RoomSettings } from '@conecta/shared';
import { Card } from '../components/Card.js';
import { Button } from '../components/Button.js';
import { Avatar } from '../components/Avatar.js';
import { getSocket } from '../lib/socket.js';
import { Copy, Share2, Play, UserX, Settings2, Check } from 'lucide-react';
import { sound } from '../fx/sound.js';

interface LobbyProps {
  room: RoomView;
  myPlayerId: string;
}

export const Lobby: React.FC<LobbyProps> = ({ room, myPlayerId }) => {
  const isHost = room.hostId === myPlayerId;
  const [copied, setCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const socket = getSocket();

  const handleCopyCode = async () => {
    sound.pop();
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleShare = async () => {
    sound.pop();
    const inviteUrl = `${window.location.origin}/s/${room.code}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Conecta Palavras',
          text: `Venha jogar Conecta Palavras comigo! Código da sala: ${room.code}`,
          url: inviteUrl,
        });
      } catch {}
    } else {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleKick = (playerId: string) => {
    if (!isHost || !socket) return;
    socket.emit('player:kick', { playerId });
  };

  const handleUpdateSetting = (partial: Partial<RoomSettings>) => {
    if (!isHost || !socket) return;
    socket.emit('settings:update', partial);
  };

  const handleStartGame = () => {
    if (!isHost || !socket || room.players.length < 2) return;
    setIsStarting(true);
    socket.emit('game:start', {}, (res: any) => {
      setIsStarting(false);
      if (!res?.ok && res?.error) {
        alert(res.error);
      }
    });
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 animate-fade-in pb-10">
      {/* Bloco do Código da Sala */}
      <Card variant="yellow" className="text-center">
        <span className="text-xs font-black uppercase text-cartoon-dark/60 tracking-wider">
          Código da Sala
        </span>
        <div className="text-5xl sm:text-6xl font-black text-cartoon-dark tracking-widest my-2 select-all font-mono drop-shadow-[0_2px_0_#fff]">
          {room.code}
        </div>

        <div className="flex items-center justify-center gap-2 mt-3">
          <Button
            type="button"
            variant="white"
            size="sm"
            onClick={handleCopyCode}
            className="flex items-center gap-1.5"
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copiado!' : 'Copiar'}</span>
          </Button>

          <Button
            type="button"
            variant="sky"
            size="sm"
            onClick={handleShare}
            className="flex items-center gap-1.5"
          >
            <Share2 className="w-4 h-4" />
            <span>Compartilhar</span>
          </Button>
        </div>
      </Card>

      {/* Lista de Jogadores Conectados */}
      <Card>
        <div className="flex items-center justify-between mb-3 border-b-2 border-cartoon-dark/10 pb-2">
          <span className="font-black text-cartoon-dark text-base">
            Jogadores ({room.players.length}/{room.settings.maxPlayers})
          </span>
          <span className="text-xs font-bold text-cartoon-dark/60">
            {room.players.length < 2 ? 'Mínimo 2 jogadores' : 'Pronto para começar!'}
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 py-2">
          {room.players.map((p) => (
            <div key={p.id} className="relative flex flex-col items-center">
              <Avatar
                player={p}
                isHost={p.id === room.hostId}
                isMe={p.id === myPlayerId}
                size="md"
              />

              {/* Botão de expulsar para o host */}
              {isHost && p.id !== myPlayerId && (
                <button
                  type="button"
                  onClick={() => handleKick(p.id)}
                  className="mt-1 text-[10px] font-black text-red-500 hover:text-red-700 flex items-center gap-0.5 cursor-pointer"
                  title="Expulsar jogador"
                >
                  <UserX className="w-3 h-3" />
                  <span>Expulsar</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Configurações da Partida */}
      <Card className="space-y-3">
        <div className="flex items-center gap-2 font-black text-cartoon-dark text-base">
          <Settings2 className="w-5 h-5 text-cartoon-purple" />
          <span>Configurações {isHost ? '(Host)' : ''}</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
          {/* Tempo por turno */}
          <div className="p-2.5 rounded-2xl bg-cartoon-cream border-2 border-cartoon-dark">
            <span className="text-gray-500 block mb-1">Tempo</span>
            {isHost ? (
              <select
                value={room.settings.turnSeconds}
                onChange={(e) => handleUpdateSetting({ turnSeconds: Number(e.target.value) as any })}
                className="font-black text-base bg-transparent outline-none cursor-pointer text-center"
              >
                <option value={10}>10s</option>
                <option value={15}>15s</option>
                <option value={20}>20s</option>
                <option value={30}>30s</option>
              </select>
            ) : (
              <span className="font-black text-base">{room.settings.turnSeconds}s</span>
            )}
          </div>

          {/* Vidas */}
          <div className="p-2.5 rounded-2xl bg-cartoon-cream border-2 border-cartoon-dark">
            <span className="text-gray-500 block mb-1">Vidas</span>
            {isHost ? (
              <select
                value={room.settings.lives}
                onChange={(e) => handleUpdateSetting({ lives: Number(e.target.value) })}
                className="font-black text-base bg-transparent outline-none cursor-pointer text-center"
              >
                {[1, 2, 3, 4, 5].map((l) => (
                  <option key={l} value={l}>
                    {l} ❤️
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-black text-base">{room.settings.lives} ❤️</span>
            )}
          </div>

          {/* Tamanho Mínimo */}
          <div className="p-2.5 rounded-2xl bg-cartoon-cream border-2 border-cartoon-dark">
            <span className="text-gray-500 block mb-1">Mínimo</span>
            {isHost ? (
              <select
                value={room.settings.minWordLength}
                onChange={(e) => handleUpdateSetting({ minWordLength: Number(e.target.value) })}
                className="font-black text-base bg-transparent outline-none cursor-pointer text-center"
              >
                {[2, 3, 4, 5].map((m) => (
                  <option key={m} value={m}>
                    {m} letras
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-black text-base">{room.settings.minWordLength} letras</span>
            )}
          </div>
        </div>
      </Card>

      {/* Botão de Iniciar Partida (Host) ou Aguardando */}
      {isHost ? (
        <Button
          type="button"
          variant="mint"
          size="lg"
          onClick={handleStartGame}
          disabled={room.players.length < 2 || isStarting}
          className="w-full flex items-center justify-center gap-2 shadow-cartoon-lg"
        >
          <Play className="w-6 h-6 fill-cartoon-dark" />
          <span>{isStarting ? 'Iniciando...' : 'Começar Jogo!'}</span>
        </Button>
      ) : (
        <div className="p-4 rounded-2xl bg-cartoon-yellow/20 border-3 border-dashed border-cartoon-dark/40 text-center font-bold text-cartoon-dark/80">
          Aguardando o host iniciar a partida...
        </div>
      )}
    </div>
  );
};
