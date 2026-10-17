export const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

/**
 * Utilitário de requisição segura para a API do Conecta Palavras
 */
export async function apiRequest<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });
  } catch (err: any) {
    throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão com a internet.');
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (!res.ok) {
      const error: any = new Error(
        res.status === 404
          ? 'Servidor backend não encontrado (404). Verifique se o backend está rodando e se a URL da API está configurada.'
          : `O servidor retornou erro (${res.status}) sem resposta JSON.`
      );
      error.status = res.status;
      throw error;
    }
    throw new Error('O servidor retornou uma resposta inválida (esperava JSON).');
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new Error('Erro ao ler dados da resposta do servidor.');
  }

  if (!res.ok) {
    const error: any = new Error(data.error?.message || 'Ocorreu um erro no servidor.');
    error.status = res.status;
    error.code = data.error?.code;
    throw error;
  }

  return data as T;
}
