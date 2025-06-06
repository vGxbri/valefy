"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { createClient } from '@/utils/supabase/client';
import Link from "next/link";
import { toast } from "sonner";
import { 
  Trophy, 
  Clock, 
  CircleOff, 
  Gift, 
  CheckCircle2, 
  Coins,
  Target,
  Package,
  Shirt,
  UserPlus,
  TrendingUp,
  Calendar,
  Shield,
  LogIn,
  Package2,
  Backpack,
  Search,
  Crown,
  Layers,
  Sparkles,
  Archive,
  Dice6,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { incrementarSaldoLocal } from "@/lib/saldoUtils";

// Mapeo de iconos
const ICONOS_MAP: Record<string, any> = {
  LogIn,
  Package,
  Backpack,
  Search,
  Gift,
  Package2,
  Crown,
  Layers,
  Shirt,
  CircleOff,
  Sparkles,
  Trophy,
  Archive,
  UserPlus,
  Shield,
  Calendar,
  TrendingUp,
  Dice6,
  Target,
};

interface Mision {
  id: string;
  nombre: string;
  descripcion: string;
  recompensa_vp: number;
  tipo: 'diaria' | 'semanal' | 'unica' | 'repetible';
  categoria: string;
  condicion: any;
  activa: boolean;
  orden: number;
  icono: string;
  fecha_creacion: string;
}

interface MisionUsuario {
  id: string;
  usuario_id: string;
  mision_id: string;
  completada: boolean;
  fecha_completada: string | null;
  progreso: {
    actual: number;
    objetivo: number;
  };
  mision: Mision;
}

// Componente de tarjeta de estadística siguiendo el estilo de admin
const StatCard = ({ title, value, subtitle, icon: Icon, color = "primary" }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  color?: string;
}) => (
  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-backgroundAlt/20 to-background/40 backdrop-blur-xl border border-white/10 p-6 shadow-[0_0_45px_-5px_rgba(0,0,0,0.3)] hover:shadow-[0_0_55px_-5px_rgba(0,0,0,0.4)] transition-all duration-300">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <p className="text-sm font-medium text-white/70">{title}</p>
        <div className="text-2xl font-bold text-white">{value}</div>
        {subtitle && (
          <p className="text-xs text-white/50">{subtitle}</p>
        )}
      </div>
      <div className="rounded-lg bg-primary/20 p-3">
        <Icon className="h-6 w-6 text-primary" />
      </div>
    </div>
    <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-primary/10 blur-2xl" />
  </div>
);

export default function Page() {
  const { data: session, status } = useSession();
  const [misiones, setMisiones] = useState<MisionUsuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalVP, setTotalVP] = useState(0);
  const [completadas, setCompletadas] = useState(0);
  const [activeTab, setActiveTab] = useState("reclamar");
  const [tabInicialDeterminado, setTabInicialDeterminado] = useState(false);
  const [isClaimingAll, setIsClaimingAll] = useState(false);
  const [claimingMisionId, setClaimingMisionId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      cargarMisiones();
      cargarEstadisticas();
    }
  }, [session, status]);

  // Función para determinar el tab inicial basado en misiones disponibles
  const determinarTabInicial = (misionesData: MisionUsuario[]) => {
    const misionesParaReclamar = misionesData.filter(mision => {
      const progreso = mision.progreso || { actual: 0, objetivo: 1 };
      return !mision.completada && progreso.actual >= progreso.objetivo;
    });

    return misionesParaReclamar.length > 0 ? 'reclamar' : 'disponibles';
  };

  const cargarMisiones = async () => {
    if (!session?.user?.id) return;

    try {
      setIsLoading(true);

      // Usar el endpoint que ya aplica la lógica de misiones progresivas
      const response = await fetch('/api/misiones/usuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id })
      });

      const resultado = await response.json();

      if (!resultado.success) {
        throw new Error(resultado.error || "Error al cargar misiones");
      }

      const misionesData = resultado.misiones || [];
      setMisiones(misionesData);
      
      // Determinar tab inicial solo en la primera carga
      if (!tabInicialDeterminado && misionesData.length > 0) {
        const tabInicial = determinarTabInicial(misionesData);
        setActiveTab(tabInicial);
        setTabInicialDeterminado(true);
      }
    } catch (error) {
      console.error("Error al cargar misiones:", error);
      toast.error("Error al cargar las misiones");
    } finally {
      setIsLoading(false);
    }
  };

  const cargarEstadisticas = async () => {
    if (!session?.user?.id) return;

    try {
      // Total VP ganados
      const { data: recompensas } = await supabase
        .from("logs_historial_recompensas")
        .select("vp_otorgados")
        .eq("usuario_id", session.user.id);

      const totalVP = recompensas?.reduce((sum, r) => sum + r.vp_otorgados, 0) || 0;
      setTotalVP(totalVP);

      // Misiones completadas
      const { count: completadasCount } = await supabase
        .from("misiones_usuario")
        .select("*", { count: "exact", head: true })
        .eq("usuario_id", session.user.id)
        .eq("completada", true);

      setCompletadas(completadasCount || 0);
    } catch (error) {
      console.error("Error al cargar estadísticas:", error);
    }
  };

  const reclamarRecompensa = async (misionUsuario: MisionUsuario) => {
    if (!session?.user?.id || misionUsuario.completada || claimingMisionId === misionUsuario.id) return;

    const progreso = misionUsuario.progreso;
    if (progreso.actual < progreso.objetivo) {
      toast.error("Misión no completada aún");
      return;
    }

    setClaimingMisionId(misionUsuario.id);

    try {
      // Marcar como completada
      const { error: updateError } = await supabase
        .from("misiones_usuario")
        .update({ 
          completada: true, 
          fecha_completada: new Date().toISOString() 
        })
        .eq("id", misionUsuario.id);

      if (updateError) {
        console.error("Error al marcar misión como completada:", updateError);
        throw updateError;
      }

      // Registrar recompensa
      const { error: recompensaError } = await supabase
        .from("logs_historial_recompensas")
        .insert({
          usuario_id: session.user.id,
          mision_id: misionUsuario.mision.id,
          vp_otorgados: misionUsuario.mision.recompensa_vp
        });

      if (recompensaError) {
        console.error("Error al registrar recompensa:", recompensaError);
        throw recompensaError;
      }

      // Actualizar saldo del usuario
      const { data: usuario, error: saldoQueryError } = await supabase
        .from("usuarios")
        .select("saldo")
        .eq("id", session.user.id)
        .single();

      if (saldoQueryError) {
        console.error("Error al obtener saldo actual:", saldoQueryError);
        throw saldoQueryError;
      }

      if (usuario) {
        const { error: saldoUpdateError } = await supabase
          .from("usuarios")
          .update({ saldo: (usuario.saldo || 0) + misionUsuario.mision.recompensa_vp })
          .eq("id", session.user.id);

        if (saldoUpdateError) {
          console.error("Error al actualizar saldo:", saldoUpdateError);
          throw saldoUpdateError;
        }
      }

      // 🎯 PROCESAR ACTIVIDAD DE MISIÓN COMPLETADA PARA ACTIVAR MISIONES PROGRESIVAS
      try {
        await fetch('/api/misiones/procesar-actividad', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            tipoActividad: 'mision_completada',
            cantidad: 1
          })
        });
      } catch (actividadError) {
        console.warn("Error al procesar actividad de misión completada:", actividadError);
        // No fallar el proceso principal por esto
      }

      toast.success(`¡Recompensa reclamada! +${misionUsuario.mision.recompensa_vp} VP`);

      // Recargar datos
      cargarMisiones();
      cargarEstadisticas();

      // 🎯 EMITIR EVENTO DE MISIONES ACTUALIZADAS
      window.dispatchEvent(new CustomEvent('misionesActualizadas'));

      // 🎯 EMITIR EVENTO DE SALDO ACTUALIZADO PARA SIDEBAR
      incrementarSaldoLocal(misionUsuario.mision.recompensa_vp);

    } catch (error) {
      console.error("Error al reclamar recompensa:", error);
      toast.error("Error al reclamar la recompensa");
    } finally {
      setClaimingMisionId(null);
    }
  };

  const reclamarTodasLasRecompensas = async () => {
    if (!session?.user?.id || isClaimingAll) return;

    // Obtener todas las misiones que se pueden reclamar
    const misionesParaReclamar = misiones.filter(mision => {
      const progreso = mision.progreso || { actual: 0, objetivo: 1 };
      return !mision.completada && progreso.actual >= progreso.objetivo;
    });

    if (misionesParaReclamar.length === 0) {
      toast.error("No hay misiones para reclamar");
      return;
    }

    setIsClaimingAll(true);

    try {
      let vpTotalGanado = 0;
      let misionesCompletadas = 0;

      // Procesar cada misión una por una
      for (const misionUsuario of misionesParaReclamar) {
        try {
          // Marcar como completada
          const { error: updateError } = await supabase
            .from("misiones_usuario")
            .update({ 
              completada: true, 
              fecha_completada: new Date().toISOString() 
            })
            .eq("id", misionUsuario.id);

          if (updateError) {
            console.error("Error al marcar misión como completada:", updateError);
            continue; // Continuar con la siguiente misión
          }

          // Registrar recompensa
          const { error: recompensaError } = await supabase
            .from("logs_historial_recompensas")
            .insert({
              usuario_id: session.user.id,
              mision_id: misionUsuario.mision.id,
              vp_otorgados: misionUsuario.mision.recompensa_vp
            });

          if (recompensaError) {
            console.error("Error al registrar recompensa:", recompensaError);
            continue; // Continuar con la siguiente misión
          }

          vpTotalGanado += misionUsuario.mision.recompensa_vp;
          misionesCompletadas++;

        } catch (error) {
          console.error("Error al procesar misión individual:", error);
          continue; // Continuar con la siguiente misión
        }
      }

      // Actualizar saldo del usuario con el total acumulado
      if (vpTotalGanado > 0) {
        const { data: usuario, error: saldoQueryError } = await supabase
          .from("usuarios")
          .select("saldo")
          .eq("id", session.user.id)
          .single();

        if (saldoQueryError) {
          console.error("Error al obtener saldo actual:", saldoQueryError);
        } else if (usuario) {
          const { error: saldoUpdateError } = await supabase
            .from("usuarios")
            .update({ saldo: (usuario.saldo || 0) + vpTotalGanado })
            .eq("id", session.user.id);

          if (saldoUpdateError) {
            console.error("Error al actualizar saldo:", saldoUpdateError);
          } else {
            // 🎯 ACTUALIZAR SALDO CON EVENTO SIMPLE
            incrementarSaldoLocal(vpTotalGanado);
          }
        }
      }

      // 🎯 PROCESAR ACTIVIDAD DE MISIONES COMPLETADAS PARA ACTIVAR MISIONES PROGRESIVAS
      if (misionesCompletadas > 0) {
        try {
          await fetch('/api/misiones/procesar-actividad', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              tipoActividad: 'mision_completada',
              cantidad: misionesCompletadas
            })
          });
        } catch (actividadError) {
          console.warn("Error al procesar actividad de misiones completadas:", actividadError);
        }
      }

      if (misionesCompletadas > 0) {
        toast.success(`¡${misionesCompletadas} recompensas reclamadas! +${vpTotalGanado} VP total`);
        
        // Recargar datos
        cargarMisiones();
        cargarEstadisticas();

        // 🎯 EMITIR EVENTO DE MISIONES ACTUALIZADAS
        window.dispatchEvent(new CustomEvent('misionesActualizadas'));
      } else {
        toast.error("No se pudo reclamar ninguna misión");
      }

    } catch (error) {
      console.error("Error al reclamar todas las recompensas:", error);
      toast.error("Error al reclamar las recompensas");
    } finally {
      setIsClaimingAll(false);
    }
  };

  const filtrarMisiones = (misiones: MisionUsuario[]) => {
    switch (activeTab) {
      case "reclamar":
        return misiones.filter(m => {
          const progreso = m.progreso || { actual: 0, objetivo: 1 };
          return !m.completada && progreso.actual >= progreso.objetivo;
        });
      case "disponibles":
        return misiones.filter(m => !m.completada && (m.progreso?.actual ?? 0) < (m.progreso?.objetivo ?? 1));
      case "completadas":
        return misiones.filter(m => m.completada);
      default:
        return misiones;
    }
  };

  const getIconComponent = (iconName: string) => {
    return ICONOS_MAP[iconName] || Target;
  };

  const getTipoBadgeColor = (tipo: string) => {
    switch (tipo) {
      case "diaria": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "semanal": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "unica": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "repetible": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4" />
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-white">Acceso requerido</h2>
          <p className="text-white/70 mb-6">Debes iniciar sesión para ver las misiones</p>
          <Link href="/login">
            <Button className="rounded-xl bg-gradient-to-r from-red-500/20 to-red-600/20 text-white shadow-lg shadow-red-900/20 border border-red-500/20 hover:bg-gradient-to-r hover:from-red-500/30 hover:to-red-600/30">
              Iniciar sesión
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const misionesFiltradas = filtrarMisiones(misiones);

  return (
    <div className="min-h-screen bg-background text-white">
      <div className="flex flex-col gap-8 pl-16 md:pr-12 lg:pr-16 pt-12 pb-12 min-h-screen bg-background w-full max-w-full flex-1">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white font-[Raleway] font-semibold italic tracking-widest">
            / MISIONES
          </h1>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Total VP Ganados"
            value={totalVP.toLocaleString()}
            subtitle="Desde el registro"
            icon={Coins}
            color="primary"
          />
          <StatCard
            title="Misiones Completadas"
            value={completadas}
            subtitle="Total acumulado"
            icon={CheckCircle2}
            color="green-500"
          />
          <StatCard
            title="Disponibles"
            value={misiones.filter(m => !m.completada && m.progreso.actual >= m.progreso.objetivo).length}
            subtitle="Listas para reclamar"
            icon={Star}
            color="purple-500"
          />
        </div>

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="mb-8">
            <TabsList className="grid w-full grid-cols-3 bg-backgroundAlt/20 backdrop-blur-xl border border-white/10 rounded-2xl px-1 py-0">
              <TabsTrigger value="reclamar" className="flex items-center gap-2 data-[state=active]:bg-primary/20 data-[state=active]:border-primary/30 rounded-xl">
                <Gift className="h-4 w-4" />
                Reclamar
              </TabsTrigger>
              <TabsTrigger value="disponibles" className="flex items-center gap-2 data-[state=active]:bg-primary/20 data-[state=active]:border-primary/30 rounded-xl">
                <Target className="h-4 w-4" />
                En progreso
              </TabsTrigger>
              <TabsTrigger value="completadas" className="flex items-center gap-2 data-[state=active]:bg-primary/20 data-[state=active]:border-primary/30 rounded-xl">
                <CheckCircle2 className="h-4 w-4" />
                Completadas
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Botón Reclamar Todas - Solo visible en tab "Reclamar" si hay misiones disponibles */}
          {activeTab === "reclamar" && misiones.filter(m => {
            const progreso = m.progreso || { actual: 0, objetivo: 1 };
            return !m.completada && progreso.actual >= progreso.objetivo;
          }).length > 0 && (
            <div className="mb-6 flex">
              <Button
                onClick={reclamarTodasLasRecompensas}
                disabled={isClaimingAll}
                className="rounded-xl bg-gradient-to-r from-primary/20 to-primary/30 text-white border border-primary/30 hover:bg-gradient-to-r hover:from-primary/30 hover:to-primary/40 transition-all duration-300 px-4 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                size="lg"
              >
                {isClaimingAll ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2" />
                    Reclamando...
                  </>
                ) : (
                  <>
                    <Gift className="h-5 w-5 mr-2" />
                    Reclamar Todas
                  </>
                )}
              </Button>
            </div>
          )}

          <TabsContent value={activeTab} className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {misionesFiltradas.map((misionUsuario) => {
                const IconComponent = getIconComponent(misionUsuario.mision.icono);
                const puedeReclamar = !misionUsuario.completada && 
                  misionUsuario.progreso.actual >= misionUsuario.progreso.objetivo;
                const porcentaje = Math.min(
                  (misionUsuario.progreso.actual / misionUsuario.progreso.objetivo) * 100, 
                  100
                );

                return (
                  <div 
                    key={misionUsuario.id} 
                    className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-backgroundAlt/20 to-background/40 backdrop-blur-xl border transition-all duration-300 p-6 shadow-[0_0_45px_-5px_rgba(0,0,0,0.3)] hover:shadow-[0_0_55px_-5px_rgba(0,0,0,0.4)] ${
                      misionUsuario.completada 
                        ? "border-green-500/20" 
                        : puedeReclamar 
                          ? "border-primary/30"
                          : "border-white/10"
                    }`}
                  >
                    {/* Reclamar */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          misionUsuario.completada 
                            ? "bg-green-500/20" 
                            : "bg-primary/20"
                        }`}>
                          <IconComponent className={`h-5 w-5 ${
                            misionUsuario.completada 
                              ? "text-green-400" 
                              : "text-primary"
                          }`} />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-white text-lg font-semibold">{misionUsuario.mision.nombre}</h3>
                          <p className="text-white/60 text-sm">
                            {misionUsuario.mision.descripcion}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* En Progreso */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-white/70">Progreso</span>
                        <span className="text-white">
                          {misionUsuario.progreso.actual}/{misionUsuario.progreso.objetivo}
                        </span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${porcentaje}%` }}
                        />
                      </div>
                    </div>

                    {/* Completadas */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4 text-primary" />
                        <span className="text-white font-semibold">
                          {misionUsuario.mision.recompensa_vp} VP
                        </span>
                      </div>

                      {misionUsuario.completada ? (
                        <div className="flex items-center gap-2 text-green-400">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-sm">Completada</span>
                        </div>
                      ) : puedeReclamar ? (
                        <Button
                          onClick={() => reclamarRecompensa(misionUsuario)}
                          className="rounded-xl bg-gradient-to-r from-red-500/20 to-red-600/20 text-white shadow-lg shadow-red-900/20 border border-red-500/20 hover:bg-gradient-to-r hover:from-red-500/30 hover:to-red-600/30"
                          size="sm"
                          disabled={claimingMisionId === misionUsuario.id}
                        >
                          {claimingMisionId === misionUsuario.id ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-1" />
                              Reclamando...
                            </>
                          ) : (
                            <span className="flex items-center">
                              <Gift className="h-4 w-4 mr-1" />
                              Reclamar
                            </span>
                          )}
                        </Button>
                      ) : (
                        <Button variant="secondary" size="sm" disabled className="text-white/50 rounded-xl">
                          <Clock className="h-4 w-4 mr-1" />
                          En progreso
                        </Button>
                      )}
                    </div>

                    {/* Efecto brillante para misiones disponibles */}
                    {puedeReclamar && !misionUsuario.completada && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-pulse pointer-events-none" />
                    )}

                    {/* Efecto decorativo */}
                    <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-primary/10 blur-2xl" />
                  </div>
                );
              })}
            </div>

            {misionesFiltradas.length === 0 && (
              <div className="text-center py-12">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-backgroundAlt/20 to-background/40 backdrop-blur-xl border border-white/10 p-12 shadow-[0_0_45px_-5px_rgba(0,0,0,0.3)]">
                  <CircleOff className="h-16 w-16 text-white/80 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {activeTab === "reclamar" && "No hay misiones para reclamar"}
                    {activeTab === "disponibles" && "No hay misiones en progreso"}
                    {activeTab === "completadas" && "No hay misiones completadas"}
                  </h3>
                  <p className="text-white/60">
                    {activeTab === "reclamar" && "Completa algunas actividades para desbloquear recompensas."}
                    {activeTab === "disponibles" && "Completa actividades para avanzar en tus misiones activas."}
                    {activeTab === "completadas" && "Aún no has completado ninguna misión."}
                  </p>
                  <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-primary/10 blur-2xl" />
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
