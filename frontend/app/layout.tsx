import type { Metadata } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';
import './globals.css';

const playfair = Playfair_Display({ subsets: ['latin'] });
const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Diálogos Junguianos',
  description: 'Um espaço seguro para autoconhecimento e desenvolvimento pessoal',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} ${playfair.className}`}>
        {children}
      </body>
    </html>
  );
} 