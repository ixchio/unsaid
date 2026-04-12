import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { DM_Serif_Display, Inter } from 'next/font/google';
import './globals.css';

const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-serif',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "unsaid — say the thing you didn\u0027t",
  description:
    'anonymous. honest. gone in 48 hours. no profile. no history. just the truth.',
  openGraph: {
    title: 'unsaid',
    description: 'say the thing you didn\'t.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${dmSerif.variable} ${inter.variable}`}>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
