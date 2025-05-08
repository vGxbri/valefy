'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Skin, getWeaponSkins } from '@/lib/valorantApi';
import { Pagination } from '@heroui/pagination';
import { Plus, X } from 'lucide-react';
import BundleModal from '@/components/BundleModal';
import { RiSearch2Line } from 'react-icons/ri';

interface Theme {
  uuid: string;
  displayName: string;
  displayIcon?: string;
}

interface Bundle {
  uuid: string;
  displayName: string;
  displayIcon: string;
}

interface BundleSkin {
  skinName: string;
  bundleName: string;
  skinIcon: string;
  bundleIcon?: string;
  themeUuid?: string;
  bundleUuid?: string;
}

export default function Page() {
  const [bundleSkins, setBundleSkins] = useState<BundleSkin[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedBundle, setSelectedBundle] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const bundlesPerPage = 12;

  // Resetear la página cuando cambia el término de búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const skins = await getWeaponSkins();
        const bundlesResponse = await fetch('https://valorant-api.com/v1/bundles');
        const bundlesData = await bundlesResponse.json();
        const bundles: Bundle[] = bundlesData.data;

        const bundleMap = new Map<string, Bundle>();
        bundles.forEach(bundle => {
          bundleMap.set(bundle.displayName.toLowerCase(), bundle);
        });

        const bundleSkinsData: BundleSkin[] = skins
          .filter(skin => skin.themeUuid)
          .map(skin => {
            const bundleName = skin.displayName.split(' ')[0];
            const bundle = bundleMap.get(bundleName.toLowerCase());
            return {
              skinName: skin.displayName,
              bundleName: bundleName,
              skinIcon: skin.displayIcon || '',
              bundleIcon: bundle?.displayIcon || '',
              themeUuid: skin.themeUuid || '',
              bundleUuid: bundle?.uuid || ''
            };
          });

        bundleSkinsData.sort((a, b) => a.bundleName.localeCompare(b.bundleName));
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

  const bundleGroups = bundleSkins.reduce((groups, item) => {
    const group = groups[item.bundleName] || [];
    group.push(item);
    groups[item.bundleName] = group;
    return groups;
  }, {} as Record<string, BundleSkin[]>);

  const filteredBundleGroups = Object.entries(bundleGroups)
    .filter(([bundleName, skins]) => 
      bundleName.toLowerCase().includes(searchTerm.toLowerCase()) && 
      // Filtrar solo bundles que tienen imagen de portada
      skins[0].bundleIcon
    );

  const totalBundles = filteredBundleGroups.length;
  const totalPages = Math.ceil(totalBundles / bundlesPerPage);
  const paginatedBundles = filteredBundleGroups.slice(
    (currentPage - 1) * bundlesPerPage,
    currentPage * bundlesPerPage
  );

  return (
    <div className="flex flex-col gap-8 pl-16 md:pr-12 lg:pr-16 pt-12 pb-12 min-h-screen bg-background w-full max-w-full flex-1">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white font-[Raleway] font-semibold italic tracking-widest">/ CATÁLOGO DE BUNDLES</h1>
          
          {/* SECCIÓN DEL BUSCADOR MODIFICADA */}
          {!loading && !error && (
            <div className="relative w-64 group"> {/* Contenedor para 'group' y ancho */}
              {/* Este div es ahora el contenedor Flex y lleva los estilos del input */}
              <div className="relative flex items-center rounded-xl border-2 border-input bg-background/50 backdrop-blur-sm text-sm focus-within:outline-none focus-within:border-primary focus-within:ring-0 transition-all duration-300">
                
                {/* Contenedor del icono de lupa (elemento Flex) */}
                <span className="pl-3 pr-2 flex items-center pointer-events-none">
                  {/* pl-3: padding izquierdo para el icono dentro del "input" */}
                  {/* pr-2: espacio entre el icono y el texto del input */}
                  <RiSearch2Line className="w-5 h-5 text-white/50 group-focus-within:text-primary transition-colors duration-300" />
                </span>

                {/* Campo de Input (elemento Flex que crece) */}
                <input
                  type="text"
                  placeholder="Buscar bundles..."
                  className="flex-1 py-2.5 bg-transparent appearance-none focus:outline-none text-white placeholder:text-muted-foreground/70 pr-10"
                  // flex-1: permite que el input ocupe el espacio disponible
                  // bg-transparent: el fondo lo provee el div padre
                  // pr-10: espacio para el botón de limpiar (X) que es absoluto
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />

                {/* Botón para limpiar búsqueda (sigue siendo absoluto) */}
                {searchTerm && (
                  <button 
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                    onClick={() => setSearchTerm('')}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )}
          {/* FIN DE LA SECCIÓN DEL BUSCADOR MODIFICADA */}
        </div>
 
        {/* ... (resto de tu JSX: loading, error, grid de bundles, paginación, modal) ... */}
        {loading ? (
          <div className="flex flex-col justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
          </div>
        ) : error ? (
          <div className="text-red-500 text-center p-4">{error}</div>
        ) : filteredBundleGroups.length === 0 ? (
          <div className="text-center p-8 bg-card rounded-lg">
            <p className="text-lg text-muted-foreground">
              No se encontraron bundles que coincidan con &quot;{searchTerm}&quot;
            </p>
            <button 
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              onClick={() => setSearchTerm('')}
            >
              Mostrar todos los bundles
            </button>
          </div>
        ) : (
          <>
            {/* ... (tu grid y paginación) ... */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedBundles.map(([bundleName, skins]) => (
                <button
                  key={bundleName}
                  type="button"
                  className="group relative flex flex-col overflow-hidden rounded-xl border border-gray-800 bg-gradient-to-b from-gray-900 to-black hover:shadow-[0px_2px_46px_-4px_rgba(255,_255,_255,_0.15)] transition-all duration-300 cursor-pointer"
                  onClick={() => {
                    setSelectedBundle(bundleName);
                    setModalOpen(true);
                  }}
                >
                  <div className="relative h-64 w-full overflow-hidden">
                    {skins[0].bundleIcon && (
                      <Image
                        src={skins[0].bundleIcon}
                        alt={bundleName}
                        fill
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        priority
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-70 group-hover:opacity-60 transition-opacity" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-xl font-bold text-white mb-1">{bundleName}</h3>
                    <p className="text-sm text-gray-300">{skins.length} skins</p>
                  </div>
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 bg-primary/90 rounded-full hover:bg-primary transition-colors shadow-lg">
                      <Plus className="w-5 h-5 text-white" />
                    </button>
                  </div>
                </button>
              ))}
            </div>
  
            {totalPages > 1 && (
              <div className="flex justify-center mt-4">
                <Pagination 
                  showControls 
                  initialPage={currentPage} 
                  total={totalPages} 
                  onChange={(page) => setCurrentPage(page)}
                />
              </div>
            )}
  
            {selectedBundle && (
              <BundleModal
                isOpen={modalOpen}
                onClose={() => {
                  setModalOpen(false);
                  setTimeout(() => setSelectedBundle(null), 300);
                }}
                bundleName={selectedBundle}
                skins={bundleGroups[selectedBundle] || []}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}