import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button.js';
import { Card } from '../components/Card.js';
import { SoundToggle } from '../components/SoundToggle.js';
import { AvatarPicker } from '../components/AvatarPicker.js';
import { useRoomStore } from '../store/roomStore.js';
import { apiRequest } from '../lib/api.js';
import { toast } from '../lib/toast.js';
import { Sparkles, Users, KeyRound, AlertCircle, Info, ChevronDown } from 'lucide-react';

interface HomeProps {
  onOpenJoinModal: () => void;
}

export const Home: React.FC<HomeProps> = ({ onOpenJoinModal }) => {
  const navigate = useNavigate();
  const { nickname, setSession, setNickname, avatar, setAvatar } = useRoomStore();
  const [nickInput, setNickInput] = useState(nickname || '');
  const [nickError, setNickError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const validateNickname = (): string | null => {
    const clean = nickInput.trim();
    if (clean.length < 2) {
      setNickError('Informe um apelido com pelo menos 2 caracteres.');
      return null;
    }
    setNickError(null);
    return clean;
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNick = validateNickname();
    if (!cleanNick) return;

    setIsCreating(true);
    try {
      const data = await apiRequest('/api/rooms', {
        method: 'POST',
        body: JSON.stringify({ nickname: cleanNick, avatar }),
      });

      setSession(data.sessionToken, data.playerId, data.code, cleanNick);
      navigate(`/room/${data.code}`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao conectar ao servidor.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenJoin = () => {
    const cleanNick = validateNickname();
    if (!cleanNick) return;
    // Salva o apelido digitado antes de abrir o modal de entrada,
    // para que o JoinModal use exatamente o nome informado aqui.
    setNickname(cleanNick);
    onOpenJoinModal();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 max-w-md mx-auto">
      {/* Botão de Som no topo */}
      <div className="w-full flex justify-end mb-4">
        <SoundToggle size="md" />
      </div>

      {/* Logotipo Cartoon Animado */}
      <div className="text-center mb-6">
        <div className="inline-block bg-cartoon-yellow px-6 py-3 rounded-3xl border-4 border-cartoon-dark shadow-cartoon-lg transform -rotate-2 hover:rotate-0 transition-transform">
          <h1 className="text-4xl sm:text-5xl font-black text-cartoon-dark tracking-wide flex items-center justify-center gap-2">
            <span>CONECTA</span>
            <Sparkles className="w-8 h-8 text-cartoon-coral animate-spin" />
          </h1>
          <p className="text-xl font-black text-cartoon-coral tracking-widest mt-0.5">
            PALAVRAS
          </p>
        </div>
        <p className="mt-3 font-bold text-cartoon-dark/70 text-sm sm:text-base">
          Encadeie palavras em tempo real com seus amigos!
        </p>
      </div>

      {/* Formulário Principal */}
      <Card className="w-full">
        <form onSubmit={handleCreateRoom} className="space-y-4">
          <div>
            <label className="block text-sm font-black text-cartoon-dark mb-1" htmlFor="nickname">
              Seu Apelido
            </label>
            <input
              id="nickname"
              type="text"
              value={nickInput}
              onChange={(e) => {
                setNickInput(e.target.value);
                if (nickError && e.target.value.trim().length >= 2) setNickError(null);
              }}
              placeholder="Ex: Cristiano, Bia..."
              maxLength={16}
              className="input-cartoon"
              required
            />
            {nickError && (
              <p
                role="alert"
                className="mt-1.5 flex items-center gap-1 text-xs font-bold text-cartoon-coral"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{nickError}</span>
              </p>
            )}
          </div>

          <AvatarPicker value={avatar} onChange={setAvatar} />

          <div className="space-y-3 pt-2">
            <Button
              type="submit"
              variant="mint"
              size="lg"
              className="w-full flex items-center justify-center gap-2"
              disabled={isCreating}
            >
              <Users className="w-6 h-6" />
              <span>{isCreating ? 'Criando Sala...' : 'Criar Nova Sala'}</span>
            </Button>

            <Button
              type="button"
              variant="sky"
              size="lg"
              className="w-full flex items-center justify-center gap-2"
              onClick={handleOpenJoin}
            >
              <KeyRound className="w-6 h-6" />
              <span>Entrar com Código</span>
            </Button>
          </div>
        </form>
      </Card>

      {/* Como Jogar */}
      <details className="w-full mt-4 group">
        <summary className="list-none cursor-pointer flex items-center justify-between px-4 py-3 bg-white rounded-2xl border-3 border-cartoon-dark shadow-cartoon font-black text-cartoon-dark text-sm select-none hover:bg-gray-50 active:translate-y-0.5 active:shadow-none transition-all [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2">
            <Info className="w-4 h-4 text-cartoon-sky" />
            <span>Como Jogar?</span>
          </span>
          <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-2 p-4 bg-white rounded-2xl border-3 border-cartoon-dark shadow-cartoon text-left space-y-2.5 text-sm font-bold text-cartoon-dark/80 animate-fade-in">
          <p>
            🎲 <b>1.</b> O jogo sorteia quem escolhe a <b>letra inicial</b> da partida.
          </p>
          <p>
            🔗 <b>2.</b> A próxima palavra precisa começar com a <b>última letra</b> (ou as{' '}
            <b>duas últimas letras</b>) da palavra anterior — você escolhe!
          </p>
          <p>
            ❤️ <b>3.</b> Se o tempo do seu turno acabar, você perde uma vida.
          </p>
          <p>
            🏆 <b>4.</b> Quem ficar por último com vidas vence a partida!
          </p>
        </div>
      </details>

      {/* Rodapé explicativo */}
      <div className="mt-6 text-center text-xs text-cartoon-dark/70 font-bold space-y-1">
        <p>📱 Jogue no celular ou computador • ⚡ Sem cadastro, 100% gratuito</p>
      </div>
    </div>
  );
};
