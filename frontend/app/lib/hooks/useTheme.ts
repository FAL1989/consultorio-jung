import { useState, useEffect } from 'react';

export function useTheme(): { theme: string; toggleTheme: () => void } {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    // Verifica se há um tema salvo no localStorage
    const savedTheme = localStorage.getItem('theme');
    // Verifica a preferência do sistema
    const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    
    // Define o tema inicial
    const initialTheme = savedTheme || systemPreference;
    setTheme(initialTheme);
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');
  }, []);

  const toggleTheme = (): void => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark');
  };

  return { theme, toggleTheme };
} 