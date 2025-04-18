import axios, { AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';

// Configuração robusta com retries e timeout estendido
export const apiClient = axios.create({
  timeout: 60000, // 60s (Increased from 10s)
  headers: {
    'Content-Type': 'application/json',
  }
});

interface RetryConfig extends InternalAxiosRequestConfig {
  __retryCount?: number;
}

// Adicionar interceptors
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    // Se for erro de rede ou timeout
    if (error.code === 'ECONNABORTED' || !error.response) {
      const config = error.config as RetryConfig;

      // Verifica se config existe e acessa __retryCount com segurança, default 0
      // Adiciona chaves {} ao redor do bloco if
      if (!config || (config?.__retryCount ?? 0) >= 3) {
        return Promise.reject(new Error('Erro na comunicação com o servidor após múltiplas tentativas'));
      } // Fecha a chave do if aqui

      // O resto do código pertence ao bloco 'else' implícito do if acima ou deve
      // ser executado se a condição do if for falsa.

      // Garante que config não seja nulo/undefined antes de prosseguir
      if (!config) {
         // Pode acontecer se o erro original não tiver config
         return Promise.reject(error);
      }

      config.__retryCount = config?.__retryCount ?? 0; // Use ?? 0 para segurança
      config.__retryCount += 1;

      // Delay exponencial: 1s, 2s, 4s
      const delay = 1000 * Math.pow(2, config.__retryCount - 1);

      // Garante que config é passado corretamente para a nova chamada
      // Precisamos garantir que config não é undefined aqui também
      return new Promise(resolve => setTimeout(() => resolve(apiClient(config as InternalAxiosRequestConfig)), delay));
    }

    // Se não for erro de rede/timeout, rejeita imediatamente
    return Promise.reject(error);
  }
); 