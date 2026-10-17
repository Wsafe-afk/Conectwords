import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/Card.js';
import { Button } from '../components/Button.js';
import { useRoomStore } from '../store/roomStore.js';
import { apiRequest } from '../lib/api.js';
import { Sparkles, ArrowRight } from 'lucide-react';

export const InvitePage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { nickname, setSession, setError } = useRoomStore();
  const [nickInput, setNickInput] = useState(nickname || '');
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNick = nickInput.trim();
    if (cleanNick.length < 2) {
      alert('Por favor, informe um apelido com pelo menos 2 caracteres.');
      return;
    }

    const roomCode = code?.toUpperCase();
    if (!roomCode) return;

    setIsJoining(true);
    try {
      const data = await apiRequest(`/api/rooms/${roomCode}/join`, {
        method: 'POST',
        body: JSON.stringify({ nickname: cleanNick }),
      });

      setSession(data.sessionToken, data.playerId, data.code, data.room.players.find((p: any) => p.id === data.playerId)?.nickname || cleanNick);
      navigate(`/room/${data.code}`);
    } catch (err: any) {
      alert(err.message || 'Erro ao entrar na sala.');
      setError(err.message);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 max-w-md mx-auto">
      <Card className="w-full text-center space-y-4">
        <div className="inline-block bg-cartoon-yellow p-3 rounded-full border-3 border-cartoon-dark mb-1">
          <Sparkles className="w-8 h-8 text-cartoon-coral" />
        </div>

        <h1 className="text-2xl font-black text-cartoon-dark">
          Convite para Jogar!
        </h1>
        <p className="text-xs font-bold text-cartoon-dark/70">
          Você foi convidado para a sala:
        </p>
        <div className="text-4xl font-black text-cartoon-dark font-mono bg-cartoon-yellow/20 py-2 rounded-2xl border-2 border-cartoon-dark tracking-widest">
          {code?.toUpperCase()}
        </div>

        <form onSubmit={handleJoin} className="space-y-4 text-left pt-2">
          <div>
            <label className="block text-sm font-black text-cartoon-dark mb-1">
              Escolha seu Apelido
            </label>
            <input
              type="text"
              value={nickInput}
              onChange={(e) => setNickInput(e.target.value)}
              placeholder="Ex: Cristiano, Bia..."
              maxLength={16}
              className="input-cartoon"
              required
              autoFocus
            />
          </div>

          <Button
            type="submit"
            variant="mint"
            size="lg"
            className="w-full flex items-center justify-center gap-2"
            disabled={isJoining}
          >
            <span>{isJoining ? 'Entrando...' : 'Entrar na Sala'}</span>
            <ArrowRight className="w-5 h-5" />
          </Button>
        </form>
      </Card>
    </div>
  );
};
