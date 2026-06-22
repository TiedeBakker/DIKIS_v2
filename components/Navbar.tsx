// src/components/Navbar.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getActiveModules } from '@/config/modules';
import { Menu, X, Home } from 'lucide-react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const activeModules = getActiveModules();

  const toggleMenu = () => setIsOpen(!isOpen);

  // Helper om te kijken of een menu-item actief is
  const checkActive = (path: string, isHome?: boolean) => {
    if (isHome) return pathname === path;
    return pathname.startsWith(path);
  };

  return (
    <nav className="bg-slate-900 text-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="text-xl font-bold tracking-wider text-blue-400 hover:text-blue-300 transition-colors">
              DIKIS
            </Link>
          </div>

          {/* Desktop Menu (Inclusief Startpagina-knop) */}
          <div className="hidden md:flex space-x-2">
            {activeModules.map((module) => {
              const isActive = checkActive(module.path, module.isHome);
              return (
                <Link
                  key={module.id}
                  href={module.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {module.isHome && <Home className="h-4 w-4" />}
                  {module.title}
                </Link>
              );
            })}
          </div>

          {/* Hamburger Button (Mobile/Tablet portrait) */}
          <div className="md:hidden flex items-center">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
              aria-label="Hoofdmenu"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="md:hidden bg-slate-800 border-t border-slate-700 px-2 pt-2 pb-3 space-y-1 sm:px-3 animate-fade-in">
          {activeModules.map((module) => {
            const isActive = checkActive(module.path, module.isHome);
            return (
              <Link
                key={module.id}
                href={module.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium ${
                  isActive 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {module.isHome && <Home className="h-5 w-5" />}
                {module.title}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}