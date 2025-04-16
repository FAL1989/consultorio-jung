import axios, { AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';

// Configuração robusta com retries e timeout estendido
export const apiClient = axios.create({
  timeout: 10000, // 10s
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
      // Retry logic com backoff exponencial
      if (!config || config.__retryCount >= 3) {
        return Promise.reject(new Error('Erro na comunicação com o servidor após múltiplas tentativas'));
      }
      
      config.__retryCount = config.__retryCount || 0;
      config.__retryCount += 1;
      
      // Delay exponencial: 1s, 2s, 4s
      const delay = 1000 * Math.pow(2, config.__retryCount - 1);
      
      return new Promise(resolve => setTimeout(() => resolve(apiClient(config)), delay));
    }
    
    return Promise.reject(error);
  }
); 