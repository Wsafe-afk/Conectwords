import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/Card.js';
import { Button } from '../components/Button.js';
import { AvatarPicker } from '../components/AvatarPicker.js';
import { useRoomStore } from '../store/roomStore.js';
import { apiRequest } from '../lib/api.js';
import { toast } from '../lib/toast.js';
import { Sparkles, ArrowRight, Loader2, Users, Home } from 'lucide-react';

type RoomCheck =
  | { status: 'checking' }
  | { status: 'ready'; players: number; maxPlayers: number }
  | { status: 'not_found' }
  | { status: 'full'; players: number; maxPlayers: number }
  | { status: 'started' }
  | { status: 'offline' };

export const InvitePage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { nickname, avatar, setAvatar, setSession } = useRoomStore();
  const [nickInput, setNickInput] = useState(nickname || '');
  const [isJoining, setIsJoining] = useState(false);
  const [check, setCheck] = useState<RoomCheck>({ status: 'checking' });
  const [reloadKey, setReloadKey] = useState(0);

  const roomCode = (code || '').toUpperCase();

  // Título da aba para o convite
  useEffect(() => {
    document.title = 'Convite · Conecta Palavras';
  }, []);

  // Se o jogador já tem sessão ativa nesta sala, vai direto para ela
  useEffect(() => {
    const snap = useRoomStore.getState();
    if (snap.sessionToken && snap.playerId && snap.roomCode === roomCode) {
      navigate(`/room/${roomCode}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Verifica o estado da sala antes de mostrar o formulário
  useEffect(() => {
    if (!roomCode) return;
    let cancelled = false;
    setCheck({ status: 'checking' });

    apiRequest(`/api/rooms/${roomCode}`)
      .then((data: any) => {
        if (cancelled) return;
        if (data.phase !== 'LOBBY') {
          setCheck({ status: 'started' });
        } else if (data.players >= data.maxPlayers) {
          setCheck({ status: 'full', players: data.players, maxPlayers: data.maxPlayers });
        } else {
          setCheck({ status: 'ready', players: data.players, maxPlayers: data.maxPlayers });
        }
      })
      .catch((err: any) => {
        if (cancelled) return;
        setCheck(err?.status === 404 ? { status: 'not_found' } : { status: 'offline' });
      });

    return () => {
      cancelled = true;
    };
  }, [roomCode, reloadKey]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNick = nickInput.trim();
    if (cleanNick.length < 2) {
      toast.error('Informe um apelido com pelo menos 2 caracteres.');
      return;
    }

    if (!roomCode) return;

    setIsJoining(true);
    try {
      const data = await apiRequest(`/api/rooms/${roomCode}/join`, {
        method: 'POST',
        body: JSON.stringify({ nickname: cleanNick, avatar }),
      });

      setSession(data.sessionToken, data.playerId, data.code, data.room.players.find((p: any) => p.id === data.playerId)?.nickname || cleanNick);
      navigate(`/room/${data.code}`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao entrar na sala.');
      // Se a sala lotou ou começou entre a verificação e o clique, atualiza o estado
      if (err?.status === 404) setCheck({ status: 'not_found' });
      if (err?.status === 409) setReloadKey((k) => k + 1);
      setIsJoining(false);
    }
  };

  const goHome = () => navigate('/');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 max-w-md mx-auto">
      <Card className="w-full text-center space-y-4">
        <div className="inline-block bg-cartoon-yellow p-3 rounded-full border-3 border-cartoon-dark mb-1">
          <Sparkles className="w-8 h-8 text-cartoon-coral" />
        </div>

        <h1 className="text-2xl font-black text-cartoon-dark">Convite para Jogar!</h1>
        <p className="text-xs font-bold text-cartoon-dark/70">Você foi convidado para a sala:</p>
        <div className="text-4xl font-black text-cartoon-dark font-mono bg-cartoon-yellow/20 py-2 rounded-2xl border-2 border-cartoon-dark tracking-widest">
          {roomCode || '-----'}
        </div>

        {check.status === 'checking' && (
          <div className="flex items-center justify-center gap-2 pt-3 text-cartoon-dark/70 font-bold text-sm">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Verificando a sala…</span>
          </div>
        )}

        {check.status === 'ready' && (
          <form onSubmit={handleJoin} className="space-y-4 text-left pt-2">
            <p className="flex items-center justify-center gap-1.5 text-xs font-bold text-green-700 bg-green-50 border-2 border-green-200 rounded-xl py-1.5">
              <Users className="w-4 h-4" />
              <span>
                {check.players} {check.players === 1 ? 'jogador já está' : 'jogadores já estão'} na sala
                {' '}(máx. {check.maxPlayers})
              </span>
            </p>

            <div>
              <label className="block text-sm font-black text-cartoon-dark mb-1" htmlFor="invite-nickname">
                Escolha seu Apelido
              </label>
              <input
                id="invite-nickname"
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

            <AvatarPicker value={avatar} onChange={setAvatar} />

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
        )}

        {check.status === 'not_found' && (
          <div className="space-y-4 pt-3">
            <div className="text-4xl">😕</div>
            <p className="font-black text-cartoon-dark">Sala não encontrada</p>
            <p className="text-xs font-bold text-cartoon-dark/60">
              Confira o código com quem te convidou ou crie uma nova sala.
            </p>
            <Button type="button" variant="yellow" size="lg" onClick={goHome} className="w-full flex items-center justify-center gap-2">
              <Home className="w-5 h-5" />
              <span>Voltar ao Início</span>
            </Button>
          </div>
        )}

        {check.status === 'full' && (
          <div className="space-y-4 pt-3">
            <div className="text-4xl">🚪</div>
            <p className="font-black text-cartoon-dark">Sala cheia</p>
            <p className="text-xs font-bold text-cartoon-dark/60">
              Esta sala já tem {check.players} de {check.maxPlayers} jogadores.
            </p>
            <Button type="button" variant="yellow" size="lg" onClick={goHome} className="w-full flex items-center justify-center gap-2">
              <Home className="w-5 h-5" />
              <span>Voltar ao Início</span>
            </Button>
          </div>
        )}

        {check.status === 'started' && (
          <div className="space-y-4 pt-3">
            <div className="text-4xl">⏳</div>
            <p className="font-black text-cartoon-dark">Partida em andamento</p>
            <p className="text-xs font-bold text-cartoon-dark/60">
              Esta sala já começou a jogar. Peça para te chamarem na próxima rodada!
            </p>
            <Button type="button" variant="yellow" size="lg" onClick={goHome} className="w-full flex items-center justify-center gap-2">
              <Home className="w-5 h-5" />
              <span>Voltar ao Início</span>
            </Button>
          </div>
        )}

        {check.status === 'offline' && (
          <div className="space-y-4 pt-3">
            <div className="text-4xl">📡</div>
            <p className="font-black text-cartoon-dark">Sem conexão com o servidor</p>
            <p className="text-xs font-bold text-cartoon-dark/60">
              Não conseguimos verificar a sala agora. Tente novamente em instantes.
            </p>
            <Button
              type="button"
              variant="sky"
              size="lg"
              onClick={() => setReloadKey((k) => k + 1)}
              className="w-full flex items-center justify-center gap-2"
            >
              <span>Tentar de Novo</span>
            </Button>
            <Button type="button" variant="white" size="md" onClick={goHome} className="w-full flex items-center justify-center gap-2">
              <Home className="w-5 h-5" />
              <span>Voltar ao Início</span>
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};
