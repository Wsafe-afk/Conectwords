import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button.js';
import { Card } from '../components/Card.js';
import { useRoomStore } from '../store/roomStore.js';
import { apiRequest } from '../lib/api.js';
import { X, ArrowRight } from 'lucide-react';
import { ROOM_CODE_LENGTH } from '@conecta/shared';

interface JoinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JoinModal: React.FC<JoinModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { nickname, setSession, setError } = useRoomStore();
  const [codeDigits, setCodeDigits] = useState<string[]>(Array(ROOM_CODE_LENGTH).fill(''));
  const [isJoining, setIsJoining] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Sempre limpa o formulário ao abrir o modal (evita código antigo/parcial)
  useEffect(() => {
    if (isOpen) {
      setCodeDigits(Array(ROOM_CODE_LENGTH).fill(''));
      setIsJoining(false);
      inputRefs.current[0]?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDigitChange = (index: number, value: string) => {
    const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const newDigits = [...codeDigits];
    if (!clean) {
      newDigits[index] = '';
      setCodeDigits(newDigits);
      return;
    }
    // Suporta autofill/colagem que insira vários caracteres de uma vez
    for (let i = 0; i < clean.length && index + i < ROOM_CODE_LENGTH; i++) {
      newDigits[index + i] = clean[i];
    }
    setCodeDigits(newDigits);
    const nextIndex = Math.min(index + clean.length, ROOM_CODE_LENGTH - 1);
    inputRefs.current[nextIndex]?.focus();
  };

  // Colar o código completo (ex.: "K7M2P") em qualquer caixinha
  const handlePaste = (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!pasted) return;
    e.preventDefault();
    const newDigits = [...codeDigits];
    for (let i = 0; i < pasted.length && index + i < ROOM_CODE_LENGTH; i++) {
      newDigits[index + i] = pasted[i];
    }
    setCodeDigits(newDigits);
    const nextIndex = Math.min(index + pasted.length, ROOM_CODE_LENGTH - 1);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !codeDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = codeDigits.join('').trim().toUpperCase();
    if (fullCode.length !== ROOM_CODE_LENGTH) {
      alert(`O código da sala deve ter ${ROOM_CODE_LENGTH} caracteres.`);
      return;
    }

    if (!nickname) {
      alert('Apelido não configurado.');
      return;
    }

    setIsJoining(true);
    try {
      const data = await apiRequest(`/api/rooms/${fullCode}/join`, {
        method: 'POST',
        body: JSON.stringify({ nickname }),
      });

      setSession(data.sessionToken, data.playerId, data.code, data.room.players.find((p: any) => p.id === data.playerId)?.nickname || nickname);
      onClose();
      navigate(`/room/${data.code}`);
    } catch (err: any) {
      alert(err.message || 'Erro ao entrar na sala.');
      setError(err.message);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <Card className="w-full max-w-sm relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 border-2 border-cartoon-dark cursor-pointer"
        >
          <X className="w-5 h-5 text-cartoon-dark" />
        </button>

        <h2 className="text-2xl font-black text-cartoon-dark text-center mb-1">
          Código da Sala
        </h2>
        <p className="text-center text-xs font-bold text-cartoon-dark/60 mb-5">
          Digite o código de 5 letras fornecido pelo criador da sala:
        </p>

        <form onSubmit={handleJoin} className="space-y-5">
          <div className="flex justify-center gap-2">
            {codeDigits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputRefs.current[idx] = el)}
                type="text"
                value={digit}
                maxLength={1}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onPaste={(e) => handlePaste(idx, e)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-12 h-14 text-center text-2xl font-black uppercase rounded-2xl border-3 border-cartoon-dark shadow-cartoon outline-none focus:border-cartoon-sky focus:ring-2 focus:ring-cartoon-sky/20 transition-all bg-white"
                autoFocus={idx === 0}
              />
            ))}
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
