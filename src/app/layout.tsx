import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'US Equity Breakout Scanner',
  description: 'Real-time scanner for short-term upside breakouts in US stocks',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
