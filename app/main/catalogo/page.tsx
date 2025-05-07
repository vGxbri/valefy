'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Skin, getWeaponSkins } from '@/lib/valorantApi';

interface Theme {
  uuid: string;
  displayName: string;
  displayIcon?: string;
}

interface BundleSkin {
  skinName: string;
  bundleName: string;
  skinIcon: string;
  bundleIcon?: string;
  themeUuid?: string;
}

export default function Page() {
  const [bundleSkins, setBundleSkins] = useState<BundleSkin[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedBundle, setSelectedBundle] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Obtener las skins de armas usando la función existente
        const skins = await getWeaponSkins();
        
        // Obtener los temas (bundles)
        const themesResponse = await fetch('https://valorant-api.com/v1/themes');
        const themesData = await themesResponse.json();
        const themes: Theme[] = themesData.data;

        // Crear un mapa de temas para búsqueda más eficiente
        const themeMap = new Map<string, Theme>();
        themes.forEach(theme => {
          themeMap.set(theme.uuid, theme);
        });

        // Cruzar los datos para obtener las skins con sus bundles correspondientes
        const bundleSkinsData: BundleSkin[] = skins
          .filter(skin => skin.themeUuid) // Filtrar skins sin themeUuid
          .map(skin => {
            // Usar operador de coalescencia nula para manejar el caso donde themeUuid es undefined
            const theme = skin.themeUuid ? themeMap.get(skin.themeUuid) : undefined;
            return {
              skinName: skin.displayName,
              bundleName: theme ? theme.displayName : 'Bundle Desconocido',
              skinIcon: skin.displayIcon || '',
              bundleIcon: theme?.displayIcon || '',
              themeUuid: skin.themeUuid || ''
            };
          });

        // Agrupar por bundle para evitar duplicados
        const uniqueBundles = Array.from(new Set(bundleSkinsData.map(item => item.bundleName)));
        
        setBundleSkins(bundleSkinsData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Error al cargar los datos. Por favor, intenta de nuevo más tarde.');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Agrupar skins por bundle
  const bundleGroups = bundleSkins.reduce((groups, item) => {
    const group = groups[item.bundleName] || [];
    group.push(item);
    groups[item.bundleName] = group;
    return groups;
  }, {} as Record<string, BundleSkin[]>);

  // Filtrar bundles según el término de búsqueda
  const filteredBundleGroups = Object.entries(bundleGroups)
    .filter(([bundleName]) => 
      bundleName.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => a[0].localeCompare(b[0]));

  // Mostrar detalles de un bundle específico o la lista de bundles
  const renderContent = () => {
    if (selectedBundle) {
      const skins = bundleGroups[selectedBundle] || [];
      return (
        <div className="w-full">
          <button 
            onClick={() => setSelectedBundle(null)}
            className="mb-4 flex items-center text-primary hover:text-primary/80 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver a todos los bundles
          </button>
          
          <div className="bg-card rounded-lg shadow-lg overflow-hidden">
            <div className="p-6 bg-primary/10">
              <h2 className="text-2xl font-bold text-primary">{selectedBundle}</h2>
              <p className="text-sm text-muted-foreground mt-1">{skins.length} skins en este bundle</p>
            </div>
            
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {skins.map((skin, index) => (
                <div key={index} className="flex flex-col items-center bg-card/50 rounded-lg p-4 hover:bg-card/80 transition-colors">
                  {skin.skinIcon ? (
                    <div className="relative h-32 w-full mb-3">
                      <Image 
                        src={skin.skinIcon} 
                        alt={skin.skinName}
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="h-32 w-full bg-muted flex items-center justify-center mb-3">
                      <span className="text-sm text-muted-foreground">Sin imagen</span>
                    </div>
                  )}
                  <span className="text-sm font-medium text-center w-full">{skin.skinName}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBundleGroups.map(([bundleName, skins]) => (
          <div 
            key={bundleName} 
            className="bg-card rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 cursor-pointer"
            onClick={() => setSelectedBundle(bundleName)}
          >
            <div className="p-4 bg-primary/10">
              <h2 className="text-xl font-semibold text-primary">{bundleName}</h2>
              <p className="text-sm text-muted-foreground">{skins.length} skins</p>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              {skins.slice(0, 4).map((skin, index) => (
                <div key={index} className="flex flex-col items-center">
                  {skin.skinIcon ? (
                    <div className="relative h-24 w-full mb-2">
                      <Image 
                        src={skin.skinIcon} 
                        alt={skin.skinName}
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="h-24 w-full bg-muted flex items-center justify-center mb-2">
                      <span className="text-xs text-muted-foreground">Sin imagen</span>
                    </div>
                  )}
                  <span className="text-xs text-center truncate w-full">{skin.skinName}</span>
                </div>
              ))}
            </div>
            {skins.length > 4 && (
              <div className="px-4 pb-4 text-center">
                <span className="text-xs text-muted-foreground">+{skins.length - 4} más</span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-8 pl-16 md:pr-12 lg:pr-16 pt-12 pb-12 min-h-screen bg-background w-full max-w-full flex-1">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-primary">Catálogo de Bundles de Valorant</h1>
        
        {!loading && !error && (
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Buscar bundles..."
              className="w-full px-4 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setSearchTerm('')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
      
      {loading ? (
        <div className="flex flex-col justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Cargando bundles de Valorant...</p>
        </div>
      ) : error ? (
        <div className="text-red-500 text-center p-4">{error}</div>
      ) : filteredBundleGroups.length === 0 ? (
        <div className="text-center p-8 bg-card rounded-lg">
          <p className="text-lg text-muted-foreground">No se encontraron bundles que coincidan con "{searchTerm}"</p>
          <button 
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            onClick={() => setSearchTerm('')}
          >
            Mostrar todos los bundles
          </button>
        </div>
      ) : (
        renderContent()
      )}
    </div>
  );
}
