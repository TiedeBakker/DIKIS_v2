// src/config/modules.ts

export interface Module {
  id: string;
  title: string;
  path: string;
  enabled: boolean;
  isHome?: boolean; // Extra vlag voor de startpagina
}

export const modulesConfig: Module[] = [
  {
    id: 'home',
    title: 'Startpagina',
    path: '/',
    enabled: true,
    isHome: true,
  },
  {
    id: 'basistabellen',
    title: 'Beheer Basistabellen',
    path: '/modules/basistabellen',
    enabled: true,
  },
  {
    id: 'vaste-sets',
    title: 'Vaste Parameter-sets',
    path: '/modules/vaste-sets',
    enabled: true,
  },
  {
    id: 'flexibele-invoer',
    title: 'Flexibele Invoer',
    path: '/modules/flexibele-invoer',
    enabled: true,
  },
  {
    id: 'locatie-waarnemingen',
    title: 'Locatie Waarnemingen',
    path: '/modules/locatie-waarnemingen',
    enabled: true,
  },
  {
    id: 'notities',
    title: 'Losse Notities',
    path: '/modules/notities',
    enabled: true,
  },
];

export const getActiveModules = () => modulesConfig.filter(m => m.enabled);