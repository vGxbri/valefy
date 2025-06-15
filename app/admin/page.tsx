"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Package, 
  BarChart3, 
  Shield, 
  ChevronRight,
  Plus,
  Edit,
  Search,
  Star,
  TrendingUp,
  DollarSign,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  Layers,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { getWeaponSkins, filterSkinsByBundleWithIcon, Skin as ValorantApiSkin } from "@/lib/valorantApi";
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

// Interfaces
interface AdminStats {
  totalUsers: number;
  totalBoxes: number;
  totalSkins: number;
  totalBoxesOpened: number;
  totalRevenue: number;
  cajasDisponibles: number;
  skinsUnicas: number;
  usuariosOAuth: number;
  // Nuevas estadísticas basadas en logs
  totalSkinsObtenidas: number;
  totalSkinsEliminadas: number;
  totalIntentosMejora: number;
  totalMejorasExitosas: number;
  totalMisionesCompletadas: number;
  vpTotalGastado: number;
  vpTotalGanado: number;
  usuariosActivosHoy: number;
  usuariosActivosSemana: number;
  promedioSkinsUsuario: number;
  tasaExitoMejoras: number;
}

interface CajaPopular {
  id: string;
  nombre: string;
  imagen_url: string;
  precio: number;
  total_aperturas: number;
  revenue_generado: number;
}

interface SkinsPopulares {
  skin_id: string;
  skin_nombre: string;
  tier_nombre: string;
  tier_color: string;
  total_obtenidas: number;
}

interface EstadisticasPorTier {
  tier_id: string;
  tier_nombre: string;
  tier_color: string;
  total_skins: number;
  total_obtenidas: number;
  porcentaje_obtencion: number;
}

interface Caja {
  id: string;
  nombre: string;
  precio: number;
  imagen_url: string;
  esta_disponible: boolean;
  es_diaria: boolean;
  ruta: string;
  categoria: string;
  categoria_titulo: string;
  fecha_actualizacion?: string;
  total_aperturas?: number;
}

interface CajaSkin {
  id: string;
  caja_id: string;
  skin_id: string;
  skin_nombre: string;
  content_tier_id: string;
  caja_nombre?: string;
  tier_nombre?: string;
  tier_color?: string;
  tier_grado?: number;
}

interface ContentTier {
  id: string;
  nombre: string;
  color: string;
  uuid_api: string;
  grado: number;
}

// Interfaces adicionales para la funcionalidad de crear cajas
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

interface Bundle {
  uuid: string;
  displayName: string;
  displayIcon: string;
}

interface NuevaCaja {
  nombre: string;
  precio: number;
  imagen_url: string;
  esta_disponible: boolean;
  es_diaria: boolean;
  categoria: string;
  categoria_titulo: string;
}

// Simple components
const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-backgroundAlt/20 backdrop-blur-xl border border-white/10 rounded-2xl ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="p-6 border-b border-white/10">{children}</div>
);

const CardTitle = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <h3 className={`text-lg font-semibold ${className}`}>{children}</h3>
);

const CardDescription = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <p className={`text-sm ${className}`}>{children}</p>
);

const CardContent = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-6 ${className}`}>{children}</div>
);

const Badge = ({ children, variant = "default", className = "" }: { 
  children: React.ReactNode; 
  variant?: "default" | "secondary" | "outline";
  className?: string;
}) => {
  const variants = {
    default: "bg-primary/20 text-primary border border-primary/30",
    secondary: "bg-gray-500/20 text-gray-400 border border-gray-500/30",
    outline: "bg-transparent text-white border border-white/30"
  };
  
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

export default function AdminPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // Estados principales
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalBoxes: 0,
    totalSkins: 0,
    totalBoxesOpened: 0,
    totalRevenue: 0,
    cajasDisponibles: 0,
    skinsUnicas: 0,
    usuariosOAuth: 0,
    // Nuevas estadísticas basadas en logs
    totalSkinsObtenidas: 0,
    totalSkinsEliminadas: 0,
    totalIntentosMejora: 0,
    totalMejorasExitosas: 0,
    totalMisionesCompletadas: 0,
    vpTotalGastado: 0,
    vpTotalGanado: 0,
    usuariosActivosHoy: 0,
    usuariosActivosSemana: 0,
    promedioSkinsUsuario: 0,
    tasaExitoMejoras: 0
  });
  
  const [cajasPopulares, setCajasPopulares] = useState<CajaPopular[]>([]);
  const [skinsPopulares, setSkinsPopulares] = useState<SkinsPopulares[]>([]);
  const [estadisticasPorTier, setEstadisticasPorTier] = useState<EstadisticasPorTier[]>([]);
  
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [cajaSkins, setCajaSkins] = useState<CajaSkin[]>([]);
  const [contentTiers, setContentTiers] = useState<ContentTier[]>([]);

  // Estados de filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState("");
  const [boxFilter, setBoxFilter] = useState("all");
  const [skinFilter, setSkinFilter] = useState("all");

  // Estados para la funcionalidad de crear cajas
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Estados para ver/editar cajas
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCajaForView, setSelectedCajaForView] = useState<Caja | null>(null);
  const [selectedCajaForEdit, setSelectedCajaForEdit] = useState<Caja | null>(null);
  const [editingCaja, setEditingCaja] = useState<Caja | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Estados adicionales para edición completa
  const [editProbabilidades, setEditProbabilidades] = useState<TierProbabilidad[]>([]);
  const [editSelectedSkins, setEditSelectedSkins] = useState<Skin[]>([]);
  const [editExpandedBundles, setEditExpandedBundles] = useState<string[]>([]);
  const [editBundleSearchTerm, setEditBundleSearchTerm] = useState("");
  const [editSkinSearchTerm, setEditSkinSearchTerm] = useState("");
  const [editPendingSkinLoads, setEditPendingSkinLoads] = useState<Set<string>>(new Set());
  const [isLoadingEditData, setIsLoadingEditData] = useState(false);

  // Estado para nueva caja
  const [nuevaCaja, setNuevaCaja] = useState<NuevaCaja>({
    nombre: "",
    precio: 0,
    imagen_url: "/default_box.png",
    esta_disponible: false,
    es_diaria: false,
    categoria: "default",
    categoria_titulo: "DEFAULT"
  });

  // Estados para tiers y probabilidades
  const [tiers, setTiers] = useState<any[]>([]);
  const [probabilidades, setProbabilidades] = useState<TierProbabilidad[]>([]);

  // Estados para bundles y skins
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [skinsByBundle, setSkinsByBundle] = useState<Record<string, Skin[]>>({});
  const [selectedSkins, setSelectedSkins] = useState<Skin[]>([]);
  const [expandedBundles, setExpandedBundles] = useState<string[]>([]);
  const [isLoadingBundles, setIsLoadingBundles] = useState(false);
  const [loadingBundleUuid, setLoadingBundleUuid] = useState<string | null>(null);
  const [bundleSearchTerm, setBundleSearchTerm] = useState("");
  const [skinSearchTerm, setSkinSearchTerm] = useState("");
  const [pendingSkinLoads, setPendingSkinLoads] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadInitialData();
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
        const isLoadingThisSpecificBundle = loadingBundleUuid === bundle.uuid;

        if (!hasFormattedSkins && !isAlreadyPending && !isLoadingThisSpecificBundle) {
          setPendingSkinLoads((prev: Set<string>) => new Set(prev).add(bundle.uuid));
          loadSkinsForBundle(bundle);
        }
      }
    });
  }, [expandedBundles, bundles]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadDashboardStats(),
        loadCajas(),
        loadCajaSkins(),
        loadContentTiers(),
        loadCajasPopulares(),
        loadSkinsPopulares(),
        loadEstadisticasPorTier()
      ]);
    } catch (error) {
      console.error("Error al cargar datos:", error);
      toast.error("Error al cargar los datos del panel");
    } finally {
      setIsLoading(false);
    }
  };

  const loadDashboardStats = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      // Obtener estadísticas básicas
      const [
        { count: totalUsers },
        { count: totalBoxes },
        { count: totalBoxesOpened },
        { count: cajasDisponibles },
        { data: usuariosOAuthData }
      ] = await Promise.all([
        supabase.from("usuarios").select("*", { count: "exact", head: true }),
        supabase.from("cajas").select("*", { count: "exact", head: true }),
        supabase.from("inventario_usuario").select("*", { count: "exact", head: true }),
        supabase.from("cajas").select("*", { count: "exact", head: true }).eq("esta_disponible", true),
        supabase.from("usuarios").select("oauth").neq("oauth", null)
      ]);

      // Contar usuarios OAuth (oauth no es null y no es false)
      const usuariosOAuth = usuariosOAuthData?.filter(u => u.oauth && u.oauth !== false).length || 0;

      // Contar skins únicas
      const { data: skinsUnicas } = await supabase
        .from("cajas_skins")
        .select("skin_id")
        .then(result => ({
          ...result,
          data: result.data ? Array.from(new Set(result.data.map(item => item.skin_id))) : []
        }));

      // Obtener estadísticas simples basadas en logs
      const { count: totalLogs } = await supabase.from("logs_caja_abierta").select("*", { count: "exact", head: true });
      const { count: totalMejoras } = await supabase.from("logs_skin_mejorada").select("*", { count: "exact", head: true });
      const { count: mejorasExitosas } = await supabase.from("logs_skin_mejorada").select("*", { count: "exact", head: true }).eq("exitoso", true);
      const { count: totalMisiones } = await supabase.from("logs_historial_recompensas").select("*", { count: "exact", head: true });
      
      const promedioSkins = (totalUsers || 0) > 0 ? Math.round(((totalBoxesOpened || 0) / (totalUsers || 1)) * 100) / 100 : 0;
      const tasaExito = (totalMejoras || 0) > 0 ? Math.round(((mejorasExitosas || 0) / (totalMejoras || 1)) * 100 * 100) / 100 : 0;
      
      setStats({
        totalUsers: totalUsers || 0,
        totalBoxes: totalBoxes || 0,
        totalSkins: skinsUnicas?.length || 0,
        totalBoxesOpened: totalBoxesOpened || 0,
        totalRevenue: (totalBoxesOpened || 0) * 250,
        cajasDisponibles: cajasDisponibles || 0,
        skinsUnicas: skinsUnicas?.length || 0,
        usuariosOAuth: usuariosOAuth || 0,
        totalSkinsObtenidas: totalLogs || 0,
        totalSkinsEliminadas: 0,
        totalIntentosMejora: totalMejoras || 0,
        totalMejorasExitosas: mejorasExitosas || 0,
        totalMisionesCompletadas: totalMisiones || 0,
        vpTotalGastado: 0,
        vpTotalGanado: 0,
        usuariosActivosHoy: 0,
        usuariosActivosSemana: 0,
        promedioSkinsUsuario: promedioSkins,
        tasaExitoMejoras: tasaExito
      });
    } catch (error) {
      console.error("Error al cargar estadísticas:", error);
    }
  };

  const loadDetailedStats = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return {
      totalSkinsObtenidas: 0,
      totalSkinsEliminadas: 0,
      totalIntentosMejora: 0,
      totalMejorasExitosas: 0,
      totalMisionesCompletadas: 0,
      vpTotalGastado: 0,
      vpTotalGanado: 0,
      usuariosActivosHoy: 0,
      usuariosActivosSemana: 0,
      promedioSkinsUsuario: 0,
      tasaExitoMejoras: 0
    };

    try {
      const [
        totalCajasResult,
        totalMejorasResult, 
        mejorasExitosasResult,
        usuariosActivosHoyResult,
        usuariosActivosSemanaResult,
        totalInventarioResult,
        totalUsuariosResult,
        totalVPGastadoResult,
        totalVPGanadoResult,
        totalMisionesResult
      ] = await Promise.all([
        // Total de cajas abiertas (aproximación de skins obtenidas)
        supabase.rpc('count_logs', { table_name: 'logs_caja_abierta' }).then(r => r.data || 0),
        // Total de intentos de mejora
        supabase.rpc('count_logs', { table_name: 'logs_skin_mejorada' }).then(r => r.data || 0),
        // Mejoras exitosas
        supabase.from('logs_skin_mejorada').select('*', { count: 'exact', head: true }).eq('exitoso', true),
        // Usuarios activos hoy
        supabase.rpc('usuarios_activos_periodo', { horas: 24 }).then(r => r.data || 0),
        // Usuarios activos semana
        supabase.rpc('usuarios_activos_periodo', { horas: 168 }).then(r => r.data || 0),
        // Total items en inventario
        supabase.from('inventario_usuario').select('*', { count: 'exact', head: true }),
        // Total usuarios
        supabase.from('usuarios').select('*', { count: 'exact', head: true }),
        // VP total gastado
        supabase.rpc('sum_column', { table_name: 'logs_caja_abierta', column_name: 'costo' }).then(r => r.data || 0),
        // VP total ganado en misiones
        supabase.rpc('sum_column', { table_name: 'logs_historial_recompensas', column_name: 'vp_otorgados' }).then(r => r.data || 0),
        // Total misiones completadas
        supabase.from('logs_historial_recompensas').select('*', { count: 'exact', head: true })
      ]);

      const totalInventarioItems = totalInventarioResult.count || 0;
      const totalUsuarios = totalUsuariosResult.count || 0;
      const promedioSkinsUsuario = totalUsuarios > 0 ? Math.round((totalInventarioItems / totalUsuarios) * 100) / 100 : 0;
      
      const totalIntentosMejora = totalMejorasResult as number;
      const totalMejorasExitosas = mejorasExitosasResult.count || 0;
      const tasaExitoMejoras = totalIntentosMejora > 0 ? Math.round(((totalMejorasExitosas) / totalIntentosMejora) * 100 * 100) / 100 : 0;

      return {
        totalSkinsObtenidas: totalCajasResult,
        totalSkinsEliminadas: 0,
        totalIntentosMejora,
        totalMejorasExitosas,
        totalMisionesCompletadas: totalMisionesResult.count || 0,
        vpTotalGastado: totalVPGastadoResult,
        vpTotalGanado: totalVPGanadoResult,
        usuariosActivosHoy: usuariosActivosHoyResult,
        usuariosActivosSemana: usuariosActivosSemanaResult,
        promedioSkinsUsuario,
        tasaExitoMejoras
      };
    } catch (error) {
      console.error("Error al cargar estadísticas detalladas:", error);
      
      // Fallback con consultas más simples
      try {
        const [
          { count: totalCajas },
          { count: totalMejoras },
          { count: mejorasExitosas },
          { count: totalInventario },
          { count: totalUsuarios },
          { count: totalMisiones }
        ] = await Promise.all([
          supabase.from('logs_caja_abierta').select('*', { count: 'exact', head: true }),
          supabase.from('logs_skin_mejorada').select('*', { count: 'exact', head: true }),
          supabase.from('logs_skin_mejorada').select('*', { count: 'exact', head: true }).eq('exitoso', true),
          supabase.from('inventario_usuario').select('*', { count: 'exact', head: true }),
          supabase.from('usuarios').select('*', { count: 'exact', head: true }),
          supabase.from('logs_historial_recompensas').select('*', { count: 'exact', head: true })
        ]);

        const promedioSkinsUsuario = (totalUsuarios || 0) > 0 ? Math.round(((totalInventario || 0) / (totalUsuarios || 1)) * 100) / 100 : 0;
        const tasaExitoMejoras = (totalMejoras || 0) > 0 ? Math.round(((mejorasExitosas || 0) / (totalMejoras || 1)) * 100 * 100) / 100 : 0;

        return {
          totalSkinsObtenidas: totalCajas || 0,
          totalSkinsEliminadas: 0,
          totalIntentosMejora: totalMejoras || 0,
          totalMejorasExitosas: mejorasExitosas || 0,
          totalMisionesCompletadas: totalMisiones || 0,
          vpTotalGastado: 0, // Simplificado
          vpTotalGanado: 0, // Simplificado
          usuariosActivosHoy: 0, // Simplificado
          usuariosActivosSemana: 0, // Simplificado
          promedioSkinsUsuario,
          tasaExitoMejoras
        };
      } catch (fallbackError) {
        console.error("Error en fallback:", fallbackError);
        return {
          totalSkinsObtenidas: 0,
          totalSkinsEliminadas: 0,
          totalIntentosMejora: 0,
          totalMejorasExitosas: 0,
          totalMisionesCompletadas: 0,
          vpTotalGastado: 0,
          vpTotalGanado: 0,
          usuariosActivosHoy: 0,
          usuariosActivosSemana: 0,
          promedioSkinsUsuario: 0,
          tasaExitoMejoras: 0
        };
      }
    }
  };

  const loadCajas = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from("cajas")
        .select("*")
        .order("nombre", { ascending: true });

      if (error) throw error;
      setCajas(data as unknown as Caja[] || []);
    } catch (error) {
      console.error("Error al cargar cajas:", error);
    }
  };

  const loadCajaSkins = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from("cajas_skins")
        .select(`
          *,
          cajas!inner(nombre),
          content_tiers(nombre, color, grado)
        `);

      if (error) throw error;
      setCajaSkins(data as unknown as CajaSkin[] || []);
    } catch (error) {
      console.error("Error al cargar skins de cajas:", error);
    }
  };

  const loadContentTiers = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from("content_tiers")
        .select("*")
        .order("grado", { ascending: true });

      if (error) throw error;
      setContentTiers(data as unknown as ContentTier[] || []);
    } catch (error) {
      console.error("Error al cargar content tiers:", error);
    }
  };

  const loadCajasPopulares = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      // Primero obtener logs de apertura
      const { data: logsApertura, error: logsError } = await supabase
        .from("logs_caja_abierta")
        .select("caja_id, costo");

      if (logsError) throw logsError;

      // Obtener información de todas las cajas
      const { data: todasLasCajas, error: cajasError } = await supabase
        .from("cajas")
        .select("id, nombre, imagen_url, precio");

      if (cajasError) throw cajasError;

      // Crear mapa de cajas para fácil acceso
      const cajasMap = new Map();
      todasLasCajas?.forEach((caja: any) => {
        cajasMap.set(caja.id, caja);
      });

      // Agrupar por caja y calcular estadísticas
      const estadisticasMap = new Map<string, {
        id: string;
        nombre: string;
        imagen_url: string;
        precio: number;
        total_aperturas: number;
        revenue_generado: number;
      }>();

      (logsApertura || []).forEach((log: any) => {
        const cajaId = log.caja_id;
        const cajaInfo = cajasMap.get(cajaId);
        
        if (cajaInfo) {
          if (!estadisticasMap.has(cajaId)) {
            estadisticasMap.set(cajaId, {
              id: cajaId,
              nombre: cajaInfo.nombre || 'Sin nombre',
              imagen_url: cajaInfo.imagen_url || '/free_cage.png',
              precio: cajaInfo.precio || 0,
              total_aperturas: 0,
              revenue_generado: 0
            });
          }

          const cajaData = estadisticasMap.get(cajaId)!;
          cajaData.total_aperturas += 1;
          cajaData.revenue_generado += log.costo || 0;
        }
      });

      // Convertir a array y ordenar por popularidad
      const cajasPopularesArray = Array.from(estadisticasMap.values())
        .sort((a, b) => b.total_aperturas - a.total_aperturas)
        .slice(0, 10);

      setCajasPopulares(cajasPopularesArray);
    } catch (error) {
      console.error("Error al cargar cajas populares:", error);
      setCajasPopulares([]);
    }
  };

  const loadSkinsPopulares = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      // Obtener skins más obtenidas desde logs de cajas
      const { data: logsCajas, error } = await supabase
        .from("logs_caja_abierta")
        .select("skins_conseguidas");

      if (error) throw error;

      // Contar frecuencia de cada skin
      const skinFrequency = new Map<string, {
        skin_id: string;
        skin_nombre: string;
        tier_nombre: string;
        tier_color: string;
        count: number;
      }>();

             (logsCajas || []).forEach((log: any) => {
         if (Array.isArray(log.skins_conseguidas)) {
           log.skins_conseguidas.forEach((skin: any) => {
             const skinId = skin.skin_id;
             if (!skinFrequency.has(skinId)) {
               skinFrequency.set(skinId, {
                 skin_id: skinId,
                 skin_nombre: skin.skin_nombre || 'Sin nombre',
                 tier_nombre: skin.tier_nombre || 'Sin tier',
                 tier_color: skin.tier_color || '#FFFFFF',
                 count: 0
               });
             }
             skinFrequency.get(skinId)!.count += 1;
           });
         }
       });

      // Convertir a array y ordenar por frecuencia
      const skinsPopularesArray = Array.from(skinFrequency.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map(skin => ({
          skin_id: skin.skin_id,
          skin_nombre: skin.skin_nombre,
          tier_nombre: skin.tier_nombre,
          tier_color: skin.tier_color,
          total_obtenidas: skin.count
        }));

      setSkinsPopulares(skinsPopularesArray);
    } catch (error) {
      console.error("Error al cargar skins populares:", error);
    }
  };

  const loadEstadisticasPorTier = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      // Obtener todos los tiers
      const { data: tiers, error: tiersError } = await supabase
        .from("content_tiers")
        .select("*");

      if (tiersError) throw tiersError;

      // Obtener estadísticas por tier
      const estadisticasTiers = await Promise.all(
        (tiers || []).map(async (tier: any) => {
          // Contar total de skins disponibles en este tier
          const { count: totalSkins } = await supabase
            .from("cajas_skins")
            .select("*", { count: "exact", head: true })
            .eq("content_tier_id", tier.id);

          // Contar cuántas veces se han obtenido skins de este tier
          const { data: logsCajas } = await supabase
            .from("logs_caja_abierta")
            .select("skins_conseguidas");

                     let totalObtenidas = 0;
           (logsCajas || []).forEach((log: any) => {
             if (Array.isArray(log.skins_conseguidas)) {
               log.skins_conseguidas.forEach((skin: any) => {
                 if (skin.tier_id === tier.uuid_api) {
                   totalObtenidas += 1;
                 }
               });
             }
           });
           
           const porcentajeObtencion = (totalSkins || 0) > 0 ? (totalObtenidas / (totalSkins || 1)) * 100 : 0;

          return {
            tier_id: tier.id,
            tier_nombre: tier.nombre,
            tier_color: tier.color,
            total_skins: totalSkins || 0,
            total_obtenidas: totalObtenidas,
            porcentaje_obtencion: Math.round(porcentajeObtencion * 100) / 100
          };
        })
      );

      setEstadisticasPorTier(estadisticasTiers);
    } catch (error) {
      console.error("Error al cargar estadísticas por tier:", error);
    }
  };

  const toggleBoxStatus = async (boxId: string, currentStatus: boolean) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from("cajas")
        .update({ esta_disponible: !currentStatus })
        .eq("id", boxId);

      if (error) throw error;

      setCajas(cajas.map(c => 
        c.id === boxId ? { ...c, esta_disponible: !currentStatus } : c
      ));

      // Actualizar stats
      await loadDashboardStats();

      toast.success(`Caja ${!currentStatus ? 'activada' : 'desactivada'} correctamente`);
    } catch (error) {
      console.error("Error al cambiar estado de la caja:", error);
      toast.error("Error al cambiar el estado de la caja");
    }
  };

  // Filtrar cajas
  const filteredCajas = cajas.filter(caja => {
    const matchesSearch = caja.nombre?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = boxFilter === "all" ? true :
                         boxFilter === "available" ? caja.esta_disponible :
                         boxFilter === "unavailable" ? !caja.esta_disponible :
                         boxFilter === "daily" ? caja.es_diaria :
                         boxFilter === "alumno" ? caja.categoria === "alumno" : true;
    
    return matchesSearch && matchesFilter;
  });

  // Filtrar skins
  const filteredCajaSkins = cajaSkins.filter(skin => {
    const matchesSearch = skin.skin_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         skin.caja_nombre?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = skinFilter === "all" ? true :
                         skinFilter === "legendary" ? skin.tier_grado === 5 :
                         skinFilter === "epic" ? skin.tier_grado === 4 :
                         skinFilter === "rare" ? skin.tier_grado === 3 : true;
    
    return matchesSearch && matchesFilter;
  });

  const StatCard = ({ title, value, subtitle, icon: Icon, color = "primary" }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: any;
    color?: string;
  }) => (
    <div
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-backgroundAlt/20 to-background/40 backdrop-blur-xl border border-white/10 p-6 shadow-[0_0_45px_-5px_rgba(0,0,0,0.3)] hover:shadow-[0_0_55px_-5px_rgba(0,0,0,0.4)] transition-all duration-300"
    >
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-white/70">{title}</p>
          <div className="text-2xl font-bold text-white">{value}</div>
          {subtitle && (
            <p className="text-xs text-white/50">{subtitle}</p>
          )}
        </div>
        <div className={`rounded-lg bg-primary/20 p-3`}>
          <Icon className={`h-6 w-6 text-primary`} />
        </div>
      </div>
      <div className={`absolute -right-4 -top-4 h-16 w-16 rounded-full bg-primary/10 blur-2xl`} />
    </div>
  );

  // Función para cargar bundles
  const loadBundles = async () => {
    setIsLoadingBundles(true);
    try {
      const bundlesResponse = await fetch("https://valorant-api.com/v1/bundles");
      const bundlesData = await bundlesResponse.json();
      
      const allSkins = await getWeaponSkins();
      const filteredSkins = await filterSkinsByBundleWithIcon(allSkins);

      const skinCounts: Record<string, Skin[]> = {};

      bundlesData.data.forEach((bundle: Bundle) => {
        skinCounts[bundle.uuid] = [];
      });

      filteredSkins.forEach((skin) => {
        const bundleName = skin.displayName.split(" ")[0].toLowerCase();
        const matchingBundle = bundlesData.data.find(
          (b: Bundle) => b.displayName.toLowerCase() === bundleName,
        );

        if (matchingBundle) {
          if (!skinCounts[matchingBundle.uuid]) {
            skinCounts[matchingBundle.uuid] = [];
          }
          skinCounts[matchingBundle.uuid].push(skin as unknown as Skin);
        }
      });

      const bundlesWithSkins = (bundlesData.data as Bundle[]).filter(
        (bundle) => skinCounts[bundle.uuid] && skinCounts[bundle.uuid].length > 0,
      );

      setBundles(bundlesWithSkins);
      setSkinsByBundle(skinCounts);
    } catch (error: any) {
      console.error("Error al cargar bundles:", error);
      setCreateError("Error al cargar bundles");
    } finally {
      setIsLoadingBundles(false);
    }
  };

  // Función para cargar skins de un bundle específico
  const loadSkinsForBundle = async (bundle: Bundle) => {
    const hasFormattedSkins = skinsByBundle[bundle.uuid] && 
                              skinsByBundle[bundle.uuid].length > 0 && 
                              skinsByBundle[bundle.uuid][0].content_tier_id;

    if (hasFormattedSkins) {
      if (expandedBundles.includes(bundle.uuid)) {
        const selectedInBundle = selectedSkins.some((skin) =>
          (skinsByBundle[bundle.uuid] || []).some((bSkin) => bSkin.id === skin.id),
        );
        if (!selectedInBundle) {
          setExpandedBundles(expandedBundles.filter((id) => id !== bundle.uuid));
        }
      } else {
        setExpandedBundles([...expandedBundles, bundle.uuid]);
      }
      return;
    }

    setLoadingBundleUuid(bundle.uuid);
    try {
      const bundleSkins = skinsByBundle[bundle.uuid] || [];
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("No se pudo conectar a la base de datos");

      const { data: allSupabaseTiersData, error: contentTiersError } = await supabase
        .from("content_tiers")
        .select("uuid_api");

      if (contentTiersError) throw new Error("Error al cargar content_tiers");

      const validTierUuidsFromSupabase = new Set(allSupabaseTiersData?.map(t => t.uuid_api) || []);
      const formattedSkins: Skin[] = [];

      for (const skin of bundleSkins) {
        if ("content_tier_id" in skin && skin.content_tier_id) {
          if (validTierUuidsFromSupabase.has(skin.content_tier_id)) {
            formattedSkins.push(skin as Skin);
          }
          continue;
        }

        const valorantApiSkin = skin as unknown as ValorantApiSkin;
        if (valorantApiSkin.contentTierUuid && validTierUuidsFromSupabase.has(valorantApiSkin.contentTierUuid)) {
          const tierDataForFormatting = await getTierData(supabase, valorantApiSkin.contentTierUuid);
          if (tierDataForFormatting) {
            const formattedSkin = formatSkinForApp(valorantApiSkin, tierDataForFormatting);
            formattedSkins.push(formattedSkin);
          }
        }
      }

      setSkinsByBundle((prev) => ({ ...prev, [bundle.uuid]: formattedSkins }));
      if (!expandedBundles.includes(bundle.uuid)) {
        setExpandedBundles([...expandedBundles, bundle.uuid]);
      }
    } catch (error: any) {
      console.error("Error al cargar skins del bundle:", error);
      setCreateError("Error al cargar skins del bundle");
    } finally {
      setLoadingBundleUuid(null);
      setPendingSkinLoads((prev: Set<string>) => {
        const next = new Set(prev);
        next.delete(bundle.uuid);
        return next;
      });
    }
  };

  // Función para manejar cambios en el formulario
  const handleCajaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setNuevaCaja(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : (name === "precio" ? parseFloat(value) || 0 : value)
    }));
  };

  // Función para manejar cambios en probabilidades
  const handleProbabilidadChange = (tierId: string, value: number) => {
    setProbabilidades(prev =>
      prev.map(prob =>
        prob.content_tier_id === tierId ? { ...prob, probabilidad: value } : prob
      )
    );
  };

  // Toggle selección de skin
  const toggleSkinSelection = (skin: Skin) => {
    if (selectedSkins.some(s => s.id === skin.id)) {
      setSelectedSkins(selectedSkins.filter(s => s.id !== skin.id));
    } else {
      setSelectedSkins([...selectedSkins, skin]);
    }
  };

  // Sincronizar cantidad_skins según skins seleccionadas
  useEffect(() => {
    setProbabilidades(prevProbs =>
      prevProbs.map(prob => {
        const skinsCount = selectedSkins.filter(skin =>
          String(skin.content_tier_id) === String(prob.content_tier?.uuid)
        ).length;
        return { ...prob, cantidad_skins: skinsCount };
      })
    );
  }, [selectedSkins, tiers]);

  // Función para crear la caja
  const createCaja = async () => {
    if (!nuevaCaja.nombre) {
      setCreateError("El nombre de la caja es obligatorio");
      return;
    }

    if (probabilidades.reduce((sum, p) => sum + p.probabilidad, 0) !== 1) {
      setCreateError("La suma de probabilidades debe ser exactamente 1 (100%)");
      return;
    }

    if (selectedSkins.length === 0) {
      setCreateError("Debes seleccionar al menos una skin para la caja");
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    const rutaCaja = `/main/${extraerTipoCaja(nuevaCaja.nombre, nuevaCaja.es_diaria)}`;

    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("No se pudo conectar a la base de datos");

      const { data: allTiersData, error: allTiersError } = await supabase
        .from("content_tiers")
        .select("id, uuid_api");

      if (allTiersError) throw new Error(`Error al obtener tiers: ${allTiersError.message}`);
      
      const uuidApiToSupabaseIdMap = new Map(allTiersData?.map(tier => [tier.uuid_api, tier.id]) || []);

      // Insertar la caja
      const { data: newCajaData, error: insertError } = await supabase
        .from("cajas")
        .insert([{
          nombre: nuevaCaja.nombre,
          precio: nuevaCaja.precio,
          imagen_url: nuevaCaja.imagen_url,
          esta_disponible: nuevaCaja.esta_disponible,
          es_diaria: nuevaCaja.es_diaria,
          ruta: rutaCaja,
          categoria: nuevaCaja.categoria,
          categoria_titulo: nuevaCaja.categoria_titulo,
        }])
        .select()
        .single();

      if (insertError) throw insertError;
      if (!newCajaData) throw new Error("No se pudo crear la caja");
      
      const cajaId = newCajaData.id;

      // Insertar probabilidades
      const probsToInsert = probabilidades
        .filter(prob => prob.probabilidad > 0)
        .map(prob => ({
          caja_id: cajaId,
          content_tier_id: prob.content_tier_id,
          probabilidad: prob.probabilidad,
          cantidad_skins: prob.cantidad_skins,
        }));

      if (probsToInsert.length > 0) {
        const { error: probsError } = await supabase
          .from("tier_probabilidades")
          .insert(probsToInsert);
        if (probsError) throw probsError;
      }

      // Insertar skins
      const skinsToInsert = selectedSkins
        .map(skin => {
          const supabaseTierId = uuidApiToSupabaseIdMap.get(skin.content_tier_id);
          if (!supabaseTierId) return null;
          return {
            caja_id: cajaId,
            skin_id: skin.id,
            content_tier_id: supabaseTierId,
            skin_nombre: skin.nombre,
          };
        })
        .filter(Boolean);

      if (skinsToInsert.length > 0) {
        const { error: skinsError } = await supabase
          .from("cajas_skins")
          .insert(skinsToInsert as any);
        if (skinsError) throw skinsError;
      }

      toast.success(`Caja "${nuevaCaja.nombre}" creada correctamente`);
      
      // Reset formulario
      setNuevaCaja({
        nombre: "",
        precio: 250,
        imagen_url: "/free_cage.png",
        esta_disponible: true,
        es_diaria: false,
        categoria: "premium",
        categoria_titulo: "PREMIUM"
      });
      setProbabilidades(prev => prev.map(p => ({ ...p, probabilidad: 0, cantidad_skins: 0 })));
      setSelectedSkins([]);
      setShowCreateModal(false);
      
      // Recargar datos
      await loadInitialData();
    } catch (error: any) {
      console.error("Error al crear caja:", error);
      setCreateError(`Error al crear caja: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  // Función para inicializar datos de crear caja
  const initializeCreateModal = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const { data: tiersData, error: tiersError } = await supabase
        .from("content_tiers")
        .select("*");

      if (tiersError) throw tiersError;

      setTiers(tiersData || []);
      
      if (tiersData && tiersData.length > 0) {
        const initialProbs = tiersData.map(tier => ({
          caja_id: "",
          content_tier_id: String(tier.id),
          probabilidad: 0,
          cantidad_skins: 0,
          content_tier: {
            id: String(tier.uuid_api),
            nombre: String(tier.nombre || "Sin nombre"),
            uuid: String(tier.uuid_api),
            color: String(tier.color || "#FFFFFF"),
          },
        }));
        setProbabilidades(initialProbs as TierProbabilidad[]);
      }
      
      await loadBundles();
    } catch (error) {
      console.error("Error al inicializar modal:", error);
      setCreateError("Error al cargar datos para crear caja");
    }
  };

  // Filtrar bundles
  const filteredBundles = bundles.filter(bundle =>
    bundle.displayName.toLowerCase().includes(bundleSearchTerm.toLowerCase())
  );

  // Función para filtrar skins dentro de un bundle
  const getFilteredSkinsForBundle = (bundleUuid: string): Skin[] => {
    const bundleSkins = skinsByBundle[bundleUuid] || [];
    if (!skinSearchTerm) return bundleSkins;
    
    return bundleSkins.filter(skin =>
      skin?.nombre?.toLowerCase().includes(skinSearchTerm.toLowerCase())
    );
  };

  // Función para ver detalles de una caja
  const viewCaja = async (caja: Caja) => {
    setSelectedCajaForView(caja);
    setShowViewModal(true);
  };

  // Función para editar una caja
  const editCaja = async (caja: Caja) => {
    setSelectedCajaForEdit(caja);
    setEditingCaja({ ...caja });
    setIsLoadingEditData(true);
    setShowEditModal(true);
    
    try {
      await Promise.all([
        loadEditProbabilidades(caja.id),
        loadEditSkins(caja.id),
        loadBundlesForEdit()
      ]);
    } catch (error) {
      console.error("Error al cargar datos de edición:", error);
      toast.error("Error al cargar datos de la caja");
    } finally {
      setIsLoadingEditData(false);
    }
  };

  // Función para cargar probabilidades existentes de la caja
  const loadEditProbabilidades = async (cajaId: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      // Cargar todas las probabilidades existentes de la caja
      const { data: existingProbs, error: probsError } = await supabase
        .from("tier_probabilidades")
        .select(`
          *,
          content_tiers(*)
        `)
        .eq("caja_id", cajaId);

      if (probsError) throw probsError;

      // Cargar todos los tiers disponibles
      const { data: allTiers, error: tiersError } = await supabase
        .from("content_tiers")
        .select("*");

      if (tiersError) throw tiersError;

      // Crear array de probabilidades con todos los tiers
      const probsArray = (allTiers || []).map(tier => {
        const existingProb = existingProbs?.find(p => p.content_tier_id === tier.id);
        return {
          caja_id: cajaId,
          content_tier_id: String(tier.id),
          probabilidad: existingProb?.probabilidad || 0,
          cantidad_skins: existingProb?.cantidad_skins || 0,
          content_tier: {
            id: String(tier.uuid_api),
            nombre: String(tier.nombre || "Sin nombre"),
            uuid: String(tier.uuid_api),
            color: String(tier.color || "#FFFFFF"),
          },
        } as TierProbabilidad;
      });

      setEditProbabilidades(probsArray);
    } catch (error) {
      console.error("Error al cargar probabilidades:", error);
    }
  };

  // Función para cargar skins existentes de la caja
  const loadEditSkins = async (cajaId: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const { data: existingSkins, error: skinsError } = await supabase
        .from("cajas_skins")
        .select(`
          skin_id,
          skin_nombre,
          content_tier_id,
          content_tiers!inner(*)
        `)
        .eq("caja_id", cajaId);

      if (skinsError) throw skinsError;

      if (existingSkins && existingSkins.length > 0) {
        // Obtener todas las skins de la API de Valorant para obtener las URLs reales
        const allValorantSkins = await getWeaponSkins();
        
        // Convertir a formato Skin con URLs reales
        const formattedSkins: Skin[] = existingSkins.map(skin => {
          // Buscar la skin correspondiente en la API de Valorant
          const valorantSkin = allValorantSkins.find(vSkin => vSkin.uuid === skin.skin_id);
          
          // Si encontramos la skin en la API, usar formatSkinForApp para obtener la URL real
          if (valorantSkin && valorantSkin.contentTierUuid === (skin.content_tiers as any)?.uuid_api) {
            const tierData = {
              nombre: String((skin.content_tiers as any)?.nombre || ""),
              color: String((skin.content_tiers as any)?.color || "#FFFFFF"),
              grado: Number((skin.content_tiers as any)?.grado || 0),
            };
            
            return formatSkinForApp(valorantSkin, tierData);
          }
          
          // Fallback: usar los datos de la base de datos con URL por defecto
          return {
            id: String(skin.skin_id),
            uuid: String(skin.skin_id),
            nombre: String(skin.skin_nombre),
            imagen_url: `/skins/${skin.skin_id}.png`, // Mantener como fallback
            content_tier_id: (skin.content_tiers as any)?.uuid_api || "",
            content_tier: {
              id: String((skin.content_tiers as any)?.uuid_api || ""),
              nombre: String((skin.content_tiers as any)?.nombre || ""),
              color: String((skin.content_tiers as any)?.color || "#FFFFFF"),
              uuid_api: String((skin.content_tiers as any)?.uuid_api || ""),
            }
          };
        });

        setEditSelectedSkins(formattedSkins);
      } else {
        setEditSelectedSkins([]);
      }
    } catch (error) {
      console.error("Error al cargar skins:", error);
    }
  };

  // Función para cargar bundles en modo edición
  const loadBundlesForEdit = async () => {
    if (bundles.length === 0) {
      await loadBundles();
    }
  };

  // Función para manejar cambios en probabilidades de edición
  const handleEditProbabilidadChange = (tierId: string, value: number) => {
    setEditProbabilidades(prev =>
      prev.map(prob =>
        prob.content_tier_id === tierId ? { ...prob, probabilidad: value } : prob
      )
    );
  };

  // Toggle selección de skin en edición
  const toggleEditSkinSelection = (skin: Skin) => {
    if (editSelectedSkins.some(s => s.id === skin.id)) {
      setEditSelectedSkins(editSelectedSkins.filter(s => s.id !== skin.id));
    } else {
      setEditSelectedSkins([...editSelectedSkins, skin]);
    }
  };

  // Sincronizar cantidad_skins según skins seleccionadas en edición
  useEffect(() => {
    setEditProbabilidades(prevProbs =>
      prevProbs.map(prob => {
        const skinsCount = editSelectedSkins.filter(skin =>
          String(skin.content_tier_id) === String(prob.content_tier?.uuid)
        ).length;
        return { ...prob, cantidad_skins: skinsCount };
      })
    );
  }, [editSelectedSkins]);

  // Función para cargar skins de un bundle en modo edición
  const loadSkinsForBundleEdit = async (bundle: Bundle) => {
    const hasFormattedSkins = skinsByBundle[bundle.uuid] && 
                              skinsByBundle[bundle.uuid].length > 0 && 
                              skinsByBundle[bundle.uuid][0].content_tier_id;

    if (hasFormattedSkins) {
      if (editExpandedBundles.includes(bundle.uuid)) {
        setEditExpandedBundles(editExpandedBundles.filter((id) => id !== bundle.uuid));
      } else {
        setEditExpandedBundles([...editExpandedBundles, bundle.uuid]);
      }
      return;
    }

    setLoadingBundleUuid(bundle.uuid);
    try {
      const bundleSkins = skinsByBundle[bundle.uuid] || [];
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("No se pudo conectar a la base de datos");

      const { data: allSupabaseTiersData, error: contentTiersError } = await supabase
        .from("content_tiers")
        .select("uuid_api");

      if (contentTiersError) throw new Error("Error al cargar content_tiers");

      const validTierUuidsFromSupabase = new Set(allSupabaseTiersData?.map(t => t.uuid_api) || []);
      const formattedSkins: Skin[] = [];

      for (const skin of bundleSkins) {
        if ("content_tier_id" in skin && skin.content_tier_id) {
          if (validTierUuidsFromSupabase.has(skin.content_tier_id)) {
            formattedSkins.push(skin as Skin);
          }
          continue;
        }

        const valorantApiSkin = skin as unknown as ValorantApiSkin;
        if (valorantApiSkin.contentTierUuid && validTierUuidsFromSupabase.has(valorantApiSkin.contentTierUuid)) {
          const tierDataForFormatting = await getTierData(supabase, valorantApiSkin.contentTierUuid);
          if (tierDataForFormatting) {
            const formattedSkin = formatSkinForApp(valorantApiSkin, tierDataForFormatting);
            formattedSkins.push(formattedSkin);
          }
        }
      }

      setSkinsByBundle((prev) => ({ ...prev, [bundle.uuid]: formattedSkins }));
      if (!editExpandedBundles.includes(bundle.uuid)) {
        setEditExpandedBundles([...editExpandedBundles, bundle.uuid]);
      }
    } catch (error: any) {
      console.error("Error al cargar skins del bundle:", error);
      toast.error("Error al cargar skins del bundle");
    } finally {
      setLoadingBundleUuid(null);
      setEditPendingSkinLoads((prev: Set<string>) => {
        const next = new Set(prev);
        next.delete(bundle.uuid);
        return next;
      });
    }
  };

  // Función para expandir/contraer todos los bundles en edición
  const toggleAllBundlesEdit = () => {
    const filteredBundlesEdit = bundles.filter(bundle =>
      bundle.displayName.toLowerCase().includes(editBundleSearchTerm.toLowerCase())
    );
    const allFilteredBundleIds = filteredBundlesEdit.map(b => b.uuid);
    const areAllCurrentlyVisibleExpanded = allFilteredBundleIds.length > 0 && 
      allFilteredBundleIds.every(id => editExpandedBundles.includes(id));

    if (areAllCurrentlyVisibleExpanded) {
      setEditExpandedBundles(prev => prev.filter(id => !allFilteredBundleIds.includes(id)));
    } else {
      const bundlesToExpandIds = filteredBundlesEdit
        .filter(b => !editExpandedBundles.includes(b.uuid))
        .map(b => b.uuid);
      setEditExpandedBundles(prev => Array.from(new Set([...prev, ...bundlesToExpandIds])));
    }
  };

  // Función para filtrar skins dentro de un bundle en edición
  const getFilteredSkinsForBundleEdit = (bundleUuid: string): Skin[] => {
    const bundleSkins = skinsByBundle[bundleUuid] || [];
    if (!editSkinSearchTerm) return bundleSkins;
    
    return bundleSkins.filter(skin =>
      skin?.nombre?.toLowerCase().includes(editSkinSearchTerm.toLowerCase())
    );
  };

  // Función para guardar cambios de edición
  const saveEditChanges = async () => {
    if (!editingCaja) return;

    if (editProbabilidades.reduce((sum, p) => sum + p.probabilidad, 0) !== 1) {
      toast.error("La suma de probabilidades debe ser exactamente 1 (100%)");
      return;
    }

    if (editSelectedSkins.length === 0) {
      toast.error("Debes tener al menos una skin en la caja");
      return;
    }

    setIsUpdating(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("No se pudo conectar a la base de datos");

      // 1. Actualizar información básica de la caja
      const { error: updateError } = await supabase
        .from("cajas")
        .update({
          nombre: editingCaja.nombre,
          precio: editingCaja.precio,
          imagen_url: editingCaja.imagen_url,
          esta_disponible: editingCaja.esta_disponible,
          es_diaria: editingCaja.es_diaria,
          categoria: editingCaja.categoria,
          categoria_titulo: editingCaja.categoria_titulo,
        })
        .eq("id", editingCaja.id);

      if (updateError) throw updateError;

      // 2. Eliminar probabilidades existentes
      const { error: deleteProbsError } = await supabase
        .from("tier_probabilidades")
        .delete()
        .eq("caja_id", editingCaja.id);

      if (deleteProbsError) throw deleteProbsError;

      // 3. Insertar nuevas probabilidades
      const probsToInsert = editProbabilidades
        .filter(prob => prob.probabilidad > 0)
        .map(prob => ({
          caja_id: editingCaja.id,
          content_tier_id: prob.content_tier_id,
          probabilidad: prob.probabilidad,
          cantidad_skins: prob.cantidad_skins,
        }));

      if (probsToInsert.length > 0) {
        const { error: insertProbsError } = await supabase
          .from("tier_probabilidades")
          .insert(probsToInsert);
        if (insertProbsError) throw insertProbsError;
      }

      // 4. Eliminar skins existentes
      const { error: deleteSkinsError } = await supabase
        .from("cajas_skins")
        .delete()
        .eq("caja_id", editingCaja.id);

      if (deleteSkinsError) throw deleteSkinsError;

      // 5. Obtener mapeo de tier UUIDs a IDs de Supabase
      const { data: allTiersData, error: allTiersError } = await supabase
        .from("content_tiers")
        .select("id, uuid_api");

      if (allTiersError) throw allTiersError;
      
      const uuidApiToSupabaseIdMap = new Map(allTiersData?.map(tier => [tier.uuid_api, tier.id]) || []);

      // 6. Insertar nuevas skins
      const skinsToInsert = editSelectedSkins
        .map(skin => {
          const supabaseTierId = uuidApiToSupabaseIdMap.get(skin.content_tier_id);
          if (!supabaseTierId) return null;
          return {
            caja_id: editingCaja.id,
            skin_id: skin.id,
            content_tier_id: supabaseTierId,
            skin_nombre: skin.nombre,
          };
        })
        .filter(Boolean);

      if (skinsToInsert.length > 0) {
        const { error: insertSkinsError } = await supabase
          .from("cajas_skins")
          .insert(skinsToInsert as any);
        if (insertSkinsError) throw insertSkinsError;
      }

      toast.success("Caja actualizada correctamente");
      setShowEditModal(false);
      setEditingCaja(null);
      setSelectedCajaForEdit(null);
      
      // Reset estados de edición
      setEditProbabilidades([]);
      setEditSelectedSkins([]);
      setEditExpandedBundles([]);
      setEditBundleSearchTerm("");
      setEditSkinSearchTerm("");
      
      // Recargar datos
      await loadInitialData();
    } catch (error: any) {
      console.error("Error al actualizar caja:", error);
      toast.error(`Error al actualizar caja: ${error.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // Función para manejar cambios en la edición
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingCaja) return;
    const { name, value, type, checked } = e.target;
    setEditingCaja(prev => prev ? {
      ...prev,
      [name]: type === "checkbox" ? checked : (name === "precio" ? parseFloat(value) || 0 : value)
    } : null);
  };

  // Función para expandir/contraer todos los bundles
  const toggleAllBundles = () => {
    const allFilteredBundleIds = filteredBundles.map(b => b.uuid);
    const areAllCurrentlyVisibleExpanded = allFilteredBundleIds.length > 0 && 
      allFilteredBundleIds.every(id => expandedBundles.includes(id));

    if (areAllCurrentlyVisibleExpanded) {
      setExpandedBundles(prev => prev.filter(id => !allFilteredBundleIds.includes(id)));
    } else {
      const bundlesToExpandIds = filteredBundles
        .filter(b => !expandedBundles.includes(b.uuid))
        .map(b => b.uuid);
      setExpandedBundles(prev => Array.from(new Set([...prev, ...bundlesToExpandIds])));
      // La carga de skins se manejará en un useEffect
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/10">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-xl bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30">
                  <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white font-[Raleway] italic tracking-wider">
                    / PANEL DE ADMINISTRACIÓN
                  </h1>
                  <p className="text-xs sm:text-sm text-white/60">Gestión y control del sistema</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              <Link href="/main">
                <Button variant="default" className="rounded-xl bg-gradient-to-r from-red-500/20 to-red-600/20 text-white shadow-lg shadow-red-900/20 border border-red-500/20 hover:bg-gradient-to-r hover:from-red-500/30 hover:to-red-600/30 active:scale-95 transition-all duration-200 text-xs sm:text-sm px-2 sm:px-4 py-2">
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rotate-180" />
                <span className="hidden sm:inline">Volver al Inicio</span>
                <span className="sm:hidden">Inicio</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Navigation Tabs */}
          <div className="mb-6 sm:mb-8">
            <TabsList className="grid w-full grid-cols-3 bg-backgroundAlt/20 backdrop-blur-xl border border-white/10 rounded-2xl px-1 py-0">
              <TabsTrigger value="dashboard" className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-primary/20 data-[state=active]:border-primary/30 rounded-xl text-xs sm:text-sm">
                <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Dashboard</span>
                <span className="sm:hidden">Stats</span>
              </TabsTrigger>
              <TabsTrigger value="boxes" className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-primary/20 data-[state=active]:border-primary/30 rounded-xl text-xs sm:text-sm">
                <Package className="h-3 w-3 sm:h-4 sm:w-4" />
                Cajas
              </TabsTrigger>
              <TabsTrigger value="skins" className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-primary/20 data-[state=active]:border-primary/30 rounded-xl text-xs sm:text-sm">
                <Layers className="h-3 w-3 sm:h-4 sm:w-4" />
                Skins
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-4 sm:space-y-6">
            {/* Stats Grid Principal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <StatCard
                title="Total Usuarios"
                value={stats.totalUsers.toLocaleString()}
                subtitle={`${stats.usuariosOAuth} con OAuth`}
                icon={Users}
                color="primary"
              />
              <StatCard
                title="Cajas Abiertas"
                value={stats.totalBoxesOpened.toLocaleString()}
                subtitle={`${stats.totalBoxes} cajas disponibles`}
                icon={Package}
                color="green-500"
              />
              <StatCard
                title="Skins Obtenidas"
                value={stats.totalSkinsObtenidas.toLocaleString()}
                subtitle={`Promedio: ${stats.promedioSkinsUsuario}/usuario`}
                icon={Layers}
                color="blue-500"
              />
              <StatCard
                title="VP Gastado"
                value={stats.vpTotalGastado.toLocaleString()}
                subtitle={`${stats.vpTotalGanado.toLocaleString()} VP ganados`}
                icon={DollarSign}
                color="purple-500"
              />
            </div>

            {/* Stats Grid Actividad */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <StatCard
                title="Usuarios Activos Hoy"
                value={stats.usuariosActivosHoy}
                subtitle="Últimas 24 horas"
                icon={Activity}
                color="green-500"
              />
              <StatCard
                title="Usuarios Activos (7d)"
                value={stats.usuariosActivosSemana}
                subtitle="Última semana"
                icon={TrendingUp}
                color="blue-500"
              />
              <StatCard
                title="Mejoras Exitosas"
                value={stats.totalMejorasExitosas}
                subtitle={`${stats.tasaExitoMejoras}% tasa de éxito`}
                icon={Star}
                color="yellow-500"
              />
              <StatCard
                title="Misiones Completadas"
                value={stats.totalMisionesCompletadas.toLocaleString()}
                subtitle={`${stats.totalSkinsEliminadas.toLocaleString()} skins eliminadas`}
                icon={CheckCircle}
                color="orange-500"
              />
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
              {/* Cajas Más Populares */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white text-base sm:text-lg">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    Cajas Más Populares
                  </CardTitle>
                  <CardDescription className="text-white/60">Basado en aperturas reales</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 sm:space-y-4">
                    {cajasPopulares.slice(0, 5).map((caja, index) => (
                      <div key={caja.id} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-2xl bg-white/5">
                        <div className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary/20 text-primary text-xs font-bold">
                          {index + 1}
                        </div>
                        <div className="w-8 h-8 sm:w-10 sm:h-10 overflow-hidden flex-shrink-0">
                          <Image
                            src={caja.imagen_url}
                            alt={caja.nombre}
                            width={40}
                            height={40}
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium text-white truncate">{caja.nombre}</p>
                          <p className="text-xs text-white/60">{caja.total_aperturas} aperturas</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium text-primary/80">{caja.revenue_generado.toLocaleString()} VP</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Skins Más Obtenidas */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white text-base sm:text-lg">
                    <Star className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    Skins Más Obtenidas
                  </CardTitle>
                  <CardDescription className="text-white/60">Top skins en logs</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 sm:space-y-4">
                    {skinsPopulares.slice(0, 5).map((skin, index) => (
                      <div key={skin.skin_id} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-white/5">
                        <div className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary/20 text-primary text-xs font-bold">
                          {index + 1}
                        </div>
                        <div 
                          className="w-3 h-3 sm:w-4 sm:h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: skin.tier_color }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium text-white truncate">{skin.skin_nombre}</p>
                          <p className="text-xs" style={{ color: skin.tier_color }}>{skin.tier_nombre}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {skin.total_obtenidas}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Resumen de Actividad */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white text-base sm:text-lg">
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    Resumen de Actividad
                  </CardTitle>
                  <CardDescription className="text-white/60">Estadísticas generales del sistema</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="bg-white/5 rounded-2xl p-3 sm:p-4 text-center border border-white/10 hover:border-white/20 transition-all">
                      <div className="text-xl sm:text-2xl font-bold text-white mb-1">{stats.totalIntentosMejora.toLocaleString()}</div>
                      <div className="text-xs sm:text-sm text-white/60">Intentos de Mejora</div>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-3 sm:p-4 text-center border border-white/10 hover:border-green-400/20 transition-all">
                      <div className="text-xl sm:text-2xl font-bold text-white mb-1">{stats.totalMejorasExitosas.toLocaleString()}</div>
                      <div className="text-xs sm:text-sm text-white/60">Mejoras Exitosas</div>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-3 sm:p-4 text-center border border-white/10 hover:border-blue-400/20 transition-all">
                      <div className="text-xl sm:text-2xl font-bold text-white mb-1">{stats.totalSkinsObtenidas.toLocaleString()}</div>
                      <div className="text-xs sm:text-sm text-white/60">Skins Obtenidas</div>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-3 sm:p-4 text-center border border-white/10 hover:border-orange-400/20 transition-all">
                      <div className="text-xl sm:text-2xl font-bold text-white mb-1">{stats.totalMisionesCompletadas.toLocaleString()}</div>
                      <div className="text-xs sm:text-sm text-white/60">Misiones Completadas</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>


          </TabsContent>

          {/* Boxes Tab */}
          <TabsContent value="boxes" className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between">
              <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64 lg:w-80">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-white/50" />
                  <Input
                    placeholder="Buscar cajas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 sm:pl-10 bg-white/5 border-white/20 text-white rounded-2xl text-sm sm:text-base h-9 sm:h-10"
                  />
                </div>
              </div>
              <Button variant="default" className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-red-500/20 to-red-600/20 text-white shadow-lg shadow-red-900/20 border border-red-500/20 hover:bg-gradient-to-r hover:from-red-500/30 hover:to-red-600/30 active:scale-95 transition-all duration-200 text-xs sm:text-sm px-3 sm:px-4 py-2"
                onClick={() => {
                  setShowCreateModal(true);
                  initializeCreateModal();
                }}>
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Nueva Caja
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
              {filteredCajas.map((caja) => (
                <Card key={caja.id} className="overflow-hidden">
                  <div className="relative h-36 sm:h-48 flex items-center justify-center">
                    <Image
                      src={caja.imagen_url}
                      alt={caja.nombre}
                      height={200}
                      width={200}
                      quality={100}
                      className="object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      <Badge variant={caja.esta_disponible ? "default" : "secondary"} className="text-white/90 text-xs">
                        {caja.esta_disponible ? "Disponible" : "No disponible"}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-3 sm:p-4">
                    <div className="space-y-2 sm:space-y-3">
                      <div>
                        <h3 className="font-semibold text-white text-sm sm:text-base truncate">{caja.nombre}</h3>
                        <p className="text-xs sm:text-sm text-white/60">{caja.precio} VP</p>
                        {caja.categoria_titulo && (
                          <p className="text-xs text-white/50 uppercase tracking-wider">{caja.categoria_titulo}</p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1 text-sm">
                        <span className="text-white/60">Skins:</span>
                        <span className="text-white font-medium">
                          {cajaSkins.filter(cs => cs.caja_id === caja.id).length}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                        <Button variant="ghost" size="sm" className="flex-1" onClick={() => editCaja(caja)}>
                          <Edit className="h-4 w-4" />
                          Editar
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => toggleBoxStatus(caja.id, caja.esta_disponible)}
                        >
                          {caja.esta_disponible ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Skins Tab */}
          <TabsContent value="skins" className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-80">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                  <Input
                    placeholder="Buscar skins..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/5 border-white/20 text-white rounded-2xl"
                  />
                </div>
              </div>
              
            </div>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-white/10">
                      <tr className="text-left">
                        <th className="p-4 text-sm font-medium text-white/70">Skin</th>
                        <th className="p-4 text-sm font-medium text-white/70">Caja</th>
                        <th className="p-4 text-sm font-medium text-white/70">Tier</th>
                        <th className="p-4 text-sm font-medium text-white/70">ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCajaSkins.map((skin) => {
                        const tier = contentTiers.find(t => t.id === skin.content_tier_id);
                        const caja = cajas.find(c => c.id === skin.caja_id);
                        
                        return (
                          <tr key={skin.id} className="border-b border-white/5 hover:bg-white/5">
                            <td className="p-4">
                              <div>
                                <p className="text-sm font-medium text-white">{skin.skin_nombre}</p>
                                <p className="text-xs text-white/50">{skin.skin_id}</p>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="text-sm text-white/80">{caja?.nombre || 'N/A'}</span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: tier?.color || '#666' }}
                                />
                                <span className="text-sm text-white/80">{tier?.nombre || 'N/A'}</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="text-xs text-white/50 font-mono">{skin.skin_id.slice(0, 8)}...</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal de crear caja */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-background border border-white/10 rounded-2xl backdrop-blur-xl 
                         shadow-[0_0_45px_-5px_rgba(0,0,0,0.3)] transition-all duration-300 
                         hover:shadow-[0_0_55px_-5px_rgba(0,0,0,0.4)] p-4 sm:p-6 w-full max-w-7xl max-h-[95vh] 
                         overflow-y-auto custom-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-white">Nueva Caja</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {createError && (
                <div className="mb-4 p-3 sm:p-4 bg-red-500/20 border border-red-500/40 rounded-lg text-red-400 text-sm">
                  {createError}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Información de la caja */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-white text-base sm:text-lg">Información de la Caja</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4">
                    <div>
                      <Label htmlFor="nombre" className="text-white text-sm">Nombre</Label>
                      <Input
                        id="nombre"
                        name="nombre"
                        value={nuevaCaja.nombre}
                        onChange={handleCajaChange}
                        className="bg-white/5 border-white/20 text-white text-sm sm:text-base h-9 sm:h-10"
                        placeholder="Ej: Caja Premium"
                      />
                    </div>
                    <div>
                      <Label htmlFor="precio" className="text-white text-sm">Precio (VP)</Label>
                      <Input
                        id="precio"
                        name="precio"
                        type="number"
                        value={nuevaCaja.precio}
                        onChange={handleCajaChange}
                        className="bg-white/5 border-white/20 text-white text-sm sm:text-base h-9 sm:h-10"
                      />
                    </div>
                    <div>
                      <Label htmlFor="imagen_url" className="text-white text-sm">URL de imagen</Label>
                      <Input
                        id="imagen_url"
                        name="imagen_url"
                        value={nuevaCaja.imagen_url}
                        onChange={handleCajaChange}
                        className="bg-white/5 border-white/20 text-white text-sm sm:text-base h-9 sm:h-10"
                      />
                    </div>
                    <div>
                      <Label htmlFor="categoria" className="text-white text-sm">Categoría</Label>
                      <Input
                        id="categoria"
                        name="categoria"
                        value={nuevaCaja.categoria}
                        onChange={handleCajaChange}
                        className="bg-white/5 border-white/20 text-white text-sm sm:text-base h-9 sm:h-10"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="esta_disponible"
                        name="esta_disponible"
                        checked={nuevaCaja.esta_disponible}
                        onChange={handleCajaChange}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="esta_disponible" className="text-white text-sm">Disponible</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="es_diaria"
                        name="es_diaria"
                        checked={nuevaCaja.es_diaria}
                        onChange={handleCajaChange}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="es_diaria" className="text-white text-sm">Es caja diaria</Label>
                    </div>
                  </CardContent>
                </Card>

                {/* Probabilidades */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-white text-base sm:text-lg">Probabilidades por Tier</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 sm:space-y-4">
                      {probabilidades.map((prob) => (
                        <div key={prob.content_tier_id} className="grid grid-cols-5 sm:grid-cols-7 gap-2 items-center">
                          <div className="col-span-2 sm:col-span-3 flex items-center">
                            <div
                              className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                              style={{ backgroundColor: prob.content_tier?.color || "#fff" }}
                            />
                            <span className="text-white text-xs sm:text-sm truncate">{prob.content_tier?.nombre}</span>
                          </div>
                          <div className="col-span-2">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="1"
                              value={prob.probabilidad}
                              onChange={(e) => handleProbabilidadChange(prob.content_tier_id, parseFloat(e.target.value))}
                              disabled={prob.cantidad_skins === 0}
                              className="bg-white/5 border-white/20 text-white text-xs sm:text-sm h-8 sm:h-9"
                            />
                          </div>
                          <div className="col-span-1 sm:col-span-2 text-xs text-white/80 text-center">
                            {prob.cantidad_skins} skin{prob.cantidad_skins === 1 ? "" : "s"}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between mt-3 sm:mt-4 pt-2 border-t border-white/10">
                      <span className="text-white text-sm">Total:</span>
                      <span className={
                        Math.abs(probabilidades.reduce((sum, p) => sum + p.probabilidad, 0) - 1) < 0.001
                          ? "text-green-400"
                          : "text-red-400"
                      }>
                        {(probabilidades.reduce((sum, p) => sum + p.probabilidad, 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Selección de Skins */}
              <Card className="mt-4 sm:mt-6">
                <CardHeader>
                  <CardTitle className="text-white text-base sm:text-lg">Selección de Skins</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
                    <Input
                      placeholder="Buscar bundles..."
                      value={bundleSearchTerm}
                      onChange={(e) => setBundleSearchTerm(e.target.value)}
                      className="max-w-full sm:max-w-md bg-white/5 border-white/20 text-white text-sm sm:text-base h-9 sm:h-10"
                    />
                    <Input
                      placeholder="Buscar skins/armas..."
                      value={skinSearchTerm}
                      onChange={(e) => setSkinSearchTerm(e.target.value)}
                      className="max-w-full sm:max-w-md bg-white/5 border-white/20 text-white text-sm sm:text-base h-9 sm:h-10"
                    />
                    {bundles.length > 0 && (
                      <Button variant="outline" onClick={toggleAllBundles} className="w-full sm:w-auto text-xs sm:text-sm">
                        {filteredBundles.length > 0 && filteredBundles.every(b => expandedBundles.includes(b.uuid)) 
                          ? "Contraer Todos" 
                          : "Expandir Todos"}
                      </Button>
                    )}
                    <div className="ml-auto text-white/70 text-sm">
                      {selectedSkins.length} skins seleccionadas
                    </div>
                  </div>

                  {isLoadingBundles ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
                    </div>
                  ) : (
                    <div className="max-h-80 sm:max-h-96 overflow-y-auto custom-scrollbar">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                        {filteredBundles.map((bundle) => (
                          <div key={bundle.uuid} className="mb-2">
                            <div
                              className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-white/5 border border-white/10 hover:border-primary/40"
                              onClick={() => loadSkinsForBundle(bundle)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  loadSkinsForBundle(bundle);
                                }
                              }}
                            >
                              <Image
                                src={bundle.displayIcon}
                                alt={bundle.displayName}
                                width={24}
                                height={24}
                                className="rounded flex-shrink-0 sm:w-8 sm:h-8"
                              />
                              <div className="flex-1 min-w-0">
                                <h3 className="text-xs sm:text-sm font-medium text-white truncate">{bundle.displayName}</h3>
                                <p className="text-xs text-white/60">
                                  {getFilteredSkinsForBundle(bundle.uuid).length} skins
                                  {skinSearchTerm && (
                                    <span className="text-white/40">
                                      {' '}de {skinsByBundle[bundle.uuid]?.length || 0}
                                    </span>
                                  )}
                                </p>
                              </div>
                              <div className={`transition-transform ${expandedBundles.includes(bundle.uuid) ? "rotate-90" : ""}`}>
                                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-white/60" />
                              </div>
                            </div>

                            {expandedBundles.includes(bundle.uuid) && (
                              <div className="mt-2 p-2 bg-black/20 rounded-lg border border-white/5">
                                {loadingBundleUuid === bundle.uuid ? (
                                  <div className="text-center py-4">
                                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary mx-auto" />
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {getFilteredSkinsForBundle(bundle.uuid).length > 0 ? (
                                      getFilteredSkinsForBundle(bundle.uuid).map((skin) => (
                                        <div
                                          key={skin.id}
                                          className={`p-2 rounded cursor-pointer transition-all ${
                                            selectedSkins.some(s => s.id === skin.id)
                                              ? "bg-primary/20 border border-primary/70"
                                              : "bg-black/20 border border-white/10 hover:bg-black/40"
                                          }`}
                                          onClick={() => toggleSkinSelection(skin)}
                                          role="button"
                                          tabIndex={0}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                              e.preventDefault();
                                              toggleSkinSelection(skin);
                                            }
                                          }}
                                          aria-pressed={selectedSkins.some(s => s.id === skin.id)}
                                          aria-label={`${selectedSkins.some(s => s.id === skin.id) ? 'Deseleccionar' : 'Seleccionar'} skin ${skin.nombre}`}
                                        >
                                          <div className="aspect-square mb-1 bg-black/30 rounded overflow-hidden">
                                            {skin.imagen_url && (
                                              <Image
                                                src={skin.imagen_url}
                                                alt={skin.nombre}
                                                width={60}
                                                height={60}
                                                quality={100}
                                                className="object-contain w-full h-full"
                                              />
                                            )}
                                          </div>
                                          <p className="text-xs text-white truncate" style={{ color: skin.content_tier?.color || "white" }}>
                                            {skin.nombre}
                                          </p>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="col-span-2 sm:col-span-3 text-center py-4 text-white/60 text-sm">
                                        {skinSearchTerm ? `No hay skins que coincidan con "${skinSearchTerm}"` : 'No hay skins disponibles'}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Skins Seleccionadas */}
              {selectedSkins.length > 0 && (
                <Card className="mt-4 sm:mt-6">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center justify-between text-base sm:text-lg">
                      Skins Seleccionadas
                      <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/40 text-xs">
                        {selectedSkins.length} skins
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 max-h-60 sm:max-h-80 overflow-y-auto">
                      {selectedSkins.map((skin) => (
                        <div
                          key={skin.id}
                          className="relative p-2 rounded-lg bg-black/20 border border-white/10 hover:border-primary/40 transition-all group"
                        >
                          <button
                            onClick={() => toggleSkinSelection(skin)}
                            className="absolute top-1 right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-red-500/80 hover:bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            title="Quitar skin"
                          >
                            ×
                          </button>
                          <div className="aspect-square mb-2 bg-black/30 rounded overflow-hidden">
                            {skin.imagen_url && (
                              <Image
                                src={skin.imagen_url}
                                alt={skin.nombre}
                                width={60}
                                height={60}
                                quality={100}
                                className="object-contain w-full h-full"
                              />
                            )}
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-white truncate font-medium" title={skin.nombre}>
                              {skin.nombre}
                            </p>
                            <p 
                              className="text-xs font-semibold truncate" 
                              style={{ color: skin.content_tier?.color || "#fff" }}
                              title={skin.content_tier?.nombre}
                            >
                              {skin.content_tier?.nombre}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {selectedSkins.length > 12 && (
                      <div className="mt-3 text-center">
                        <p className="text-xs text-white/60">
                          Desplázate para ver más skins seleccionadas
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Botones de acción */}
              <div className="flex justify-end gap-2 mt-6">
                <Button 
                  variant="secondary"
                  className="!text-white/70 hover:!bg-white/10 active:!bg-white/20 transition-all duration-200 
                             rounded-xl border border-transparent hover:border-white/10 active:scale-95 bg-transparent"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={createCaja} 
                  variant="default"
                  disabled={isCreating}
                  className="rounded-xl bg-gradient-to-r from-red-500/20 to-red-600/20 text-white shadow-lg 
                             shadow-red-900/20 border border-red-500/20 hover:bg-gradient-to-r hover:from-red-500/30 
                             hover:to-red-600/30 active:scale-95 transition-all duration-200"
                >
                  {isCreating ? "Creando..." : "Crear Caja"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de editar caja */}
      <AnimatePresence>
        {showEditModal && editingCaja && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-background border border-white/10 rounded-2xl backdrop-blur-xl 
                         shadow-[0_0_45px_-5px_rgba(0,0,0,0.3)] transition-all duration-300 
                         hover:shadow-[0_0_55px_-5px_rgba(0,0,0,0.4)] p-4 sm:p-6 w-full max-w-7xl max-h-[95vh] 
                         overflow-y-auto custom-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-white">Editar Caja</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowEditModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {isLoadingEditData ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {/* Información de la caja */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-white text-base sm:text-lg">Información de la Caja</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 sm:space-y-4">
                        <div>
                          <Label htmlFor="edit-nombre" className="text-white text-sm">Nombre</Label>
                          <Input
                            id="edit-nombre"
                            name="nombre"
                            value={editingCaja.nombre}
                            onChange={handleEditChange}
                            className="bg-white/5 border-white/20 text-white text-sm sm:text-base h-9 sm:h-10"
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-precio" className="text-white text-sm">Precio (VP)</Label>
                          <Input
                            id="edit-precio"
                            name="precio"
                            type="number"
                            value={editingCaja.precio}
                            onChange={handleEditChange}
                            className="bg-white/5 border-white/20 text-white text-sm sm:text-base h-9 sm:h-10"
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-imagen_url" className="text-white text-sm">URL de imagen</Label>
                          <Input
                            id="edit-imagen_url"
                            name="imagen_url"
                            value={editingCaja.imagen_url}
                            onChange={handleEditChange}
                            className="bg-white/5 border-white/20 text-white text-sm sm:text-base h-9 sm:h-10"
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-categoria" className="text-white text-sm">Categoría</Label>
                          <Input
                            id="edit-categoria"
                            name="categoria"
                            value={editingCaja.categoria || ""}
                            onChange={handleEditChange}
                            className="bg-white/5 border-white/20 text-white text-sm sm:text-base h-9 sm:h-10"
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-categoria_titulo" className="text-white text-sm">Título de categoría</Label>
                          <Input
                            id="edit-categoria_titulo"
                            name="categoria_titulo"
                            value={editingCaja.categoria_titulo || ""}
                            onChange={handleEditChange}
                            className="bg-white/5 border-white/20 text-white text-sm sm:text-base h-9 sm:h-10"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="edit-esta_disponible"
                            name="esta_disponible"
                            checked={editingCaja.esta_disponible}
                            onChange={handleEditChange}
                            className="w-4 h-4"
                          />
                          <Label htmlFor="edit-esta_disponible" className="text-white text-sm">Disponible</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="edit-es_diaria"
                            name="es_diaria"
                            checked={editingCaja.es_diaria}
                            onChange={handleEditChange}
                            className="w-4 h-4"
                          />
                          <Label htmlFor="edit-es_diaria" className="text-white text-sm">Es caja diaria</Label>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Probabilidades */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-white text-base sm:text-lg">Probabilidades por Tier</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3 sm:space-y-4">
                          {editProbabilidades.map((prob) => (
                            <div key={prob.content_tier_id} className="grid grid-cols-5 sm:grid-cols-7 gap-2 items-center">
                              <div className="col-span-2 sm:col-span-3 flex items-center">
                                <div
                                  className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                                  style={{ backgroundColor: prob.content_tier?.color || "#fff" }}
                                />
                                <span className="text-white text-xs sm:text-sm truncate">{prob.content_tier?.nombre}</span>
                              </div>
                              <div className="col-span-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="1"
                                  value={prob.probabilidad}
                                  onChange={(e) => handleEditProbabilidadChange(prob.content_tier_id, parseFloat(e.target.value))}
                                  disabled={prob.cantidad_skins === 0}
                                  className="bg-white/5 border-white/20 text-white text-xs sm:text-sm h-8 sm:h-9"
                                />
                              </div>
                              <div className="col-span-1 sm:col-span-2 text-xs text-white/80 text-center">
                                {prob.cantidad_skins} skin{prob.cantidad_skins === 1 ? "" : "s"}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between mt-3 sm:mt-4 pt-2 border-t border-white/10">
                          <span className="text-white text-sm">Total:</span>
                          <span className={
                            Math.abs(editProbabilidades.reduce((sum, p) => sum + p.probabilidad, 0) - 1) < 0.001
                              ? "text-green-400"
                              : "text-red-400"
                          }>
                            {(editProbabilidades.reduce((sum, p) => sum + p.probabilidad, 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Selección de Skins */}
                  <Card className="mt-4 sm:mt-6">
                    <CardHeader>
                      <CardTitle className="text-white text-base sm:text-lg">Selección de Skins</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
                        <Input
                          placeholder="Buscar bundles..."
                          value={editBundleSearchTerm}
                          onChange={(e) => setEditBundleSearchTerm(e.target.value)}
                          className="max-w-full sm:max-w-md bg-white/5 border-white/20 text-white text-sm sm:text-base h-9 sm:h-10"
                        />
                        <Input
                          placeholder="Buscar skins/armas..."
                          value={editSkinSearchTerm}
                          onChange={(e) => setEditSkinSearchTerm(e.target.value)}
                          className="max-w-full sm:max-w-md bg-white/5 border-white/20 text-white text-sm sm:text-base h-9 sm:h-10"
                        />
                        {bundles.length > 0 && (
                          <Button variant="outline" onClick={toggleAllBundlesEdit} className="w-full sm:w-auto text-xs sm:text-sm">
                            {bundles.filter(bundle =>
                              bundle.displayName.toLowerCase().includes(editBundleSearchTerm.toLowerCase())
                            ).length > 0 && bundles.filter(bundle =>
                              bundle.displayName.toLowerCase().includes(editBundleSearchTerm.toLowerCase())
                            ).every(b => editExpandedBundles.includes(b.uuid)) 
                              ? "Contraer Todos" 
                              : "Expandir Todos"}
                          </Button>
                        )}
                        <div className="ml-auto text-white/70 text-sm">
                          {editSelectedSkins.length} skins seleccionadas
                        </div>
                      </div>

                      <div className="max-h-80 sm:max-h-96 overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                          {bundles.filter(bundle =>
                            bundle.displayName.toLowerCase().includes(editBundleSearchTerm.toLowerCase())
                          ).map((bundle) => (
                            <div key={bundle.uuid} className="mb-2">
                              <div
                                className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-white/5 border border-white/10 hover:border-primary/40"
                                onClick={() => loadSkinsForBundleEdit(bundle)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    loadSkinsForBundleEdit(bundle);
                                  }
                                }}
                              >
                                <Image
                                  src={bundle.displayIcon}
                                  alt={bundle.displayName}
                                  width={24}
                                  height={24}
                                  className="rounded flex-shrink-0 sm:w-8 sm:h-8"
                                />
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-xs sm:text-sm font-medium text-white truncate">{bundle.displayName}</h3>
                                  <p className="text-xs text-white/60">
                                    {getFilteredSkinsForBundleEdit(bundle.uuid).length} skins
                                    {editSkinSearchTerm && (
                                      <span className="text-white/40">
                                        {' '}de {skinsByBundle[bundle.uuid]?.length || 0}
                                      </span>
                                    )}
                                  </p>
                                </div>
                                <div className={`transition-transform ${editExpandedBundles.includes(bundle.uuid) ? "rotate-90" : ""}`}>
                                  <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-white/60" />
                                </div>
                              </div>

                              {editExpandedBundles.includes(bundle.uuid) && (
                                <div className="mt-2 p-2 bg-black/20 rounded-lg border border-white/5">
                                  {loadingBundleUuid === bundle.uuid ? (
                                    <div className="text-center py-4">
                                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary mx-auto" />
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                      {getFilteredSkinsForBundleEdit(bundle.uuid).length > 0 ? (
                                        getFilteredSkinsForBundleEdit(bundle.uuid).map((skin) => (
                                          <div
                                            key={skin.id}
                                            className={`p-2 rounded cursor-pointer transition-all ${
                                              editSelectedSkins.some(s => s.id === skin.id)
                                                ? "bg-primary/20 border border-primary/70"
                                                : "bg-black/20 border border-white/10 hover:bg-black/40"
                                            }`}
                                            onClick={() => toggleEditSkinSelection(skin)}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                toggleEditSkinSelection(skin);
                                              }
                                            }}
                                            aria-pressed={editSelectedSkins.some(s => s.id === skin.id)}
                                            aria-label={`${editSelectedSkins.some(s => s.id === skin.id) ? 'Deseleccionar' : 'Seleccionar'} skin ${skin.nombre}`}
                                          >
                                            <div className="aspect-square mb-1 bg-black/30 rounded overflow-hidden">
                                              {skin.imagen_url && (
                                                <Image
                                                  src={skin.imagen_url}
                                                  alt={skin.nombre}
                                                  width={60}
                                                  height={60}
                                                  quality={100}
                                                  className="object-contain w-full h-full"
                                                />
                                              )}
                                            </div>
                                            <p className="text-xs text-white truncate" style={{ color: skin.content_tier?.color || "white" }}>
                                              {skin.nombre}
                                            </p>
                                          </div>
                                        ))
                                      ) : (
                                        <div className="col-span-2 sm:col-span-3 text-center py-4 text-white/60 text-sm">
                                          {editSkinSearchTerm ? `No hay skins que coincidan con "${editSkinSearchTerm}"` : 'No hay skins disponibles'}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Skins Seleccionadas */}
                  {editSelectedSkins.length > 0 && (
                    <Card className="mt-4 sm:mt-6">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center justify-between text-base sm:text-lg">
                          Skins Seleccionadas
                          <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/40 text-xs">
                            {editSelectedSkins.length} skins
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 max-h-60 sm:max-h-80 overflow-y-auto">
                          {editSelectedSkins.map((skin) => (
                            <div
                              key={skin.id}
                              className="relative p-2 rounded-lg bg-black/20 border border-white/10 hover:border-primary/40 transition-all group"
                            >
                              <button
                                onClick={() => toggleEditSkinSelection(skin)}
                                className="absolute top-1 right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-red-500/80 hover:bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                title="Quitar skin"
                              >
                                ×
                              </button>
                              <div className="aspect-square mb-2 bg-black/30 rounded overflow-hidden">
                                {skin.imagen_url && (
                                  <Image
                                    src={skin.imagen_url}
                                    alt={skin.nombre}
                                    width={60}
                                    height={60}
                                    quality={100}
                                    className="object-contain w-full h-full scale-75"
                                  />
                                )}
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs text-white truncate font-medium" title={skin.nombre}>
                                  {skin.nombre}
                                </p>
                                <p 
                                  className="text-xs font-semibold truncate" 
                                  style={{ color: skin.content_tier?.color || "#fff" }}
                                  title={skin.content_tier?.nombre}
                                >
                                  {skin.content_tier?.nombre}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                        {editSelectedSkins.length > 12 && (
                          <div className="mt-3 text-center">
                            <p className="text-xs text-white/60">
                              Desplázate para ver más skins seleccionadas
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Botones de acción */}
                  <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-2 mt-4 sm:mt-6">
                    <Button 
                      variant="secondary"
                      className="w-full sm:w-auto !text-white/70 hover:!bg-white/10 active:!bg-white/20 transition-all duration-200 
                                 rounded-xl border border-transparent hover:border-white/10 active:scale-95 bg-transparent text-sm"
                      onClick={() => setShowEditModal(false)}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      onClick={saveEditChanges} 
                      disabled={isUpdating}
                      className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-red-500/20 to-red-600/20 text-white shadow-lg 
                                 shadow-red-900/20 border border-red-500/20 hover:bg-gradient-to-r hover:from-red-500/30 
                                 hover:to-red-600/30 active:scale-95 transition-all duration-200 text-sm"
                    >
                      {isUpdating ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}