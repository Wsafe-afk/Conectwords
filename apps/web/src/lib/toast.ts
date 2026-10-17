import { create } from 'zustand';

export type ToastKind = 'error' | 'success' | 'info';

export interface ToastItem {
  id: string;
  kind: ToastKind;
  message: string;
}

interface ToastState {
  toasts: ToastItem[];
  dismiss: (id: string) => void;
}

const AUTO_DISMISS_MS = 4200;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

function pushToast(kind: ToastKind, message: string): void {
  const id = Math.random().toString(36).slice(2, 9);
  const { toasts } = useToastStore.getState();
  const last = toasts[toasts.length - 1];

  // Evita duplicatas consecutivas idênticas (ex.: duplo clique no botão)
  if (last && last.kind === kind && last.message === message) return;

  useToastStore.setState({ toasts: [...toasts.slice(-2), { id, kind, message }] });
  setTimeout(() => useToastStore.getState().dismiss(id), AUTO_DISMISS_MS);
}

/**
 * Avisos rápidos no estilo cartoon — substituem os alert() nativos.
 */
export const toast = {
  error: (message: string) => pushToast('error', message),
  success: (message: string) => pushToast('success', message),
  info: (message: string) => pushToast('info', message),
};
