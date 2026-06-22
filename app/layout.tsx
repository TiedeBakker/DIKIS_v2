import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'DIKIS - Digitaal Kennis- en InformatieSysteem',
  description: 'Flexibele object- en parameterregistratie',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body className="bg-slate-50 text-slate-900 min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
        <footer className="bg-slate-100 text-center py-4 text-xs text-slate-500 border-t">
          DIKIS © {new Date().getFullYear()}
        </footer>
      </body>
    </html>
  );
}