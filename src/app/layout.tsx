import type { Metadata } from 'next';
import { PT_Sans } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: 'Colegio San Francisco Javier',
  description: 'Intranet para el Colegio San Francisco Javier',
};

const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://www.googleapis.com" />
        <link rel="dns-prefetch" href="https://www.googleapis.com" />
        <link rel="preconnect" href="https://colegio-sf.firebaseapp.com" />
        <link rel="dns-prefetch" href="https://colegio-sf.firebaseapp.com" />
      </head>
      <body className={`${ptSans.className} antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
