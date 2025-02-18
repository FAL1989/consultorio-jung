import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useTheme } from '@/lib/hooks/useTheme';

export function ThemeToggle(): JSX.Element {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg text-gray-600 hover:text-amber-500 hover:bg-amber-50 dark:text-gray-300 dark:hover:text-amber-400 dark:hover:bg-gray-800 transition-colors"
      title={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
    >
      {theme === 'dark' ? (
        <SunIcon className="h-5 w-5" />
      ) : (
        <MoonIcon className="h-5 w-5" />
      )}
    </button>
  );
} 