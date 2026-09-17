import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: {
    default: 'Cuisinons',
    template: '%s · Cuisinons',
  },
  applicationName: 'Cuisinons',
  description: 'Recettes, planning et nutrition — privé, pour deux.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-dvh antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
