import Link from 'next/link';
import { getActiveModules } from '@/config/modules';

export default function HomePage() {
  const activeModules = getActiveModules();

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Introductie */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <h1 className="text-3xl font-extrabold text-slate-950 mb-2">Welkom bij DIKIS</h1>
        <p className="text-slate-600 max-w-3xl">
          Het Digitaal Kennis- en InformatieSysteem voor het flexibel registreren, 
          typeren en meten van uiteenlopende objecten en parameters.
        </p>
      </div>

      {/* Dashboard Grid (Snelkoppelingen naar modules) */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-4">Direct aan de slag</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeModules.map((module) => (
            <Link 
              key={module.id} 
              href={module.path}
              className="block p-5 bg-white rounded-lg border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all group"
            >
              <h3 className="font-semibold text-lg text-slate-900 group-hover:text-blue-600 transition-colors">
                {module.title}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Open de module voor {module.title.toLowerCase()}.
              </p>
              <span className="text-xs text-blue-500 font-medium inline-block mt-4 group-hover:translate-x-1 transition-transform">
                Openen &rarr;
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}