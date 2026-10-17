import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button.js';
import { Card } from '../components/Card.js';
import { useRoomStore } from '../store/roomStore.js';
import { apiRequest } from '../lib/api.js';
import { Volume2, VolumeX, Sparkles, Users, KeyRound } from 'lucide-react';
import { sound } from '../fx/sound.js';

interface HomeProps {
  onOpenJoinModal: () => void;
}

export const Home: React.FC<HomeProps> = ({ onOpenJoinModal }) => {
  const navigate = useNavigate();
  const { nickname, setSession, setError } = useRoomStore();
  const [nickInput, setNickInput] = useState(nickname || '');
  const [isCreating, setIsCreating] = useState(false);
  const [muted, setMuted] = useState(sound.isMuted());

  const handleToggleSound = () => {
    const isNowMuted = sound.toggleMute();
    setMuted(isNowMuted);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNick = nickInput.trim();
    if (cleanNick.length < 2) {
      alert('Por favor, informe um apelido com pelo menos 2 caracteres.');
      return;
    }

    setIsCreating(true);
    try {
      const data = await apiRequest('/api/rooms', {
        method: 'POST',
        body: JSON.stringify({ nickname: cleanNick }),
      });

      setSession(data.sessionToken, data.playerId, data.code, cleanNick);
      navigate(`/room/${data.code}`);
    } catch (err: any) {
      alert(err.message || 'Erro ao conectar ao servidor.');
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 max-w-md mx-auto">
      {/* Botão de Som no topo */}
      <div className="w-full flex justify-end mb-4">
        <button
          type="button"
          onClick={handleToggleSound}
          className="p-3 bg-white rounded-2xl border-3 border-cartoon-dark shadow-cartoon hover:bg-gray-50 active:translate-y-0.5 transition-all cursor-pointer"
          title={muted ? 'Ativar som' : 'Desativar som'}
        >
          {muted ? (
            <VolumeX className="w-5 h-5 text-red-500" />
          ) : (
            <Volume2 className="w-5 h-5 text-cartoon-dark" />
          )}
        </button>
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
            <label className="block text-sm font-black text-cartoon-dark mb-1">
              Seu Apelido
            </label>
            <input
              type="text"
              value={nickInput}
              onChange={(e) => setNickInput(e.target.value)}
              placeholder="Ex: Cristiano, Bia..."
              maxLength={16}
              className="input-cartoon"
              required
            />
          </div>

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
              onClick={() => {
                if (nickInput.trim().length < 2) {
                  alert('Por favor, digite seu apelido primeiro.');
                  return;
                }
                onOpenJoinModal();
              }}
            >
              <KeyRound className="w-6 h-6" />
              <span>Entrar com Código</span>
            </Button>
          </div>
        </form>
      </Card>

      {/* Rodapé explicativo */}
      <div className="mt-6 text-center text-xs text-cartoon-dark/60 font-bold space-y-1">
        <p>📱 Jogue no celular ou computador • ⚡ Sem cadastro, 100% gratuito</p>
      </div>
    </div>
  );
};
