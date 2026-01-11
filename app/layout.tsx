import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Star Trek Voyager Sim',
  description: 'A 3D simulation of USS Voyager intristellar travel',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
