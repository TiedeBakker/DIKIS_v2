// src/app/modules/[modulenaam]/page.tsx
// Dit is de tijdelijke basispagina voor de modules om 404-fouten te voorkomen.

export default function ModuleBasePage() {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 animate-fade-in">
      <div className="flex items-center space-x-3 mb-4">
        <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
        <span className="text-xs font-semibold tracking-wider text-blue-600 uppercase">
          DIKIS Module onder constructie
        </span>
      </div>
      
      <h1 className="text-2xl font-bold text-slate-900 mb-2">
        Module in voorbereiding
      </h1>
      
      <p className="text-slate-600 max-w-xl text-sm leading-relaxed">
        Deze pagina is succesvol gerenderd via het hoofdmenu. De databasekoppeling 
        met Turso en de specifieke invoerschermen worden in de volgende stap aan deze route gekoppeld.
      </p>

      <div className="mt-6 pt-6 border-t border-slate-100 flex space-x-4">
        <div className="h-8 w-24 bg-slate-100 rounded animate-pulse" />
        <div className="h-8 w-32 bg-slate-100 rounded animate-pulse" />
      </div>
    </div>
  );
}