import type { Metadata } from 'next';
import './App.css';
import FloatingChatbot from './components/ClientChatbot';

export const metadata: Metadata = {
  title: 'Lim Jun Hao',
  description: 'Welcome to Lim Jun Hao\'s portfolio site',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        {children}
        <FloatingChatbot />
      </body>
    </html>
  );
}