import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ModelBench · Local AI model playground',
  description: 'A local AI testing playground for OpenRouter free models.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en-US"><body>{children}</body></html>;
}
