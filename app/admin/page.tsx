"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getWeaponSkins, filterSkinsByBundleWithIcon } from "@/lib/valorantApi";
import { formatSkinForApp } from "@/lib/skinUtils";
import { Skin, getTierData, extraerTipoCaja } from "@/lib/boxUtils";

// Singleton para el cliente de Supabase
let supabaseClient: ReturnType<typeof createClient> | null = null;

const getSupabaseClient = () => {
  if (typeof window === "undefined") return null;

  if (!supabaseClient) {
    supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }

  return supabaseClient;
};

// Interfaz para la caja
interface Caja {
  id?: string;
  nombre: string;
  precio: number;
  imagen_url: string;
  esta_disponible: boolean;
  es_diaria: boolean;
  ruta?: string; // Ruta normalizada para acceder a la caja
  categoria?: string;
}

// Interfaz para las probabilidades de tiers
interface TierProbabilidad {
  id?: string;
  caja_id: string;
  content_tier_id: string;
  probabilidad: number;
  cantidad_skins: number;
  content_tier?: {
    id: string;
    nombre: string;
    color: string;
    uuid: string;
  };
}

// Interfaz para Bundle
interface Bundle {
  uuid: string;
  displayName: string;
  displayIcon: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estado para cajas
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [nuevaCaja, setNuevaCaja] = useState<Caja>({
    nombre: "",
    precio: 250,
    imagen_url: "/free_cage.png",
    esta_disponible: true,
    es_diaria: false,
  });
  const [selectedCaja, setSelectedCaja] = useState<string | null>(null);

  // Estado para tiers y probabilidades
  const [tiers, setTiers] = useState<any[]>([]);
  const [probabilidades, setProbabilidades] = useState<TierProbabilidad[]>([]);

  // Estado para bundles y skins agrupadas
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [skinsByBundle, setSkinsByBundle] = useState<Record<string, Skin[]>>(
    {},
  );
  const [selectedSkins, setSelectedSkins] = useState<Skin[]>([]);
  const [expandedBundles, setExpandedBundles] = useState<string[]>([]);
  const [isLoadingBundles, setIsLoadingBundles] = useState(false);
  const [loadingBundleUuid, setLoadingBundleUuid] = useState<string | null>(
    null,
  );
  const [searchTerm, setSearchTerm] = useState("");

  // Cargar datos iniciales al montar el componente
  const [pendingSkinLoads, setPendingSkinLoads] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadInitialData();
  }, []);

  // Función para cargar datos iniciales
  const loadInitialData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Verificar que estamos en el cliente
      if (typeof window === "undefined") {
        console.warn("loadInitialData llamado en el servidor");

        return;
      }

      const supabase = getSupabaseClient();

      if (!supabase) {
        throw new Error("No se pudo conectar a la base de datos");
      }

      // 1. Cargar cajas existentes
      const { data: cajasData, error: cajasError } = await supabase
        .from("cajas")
        .select("*");

      if (cajasError) {
        console.error("Error al cargar cajas:", cajasError);
        throw new Error(`Error al cargar cajas: ${cajasError.message}`);
      }

      // Usar type assertion para asegurar que los datos cumplen con la interfaz Caja
      setCajas((cajasData || []) as unknown as Caja[]);

      // 2. Cargar tiers para las probabilidades
      const { data: tiersData, error: tiersError } = await supabase
        .from("content_tiers")
        .select("*")
        .order("id");

      if (tiersError) {
        console.error("Error al cargar tiers:", tiersError);
        throw new Error(`Error al cargar tiers: ${tiersError.message}`);
      }

      setTiers(tiersData || []);

      // 3. Inicializar probabilidades con los tiers
      if (tiersData && tiersData.length > 0) {
        try {
          const initialProbs = tiersData.map((tier) => ({
            caja_id: "",
            content_tier_id: String(tier.id),
            probabilidad: 0,
            cantidad_skins: 0,
            content_tier: {
              id: String(tier.id),
              nombre: String(tier.nombre || "Sin nombre"),
              uuid: String(tier.uuid || ""),
              color: String(tier.color || "#FFFFFF"),
            },
          }));

          setProbabilidades(initialProbs as TierProbabilidad[]);
        } catch (mapError) {
          console.error("Error al procesar tiers:", mapError, tiersData);
          throw new Error(
            `Error al procesar tiers: ${mapError instanceof Error ? mapError.message : "Formato inválido"}`,
          );
        }
      } else {
        console.warn("No se encontraron tiers en la base de datos");
      }
    } catch (error) {
      console.error("Error al cargar datos iniciales:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Error desconocido en la carga de datos";

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar la lista de bundles y precargar el conteo de skins
  const loadBundles = async () => {
    setIsLoadingBundles(true);
    try {
      // 1. Cargar todos los bundles
      const bundlesResponse = await fetch(
        "https://valorant-api.com/v1/bundles",
      );
      const bundlesData = await bundlesResponse.json();
      // 2. Precargar todas las skins para tener el conteo
      const allSkins = await getWeaponSkins();
      const filteredSkins = await filterSkinsByBundleWithIcon(allSkins);

      // 3. Agrupar skins por nombre de bundle
      const skinCounts: Record<string, Skin[]> = {};

      // Inicializar el objeto con arrays vacíos para cada bundle
      bundlesData.data.forEach((bundle: Bundle) => {
        skinCounts[bundle.uuid] = [];
      });

      // Agrupar las skins por bundle
      filteredSkins.forEach((skin) => {
        const bundleName = skin.displayName.split(" ")[0].toLowerCase();

        // Buscar el bundle correspondiente
        const matchingBundle = bundlesData.data.find(
          (b: Bundle) => b.displayName.toLowerCase() === bundleName,
        );

        if (matchingBundle) {
          if (!skinCounts[matchingBundle.uuid]) {
            skinCounts[matchingBundle.uuid] = [];
          }
          // Almacenar la skin sin formatear (se formateará al expandir)
          skinCounts[matchingBundle.uuid].push(skin as unknown as Skin);
        }
      });

      // Filtrar bundles que tengan al menos una skin
      const bundlesWithSkins = (bundlesData.data as Bundle[]).filter(
        (bundle) =>
          skinCounts[bundle.uuid] && skinCounts[bundle.uuid].length > 0,
      );

      setBundles(bundlesWithSkins);
      setSkinsByBundle(skinCounts);
    } catch (error: any) {
      console.error("Error al cargar bundles:", error);
      setError("Error al cargar bundles");
    } finally {
      setIsLoadingBundles(false);
    }
  };

  // Cargar las skins detalladas de un bundle específico bajo demanda
  const loadSkinsForBundle = async (bundle: Bundle) => {
    // Si ya tenemos skins formateadas, solo toggleamos la expansión
    const hasFormattedSkins =
      skinsByBundle[bundle.uuid] &&
      skinsByBundle[bundle.uuid].length > 0 &&
      skinsByBundle[bundle.uuid][0].content_tier_id;

    if (hasFormattedSkins) {
      // Toggle expansión (múltiple) pero NO permitir contraer si hay alguna skin seleccionada
      if (expandedBundles.includes(bundle.uuid)) {
        // ¿Hay alguna skin seleccionada de este bundle?
        const selectedInBundle = selectedSkins.some((skin) =>
          (skinsByBundle[bundle.uuid] || []).some(
            (bSkin) => bSkin.id === skin.id,
          ),
        );

        if (!selectedInBundle) {
          setExpandedBundles(
            expandedBundles.filter((id) => id !== bundle.uuid),
          );
        }
        // Si hay alguna seleccionada, NO contraer
      } else {
        setExpandedBundles([...expandedBundles, bundle.uuid]);
      }

      return; // Ya tenemos skins formateadas
    }

    setLoadingBundleUuid(bundle.uuid);
    try {
      // Obtener las skins sin formatear que ya tenemos precargadas
      const bundleSkins = skinsByBundle[bundle.uuid] || [];

      // Formatear las skins para la aplicación
      const supabase = getSupabaseClient();

      if (!supabase) {
        throw new Error("No se pudo conectar a la base de datos");
      }

      // Definir el tipo para los content tiers
      interface ContentTierData {
        id: string;
        uuid: string;
      }

      // Obtener todos los content_tiers disponibles para validación
      const { data: contentTiers, error: contentTiersError } = await supabase
        .from("content_tiers")
        .select("id, uuid")
        .returns<ContentTierData[]>();

      if (contentTiersError) {
        console.error("Error al cargar content_tiers:", contentTiersError);
        throw new Error("Error al cargar content_tiers");
      }

      // Crear un mapa de UUID a ID para validación rápida
      const tierUuidToId: Record<string, string> = {};

      contentTiers?.forEach((tier) => {
        tierUuidToId[tier.uuid] = tier.id;
      });

      const formattedSkins: Skin[] = [];

      for (const skin of bundleSkins) {
        // Si la skin ya está formateada (tiene content_tier_id), usarla directamente
        if ("content_tier_id" in skin) {
          // Verificar que el content_tier_id exista en la base de datos
          const tierExists = contentTiers?.some(
            (tier) => tier.id === skin.content_tier_id,
          );

          if (tierExists) {
            formattedSkins.push(skin as Skin);
          } else {
            console.warn(`Skin con content_tier_id inválido: ${skin.nombre}`);
          }
          continue;
        }

        // Si no está formateada, obtener la información del tier
        // Aquí asumimos que es una skin de la API de Valorant
        const valorantSkin = skin as unknown as {
          contentTierUuid: string;
          displayName: string;
          displayIcon: string;
        };

        // Verificar si el UUID del tier existe en nuestra base de datos
        if (
          valorantSkin.contentTierUuid &&
          tierUuidToId[valorantSkin.contentTierUuid]
        ) {
          const tierData = await getTierData(
            supabase,
            valorantSkin.contentTierUuid,
          );

          if (tierData) {
            const formattedSkin = formatSkinForApp(
              valorantSkin as any,
              tierData,
            );

            // Asegurarse de que el content_tier_id sea el correcto de nuestra base de datos
            formattedSkin.content_tier_id =
              tierUuidToId[valorantSkin.contentTierUuid];
            formattedSkins.push(formattedSkin);
          }
        } else {
          console.warn(
            `Skin con contentTierUuid no encontrado en la base de datos: ${valorantSkin.displayName}`,
          );
        }
      }

      // Guardar en el estado y expandir el bundle
      setSkinsByBundle((prev) => ({ ...prev, [bundle.uuid]: formattedSkins }));

      // Asegurarse de que el bundle se expanda
      if (!expandedBundles.includes(bundle.uuid)) {
        setExpandedBundles([...expandedBundles, bundle.uuid]);
      }
    } catch (error: any) {
      console.error("Error al cargar skins del bundle:", error);
      setError("Error al cargar skins del bundle");
    } finally {
      setLoadingBundleUuid(null);
      setPendingSkinLoads(prev => {
        const next = new Set(prev);
        next.delete(bundle.uuid);
        return next;
      });
    }
  };

  // Cargar bundles al montar el componente
  useEffect(() => {
    loadBundles();
  }, []);

  // useEffect para cargar skins de bundles recién expandidos
  useEffect(() => {
    expandedBundles.forEach(bundleUuid => {
      const bundle = bundles.find(b => b.uuid === bundleUuid);
      if (bundle) {
        const hasFormattedSkins = skinsByBundle[bundle.uuid] && 
                                skinsByBundle[bundle.uuid].length > 0 && 
                                skinsByBundle[bundle.uuid][0].content_tier_id;
        const isAlreadyPending = pendingSkinLoads.has(bundle.uuid);
        const isLoadingThisSpecificBundle = loadingBundleUuid === bundle.uuid; // Para evitar re-llamar si ya se está procesando por un click individual

        if (!hasFormattedSkins && !isAlreadyPending && !isLoadingThisSpecificBundle) {
          setPendingSkinLoads(prev => new Set(prev).add(bundle.uuid));
          loadSkinsForBundle(bundle);
        }
      }
    });
    // Queremos re-evaluar esto si cambia la lista de bundles expandidos o la lista general de bundles (menos frecuente)
    // No incluimos skinsByBundle, pendingSkinLoads, o loadingBundleUuid directamente para evitar bucles si loadSkinsForBundle los modifica y re-dispara este efecto inmediatamente.
    // El control se hace verificando !hasFormattedSkins, !isAlreadyPending y !isLoadingThisSpecificBundle.
  }, [expandedBundles, bundles, loadSkinsForBundle]); // `loadSkinsForBundle` debe estar memoizada con useCallback si no lo está ya.

  // Filtrado solo por nombre
  const filteredBundles = bundles.filter((bundle) =>
    bundle.displayName.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Función para normalizar texto (eliminar tildes y caracteres especiales)
  const normalizarTexto = (texto: string): string => {
    return texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
      .replace(/[^a-zA-Z0-9\s-]/g, "") // Solo permitir letras, números, espacios y guiones
      .trim();
  };

  // Manejar cambios en el formulario de la caja
  const handleCajaChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;

    // Si es el campo nombre, mostrar una advertencia pero no normalizar automáticamente
    // para que el usuario sea consciente del problema
    if (name === "nombre") {
      // Verificar si contiene caracteres especiales o tildes
      const contieneEspeciales =
        /[\u00e1\u00e9\u00ed\u00f3\u00fa\u00c1\u00c9\u00cd\u00d3\u00da\u00f1\u00d1]/.test(
          value,
        );

      // Si contiene caracteres especiales, mostrar una advertencia en la consola
      if (contieneEspeciales) {
        console.warn(
          "El nombre contiene caracteres especiales que podrían causar problemas en las rutas",
        );
      }
    }

    setNuevaCaja((prev) => ({
      ...prev,
      [name]: name === "precio" ? parseFloat(value) || 0 : value,
    }));
  };

  // Manejar cambio en checkbox
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;

    setNuevaCaja((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  // Manejar cambios en probabilidades (solo probabilidad, cantidad_skins se calcula automáticamente)
  const handleProbabilidadChange = (
    tierId: string,
    field: "probabilidad",
    value: number,
  ) => {
    setProbabilidades((prev) =>
      prev.map((prob) =>
        prob.content_tier_id === tierId
          ? { ...prob, probabilidad: value }
          : prob,
      ),
    );
  };

  // Sincronizar automáticamente cantidad_skins según las skins seleccionadas (forzando string en los IDs)
  useEffect(() => {
    setProbabilidades((prev) =>
      prev.map((prob) => ({
        ...prob,
        cantidad_skins: selectedSkins.filter(
          (skin) =>
            String(skin.content_tier_id) === String(prob.content_tier_id),
        ).length,
      })),
    );
  }, [selectedSkins, tiers]);

  // Toggle selección de skin
  const toggleSkinSelection = (skin: Skin) => {
    if (selectedSkins.some((s) => s.id === skin.id)) {
      setSelectedSkins(selectedSkins.filter((s) => s.id !== skin.id));
    } else {
      setSelectedSkins([...selectedSkins, skin]);
    }
  };

  // Crear una nueva caja
  const createCaja = async () => {
    // Validaciones
    if (!nuevaCaja.nombre) {
      setError("El nombre de la caja es obligatorio");

      return;
    }

    // Verificar si el nombre contiene caracteres especiales o tildes
    if (
      /[\u00e1\u00e9\u00ed\u00f3\u00fa\u00c1\u00c9\u00cd\u00d3\u00da\u00f1\u00d1]/.test(
        nuevaCaja.nombre,
      )
    ) {
      if (
        !confirm(
          "El nombre de la caja contiene tildes o caracteres especiales que podrían causar problemas en las rutas. \n\n¿Deseas continuar de todos modos?",
        )
      ) {
        return;
      }
    }

    if (probabilidades.reduce((sum, p) => sum + p.probabilidad, 0) !== 1) {
      setError("La suma de probabilidades debe ser exactamente 1 (100%)");

      return;
    }

    if (selectedSkins.length === 0) {
      setError("Debes seleccionar al menos una skin para la caja");

      return;
    }

    setIsLoading(true);
    setError(null);

    // Generar la ruta para la caja
    const rutaCaja = `/main/${extraerTipoCaja(nuevaCaja.nombre, nuevaCaja.es_diaria)}`;

    console.log(`Ruta generada para la caja: ${rutaCaja}`);

    try {
      const supabase = getSupabaseClient();

      if (!supabase) {
        throw new Error("No se pudo conectar a la base de datos");
      }

      // Obtener los content_tiers disponibles para validación
      const { data: contentTiers, error: contentTiersError } = await supabase
        .from("content_tiers")
        .select("id");

      if (contentTiersError) {
        throw new Error(
          `Error al obtener content_tiers: ${contentTiersError.message}`,
        );
      }

      // Crear un conjunto de IDs válidos para verificación rápida
      const validTierIds = new Set(contentTiers?.map((tier) => tier.id) || []);

      // Verificar que todas las skins seleccionadas tengan un content_tier_id válido
      const invalidSkins = selectedSkins.filter(
        (skin) => !validTierIds.has(skin.content_tier_id),
      );

      if (invalidSkins.length > 0) {
        setError(
          `Hay ${invalidSkins.length} skins con content_tier_id inválido. Por favor, recarga la página y vuelve a intentarlo.`,
        );
        setIsLoading(false);

        return;
      }

      // 1. Insertar la caja con la ruta generada
      const { data: newCaja, error: insertError } = await supabase
        .from("cajas")
        .insert([
          {
            nombre: nuevaCaja.nombre,
            precio: nuevaCaja.precio,
            imagen_url: nuevaCaja.imagen_url,
            esta_disponible: nuevaCaja.esta_disponible,
            es_diaria: nuevaCaja.es_diaria,
            ruta: rutaCaja, // Guardar la ruta generada en la base de datos
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;
      if (!newCaja) throw new Error("No se pudo crear la caja");

      const cajaId = newCaja.id;

      // 2. Insertar las probabilidades
      const probsToInsert = probabilidades
        .filter((prob) => prob.probabilidad > 0) // Solo insertar las que tienen probabilidad
        .map((prob) => ({
          caja_id: cajaId,
          content_tier_id: prob.content_tier_id,
          probabilidad: prob.probabilidad,
          cantidad_skins: prob.cantidad_skins,
        }));

      const { error: probsError } = await supabase
        .from("tier_probabilidades")
        .insert(probsToInsert);

      if (probsError) throw probsError;

      // 3. Insertar las skins (solo las que tienen content_tier_id válido)
      const skinsToInsert = selectedSkins
        .filter((skin) => validTierIds.has(skin.content_tier_id))
        .map((skin) => ({
          caja_id: cajaId,
          skin_id: skin.id,
          content_tier_id: skin.content_tier_id,
          skin_nombre: skin.nombre,
        }));

      if (skinsToInsert.length === 0) {
        throw new Error(
          "No hay skins válidas para insertar. Todas las skins seleccionadas tienen content_tier_id inválido.",
        );
      }

      const { error: skinsError } = await supabase
        .from("cajas_skins")
        .insert(skinsToInsert);

      if (skinsError) throw skinsError;

      // Éxito
      setSuccess(`Caja "${nuevaCaja.nombre}" creada correctamente`);

      // Resetear formulario
      setNuevaCaja({
        nombre: "",
        precio: 250,
        imagen_url: "/free_cage.png",
        esta_disponible: true,
        es_diaria: false,
      });
      setProbabilidades((prev) =>
        prev.map((p) => ({ ...p, probabilidad: 0, cantidad_skins: 0 })),
      );
      setSelectedSkins([]);

      // Actualizar lista de cajas
      loadInitialData();
    } catch (error: any) {
      console.error("Error al crear caja:", error);
      setError(`Error al crear caja: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 pl-16 md:pr-12 lg:pr-16 pt-12 pb-24 min-h-screen bg-background w-full">
      <div className="w-full mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-foreground flex items-center font-[Raleway] font-semibold italic tracking-widest">
            / ADMIN
          </h1>
          <Link
            className="px-4 py-2 text-sm bg-primary/80 hover:bg-primary text-white rounded-md transition-colors"
            href="/main"
          >
            Volver al Inicio
          </Link>
        </div>
        <p className="text-white/70 mt-2">
          Panel de administración para crear y gestionar cajas
        </p>
      </div>

      {error && (
        <div className="w-full p-4 bg-red-500/20 border border-red-500/40 rounded-md text-red-400 mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="w-full p-4 bg-green-500/20 border border-green-500/40 rounded-md text-green-400 mb-4">
          {success}
        </div>
      )}

      <Tabs className="w-full" defaultValue="nueva">
        <TabsList className="mb-6">
          <TabsTrigger value="nueva">Nueva Caja</TabsTrigger>
          <TabsTrigger value="existentes">Cajas Existentes</TabsTrigger>
        </TabsList>

        {/* NUEVA CAJA */}
        <TabsContent className="space-y-8" value="nueva">
          {/* Info de la caja + Probabilidades */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Info de la caja */}
            <div className="bg-background/40 backdrop-blur-md p-6 rounded-xl border border-white/10">
              <h2 className="text-xl font-semibold mb-4">
                Información de la Caja
              </h2>
              <div className="space-y-4">
                {/* Campos */}
                <div>
                  <Label htmlFor="nombre">
                    Nombre{" "}
                    <span className="text-xs text-white/50">
                      (sin tildes ni caracteres especiales)
                    </span>
                  </Label>
                  <Input
                    id="nombre"
                    name="nombre"
                    placeholder="Ej: Caja Premium"
                    value={nuevaCaja.nombre}
                    onChange={handleCajaChange}
                  />
                  <div className="mt-1 text-xs text-white/70">
                    Ruta generada:{" "}
                    <span className="font-mono bg-black/30 px-1 py-0.5 rounded">
                      /main/
                      {nuevaCaja.nombre
                        ? extraerTipoCaja(nuevaCaja.nombre, nuevaCaja.es_diaria)
                        : "nombre-de-caja"}
                    </span>
                  </div>
                  {/[áéíóúÁÉÍÓÚñÑ]/.test(nuevaCaja.nombre) && (
                    <div className="mt-1 text-xs text-amber-400">
                      ⚠️ Advertencia: El nombre contiene tildes o caracteres
                      especiales que podrían causar problemas en las rutas.
                      Considera usar solo letras sin tildes.
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="precio">Precio (VP)</Label>
                  <Input
                    id="precio"
                    name="precio"
                    placeholder="250"
                    type="number"
                    value={nuevaCaja.precio}
                    onChange={handleCajaChange}
                  />
                </div>
                <div>
                  <Label htmlFor="imagen_url">URL de imagen</Label>
                  <Input
                    id="imagen_url"
                    name="imagen_url"
                    placeholder="/images/box.png"
                    value={nuevaCaja.imagen_url}
                    onChange={handleCajaChange}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    checked={nuevaCaja.esta_disponible}
                    className="w-4 h-4"
                    id="esta_disponible"
                    name="esta_disponible"
                    type="checkbox"
                    onChange={handleCheckboxChange}
                  />
                  <Label htmlFor="esta_disponible">Disponible</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    checked={nuevaCaja.es_diaria}
                    className="w-4 h-4"
                    id="es_diaria"
                    name="es_diaria"
                    type="checkbox"
                    onChange={handleCheckboxChange}
                  />
                  <Label htmlFor="es_diaria">Es caja diaria</Label>
                </div>
              </div>
            </div>

            {/* Probabilidades */}
            <div className="bg-background/40 backdrop-blur-md p-6 rounded-xl border border-white/10">
              <h2 className="text-xl font-semibold mb-4">
                Probabilidades por Tier
              </h2>
              <p className="text-sm text-white/70 mb-4">
                Define la probabilidad y cantidad de skins para cada tier. La
                suma debe ser exactamente 1 (100%).
              </p>
              <div className="space-y-4">
                {probabilidades.map((prob) => {
                  const skinsCount = selectedSkins.filter(
                    (skin) => skin.content_tier_id === prob.content_tier_id,
                  ).length;

                  return (
                    <div
                      key={prob.content_tier_id}
                      className="grid grid-cols-7 gap-2 items-center"
                    >
                      <div className="col-span-3 flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-2"
                          style={{
                            backgroundColor: prob.content_tier?.color || "#fff",
                          }}
                        />
                        <span>{prob.content_tier?.nombre}</span>
                      </div>
                      <div className="col-span-2">
                        <Input
                          disabled={prob.cantidad_skins === 0}
                          max="1"
                          min="0"
                          step="0.01"
                          type="number"
                          value={prob.probabilidad}
                          onChange={(e) =>
                            handleProbabilidadChange(
                              prob.content_tier_id,
                              "probabilidad",
                              parseFloat(e.target.value),
                            )
                          }
                        />
                      </div>
                      <div className="col-span-2 text-sm text-white/80 text-center">
                        {skinsCount} skin{skinsCount === 1 ? "" : "s"}{" "}
                        seleccionada{skinsCount === 1 ? "" : "s"}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 pt-2 border-t border-white/10">
                <span>Total:</span>
                <span
                  className={
                    Math.abs(
                      probabilidades.reduce(
                        (sum, p) => sum + p.probabilidad,
                        0,
                      ) - 1,
                    ) < 0.001
                      ? "text-green-400"
                      : "text-red-400"
                  }
                >
                  {(
                    probabilidades.reduce((sum, p) => sum + p.probabilidad, 0) *
                    100
                  ).toFixed(0)}
                  %
                </span>
              </div>
            </div>
          </div>

          {/* Skins */}
          <div className="bg-background/40 backdrop-blur-md p-6 rounded-xl border border-white/10">
            <h2 className="text-xl font-semibold mb-4">Selección de Skins</h2>
            <div className="mb-4 flex gap-4 items-center">
              <Input
                className="max-w-md"
                placeholder="Buscar skins por nombre de bundle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Button
                disabled={isLoadingBundles}
                variant="secondary"
                onClick={loadBundles}
              >
                {isLoadingBundles ? "Cargando Bundles..." : "Recargar Bundles"}
              </Button>
              {bundles.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    const allFilteredBundleIds = filteredBundles.map(b => b.uuid);
                    const areAllCurrentlyVisibleExpanded = allFilteredBundleIds.length > 0 && allFilteredBundleIds.every(id => expandedBundles.includes(id));

                    if (areAllCurrentlyVisibleExpanded) {
                      setExpandedBundles(prev => prev.filter(id => !allFilteredBundleIds.includes(id)));
                    } else {
                      const bundlesToExpandIds = filteredBundles
                        .filter(b => !expandedBundles.includes(b.uuid))
                        .map(b => b.uuid);
                      setExpandedBundles(prev => Array.from(new Set([...prev, ...bundlesToExpandIds])));
                      // La carga de skins se manejará en un useEffect
                    }
                  }}
                >
                  { filteredBundles.length > 0 && filteredBundles.every(b => expandedBundles.includes(b.uuid)) 
                    ? "Contraer Todos Visibles" 
                    : "Expandir Todos Visibles" }
                </Button>
              )}
              <div className="ml-auto text-white/70">
                {selectedSkins.length} skins seleccionadas
              </div>
            </div>

            {isLoadingBundles ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
              </div>
            ) : (
              <>
                {filteredBundles.length === 0 ? (
                  <div className="text-center text-white/70 py-8">
                    No se encontraron bundles con ese término de búsqueda
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredBundles.map((bundle) => (
                      <div key={bundle.uuid} className="mb-2">
                        {/* Encabezado del bundle */}
                        <div
                          role="button"
                          tabIndex={0}
                          className="flex items-center gap-2 cursor-pointer p-2 rounded-lg transition-all duration-200 bg-gradient-to-br from-black/60 to-black/90 border border-white/10 hover:border-primary/40 hover:shadow-lg"
                          onClick={() => loadSkinsForBundle(bundle)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              loadSkinsForBundle(bundle);
                            }
                          }}
                        >
                          <div className="relative flex-shrink-0">
                            <Image
                              alt={bundle.displayName}
                              className="rounded-md shadow-md border border-white/10"
                              height={48}
                              src={bundle.displayIcon}
                              width={48}
                            />
                            <span className="absolute -bottom-1 -right-1 bg-primary text-xs text-black font-bold px-1.5 py-0.5 rounded-full shadow">
                              {skinsByBundle[bundle.uuid]?.length || 0}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0 ml-1">
                            <h3
                              className="font-bold text-sm truncate"
                              title={bundle.displayName}
                            >
                              {bundle.displayName}
                            </h3>
                            <p className="text-xs text-white/50 truncate">
                              {skinsByBundle[bundle.uuid]?.length === 1
                                ? "1 skin disponible"
                                : `${skinsByBundle[bundle.uuid]?.length || 0} skins disponibles`}
                            </p>
                          </div>
                          <button
                            className={`flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full border border-white/10 bg-black/30 text-primary transition-transform duration-200 hover:scale-110 ${
                              expandedBundles.includes(bundle.uuid)
                                ? "rotate-90"
                                : ""
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              loadSkinsForBundle(bundle);
                            }}
                          >
                            <svg
                              fill="none"
                              height="14"
                              viewBox="0 0 24 24"
                              width="14"
                            >
                              <path
                                d="M9 5l7 7-7 7"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                              />
                            </svg>
                          </button>
                        </div>

                        {/* Skins del bundle */}
                        {expandedBundles.includes(bundle.uuid) && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 p-2 bg-black/20 rounded-lg border border-white/5">
                            {(skinsByBundle[bundle.uuid] || []).length === 0 ? (
                              <div className="col-span-full text-center text-white/60 py-4 text-xs">
                                No hay skins en este bundle.
                              </div>
                            ) : (
                              skinsByBundle[bundle.uuid].map((skin) => (
                                <div
                                  role="button"
                                  tabIndex={0}
                                  key={skin.id}
                                  className={`p-1.5 rounded-md cursor-pointer transition-all ${
                                    selectedSkins.some((s) => s.id === skin.id)
                                      ? "bg-primary/20 border border-primary/70"
                                      : "bg-black/20 border border-white/10 hover:bg-black/40"
                                  }`}
                                  onClick={() => toggleSkinSelection(skin)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      toggleSkinSelection(skin);
                                    }
                                  }}
                                >
                                  <div className="relative aspect-square mb-1 bg-black/30 rounded-sm overflow-hidden">
                                    {skin.imagen_url ? (
                                      <Image
                                        fill
                                        alt={skin.nombre}
                                        className="object-contain p-1"
                                        src={skin.imagen_url}
                                      />
                                    ) : (
                                      <div className="absolute inset-0 flex items-center justify-center text-white/50 text-xs">
                                        Sin imagen
                                      </div>
                                    )}
                                  </div>
                                  <p
                                    className="text-xs truncate"
                                    style={{
                                      color:
                                        skin.content_tier?.color || "white",
                                    }}
                                  >
                                    {skin.nombre}
                                  </p>
                                  <p className="text-[10px] text-white/60 truncate">
                                    {skin.content_tier?.nombre || "Sin tier"}
                                  </p>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex justify-end mt-6">
            <Button
              className="px-8 py-2"
              disabled={isLoading}
              onClick={createCaja}
            >
              {isLoading ? "Creando..." : "Crear Caja"}
            </Button>
          </div>
        </TabsContent>

        {/* CAJAS EXISTENTES */}
        <TabsContent className="space-y-8" value="existentes">
          <div className="bg-background/40 backdrop-blur-md p-6 rounded-xl border border-white/10">
            <h2 className="text-xl font-semibold mb-4">Cajas Existentes</h2>
            {cajas.length === 0 ? (
              <p className="text-white/70 py-4">
                No hay cajas creadas. Crea una desde la pestaña &quot;Nueva Caja&quot;.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cajas.map((caja) => (
                  <div
                    key={caja.id}
                    className="bg-black/20 border border-white/10 rounded-lg p-4 hover:bg-black/30 transition-colors"
                  >
                    <div className="flex items-center mb-2">
                      {caja.imagen_url && (
                        <div className="w-12 h-12 relative mr-3">
                          <Image
                            fill
                            alt={caja.nombre}
                            className="object-contain"
                            src={caja.imagen_url}
                          />
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold">{caja.nombre}</h3>
                        <p className="text-sm text-white/70 flex items-center gap-2">
                          <span>{caja.precio} VP</span>
                          {caja.es_diaria && (
                            <span className="text-xs bg-primary/20 text-primary px-1 rounded">
                              Diaria
                            </span>
                          )}
                          {!caja.esta_disponible && (
                            <span className="text-xs bg-red-500/20 text-red-400 px-1 rounded">
                              No disponible
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
                      <Link
                        className="text-xs px-2 py-1 bg-primary/20 hover:bg-primary/40 text-primary rounded transition-colors"
                        href={`/main/${caja.nombre.toLowerCase().replace(/\s+/g, "")}`}
                      >
                        Ver
                      </Link>
                      <Button
                        className="text-xs px-2 py-1"
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelectedCaja(caja.id ?? null)}
                      >
                        Editar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
