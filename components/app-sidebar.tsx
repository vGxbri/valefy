"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { createClient } from '@/utils/supabase/client';
import { verificarMisionesDisponibles, procesarMisionLogin } from "@/lib/missionUtils";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Modal,
  ModalContent,
  ModalBody,
  ModalHeader,
  ModalFooter,
  useDisclosure,
  Button,
} from "@nextui-org/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Boxes,
  CircleFadingArrowUp,
  LogOut,
  Wallet,
  ListChecks,
  BookOpen,
  CircleAlert,
  Menu,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const items = [
  {
    title: "Principal",
    url: "/main",
    icon: LayoutGrid,
  },
  {
    title: "Inventario",
    url: "/main/inventario",
    icon: Boxes,
  },
  {
    title: "Mejorar",
    url: "/main/mejoras",
    icon: CircleFadingArrowUp,
  },
  {
    title: "Catálogo",
    url: "/main/catalogo",
    icon: BookOpen,
  },
];

// Componente para mostrar créditos del usuario
function CreditosDisplay() {
  const { data: nextAuthSession, status: nextAuthStatus } = useSession();
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(true);
  const [saldo, setSaldo] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(false);
  const supabase = createClient();

  useEffect(() => {
    if (nextAuthStatus === "loading") {
      setIsLoadingSession(true);
      setUserId(null);
    } else if (nextAuthStatus === "unauthenticated") {
      setIsLoadingSession(false);
      setUserId(null);
    } else if (nextAuthStatus === "authenticated") {
      if (nextAuthSession?.user?.id) {
        setUserId(nextAuthSession.user.id as string);
      } else {
        setUserId(null);
      }
      setIsLoadingSession(false);
    }
  }, [nextAuthSession, nextAuthStatus]);

  useEffect(() => {
    if (userId) {
      cargarSaldo();
    }
  }, [userId]);

  useEffect(() => {
    const handleSaldoActualizado = () => {
      cargarSaldo();
    };

    const handleSaldoIncrementado = (event: CustomEvent) => {
      const { cantidad } = event.detail;
      setSaldo(prev => prev + cantidad);
    };

    const handleSaldoDecrementado = (event: CustomEvent) => {
      const { cantidad } = event.detail;
      setSaldo(prev => Math.max(0, prev - cantidad)); // No permitir saldo negativo
    };

    const handleSaldoNuevo = (event: CustomEvent) => {
      const { saldo: nuevoSaldo } = event.detail;
      setSaldo(nuevoSaldo);
    };

    window.addEventListener('saldoActualizado', handleSaldoActualizado);
    window.addEventListener('saldoIncrementado', handleSaldoIncrementado as EventListener);
    window.addEventListener('saldoDecrementado', handleSaldoDecrementado as EventListener);
    window.addEventListener('saldoNuevo', handleSaldoNuevo as EventListener);

    return () => {
      window.removeEventListener('saldoActualizado', handleSaldoActualizado);
      window.removeEventListener('saldoIncrementado', handleSaldoIncrementado as EventListener);
      window.removeEventListener('saldoDecrementado', handleSaldoDecrementado as EventListener);
      window.removeEventListener('saldoNuevo', handleSaldoNuevo as EventListener);
    };
  }, []);

  const cargarSaldo = async () => {
    if (!userId) return;
    
    try {
      setIsLoadingBalance(true);
      const { data: usuario, error } = await supabase
        .from("usuarios")
        .select("saldo")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error al cargar saldo:", error);
        return;
      }

      setSaldo(usuario?.saldo || 0);
    } catch (error) {
      console.error("Error al cargar saldo:", error);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  if (isLoadingSession || isLoadingBalance) {
    return (
      <div className="group relative inline-flex items-center gap-3 px-5 py-3 font-medium rounded-xl overflow-hidden transition-all duration-300 ease-out w-full active:scale-95 active:shadow-inner text-white/70 hover:bg-white/5 hover:text-white border border-transparent hover:border-white/10 active:bg-white/10">
        <Wallet className="h-5 w-5 text-primary/80" />
        <span className="text-base font-medium">Cargando...</span>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="group relative inline-flex items-center gap-3 px-5 py-3 font-medium rounded-xl overflow-hidden transition-all duration-300 ease-out w-full active:scale-95 active:shadow-inner text-white/70 hover:bg-white/5 hover:text-white border border-transparent hover:border-white/10 active:bg-white/10">
        <Wallet className="h-5 w-5 text-primary/80" />
        <span className="text-base font-medium">Sin sesión</span>
      </div>
    );
  }

  return (
    <div className="group relative inline-flex items-center gap-3 px-5 py-3 font-medium rounded-xl overflow-hidden transition-all duration-300 ease-out w-full active:scale-95 active:shadow-inner text-white/70 hover:bg-white/5 hover:text-white border border-transparent hover:border-white/10 active:bg-white/10">
      <Wallet className="h-5 w-5 text-primary/80" />
      <span className="text-base font-medium">
        {saldo.toLocaleString()} VP
      </span>
    </div>
  );
}

// Componente del menú móvil
function MobileMenu() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [misionesDisponibles, setMisionesDisponibles] = useState(0);

  // Efecto para verificar misiones disponibles
  useEffect(() => {
    const verificarYProcesarMisiones = async () => {
      if (status === "authenticated" && session?.user?.id) {
        try {
          await procesarMisionLogin(session.user.id);
          const resultado = await verificarMisionesDisponibles(session.user.id);
          if (resultado.success) {
            setMisionesDisponibles(resultado.cantidad);
          }
        } catch (error) {
          console.error("Error al verificar misiones:", error);
        }
      }
    };

    verificarYProcesarMisiones();
  }, [session, status]);

  // Escuchar actualizaciones de misiones
  useEffect(() => {
    const handleMisionesActualizadas = async () => {
      if (status === "authenticated" && session?.user?.id) {
        try {
          const resultado = await verificarMisionesDisponibles(session.user.id);
          if (resultado.success) {
            setMisionesDisponibles(resultado.cantidad);
          }
        } catch (error) {
          console.error("Error al verificar misiones:", error);
        }
      }
    };

    window.addEventListener('misionesActualizadas', handleMisionesActualizadas);
    return () => {
      window.removeEventListener('misionesActualizadas', handleMisionesActualizadas);
    };
  }, [session, status]);

  // Cerrar menú móvil cuando se cambia de ruta
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Prevenir scroll del body cuando el menú está abierto
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      {/* Botón del menú móvil */}
      <motion.button
        className="fixed top-4 right-4 z-50 md:hidden flex items-center justify-center w-12 h-12 rounded-xl bg-backgroundAlt/90 backdrop-blur-xl border border-white/10 shadow-[0_0_25px_-5px_rgba(0,0,0,0.3)] transition-all duration-300 hover:shadow-[0_0_35px_-5px_rgba(0,0,0,0.4)] active:scale-95"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        whileTap={{ scale: 0.95 }}
      >
        <AnimatePresence mode="wait">
          {isMobileMenuOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="h-6 w-6 text-white" />
            </motion.div>
          ) : (
            <motion.div
              key="menu"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Menu className="h-6 w-6 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Overlay del menú móvil */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Menú deslizante */}
            <motion.div
              className="fixed top-0 right-0 z-50 h-full w-80 max-w-[85vw] bg-black/50 backdrop-blur-xl border-l border-white/10 shadow-[0_0_50px_-10px_rgba(0,0,0,0.5)] md:hidden"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
              {/* Header del menú móvil */}
              <div className="flex flex-col items-center w-full py-6 gap-3 border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent">
                <Link className="block w-auto h-auto" href="/main" onClick={() => setIsMobileMenuOpen(false)}>
                  <Image
                    alt="Valefy Logo"
                    className="object-contain drop-shadow-custom"
                    height={36}
                    src="/logo-valefy.png"
                    width={110}
                  />
                </Link>
              </div>

              {/* Contenido del menú */}
              <div className="flex-1 w-full px-4 pt-6 pb-6 overflow-y-auto">
                {/* Sección de navegación */}
                <div className="mb-6">
                  <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider px-2 mb-3">
                    MENÚ
                  </h3>
                  <div className="space-y-2">
                    {items.map((item, index) => {
                      const isActive = pathname === item.url || (item.url !== "/main" && pathname.startsWith(item.url));
                      return (
                        <motion.div
                          key={item.title}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 + 0.2, duration: 0.3 }}
                        >
                          <Link
                            className={`group relative inline-flex items-center gap-3 px-4 py-3 font-medium rounded-xl overflow-hidden transition-all duration-300 ease-out w-full active:scale-95 active:shadow-inner ${
                              isActive
                                ? "bg-gradient-to-r from-red-500/20 to-red-600/20 text-white shadow-lg shadow-red-900/20 border border-red-500/20"
                                : "text-white/70 hover:bg-white/5 hover:text-white border border-transparent hover:border-white/10 active:bg-white/10"
                            }`}
                            href={item.url}
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <item.icon className="h-5 w-5 text-primary/80" />
                            <span className="text-base font-medium">
                              {item.title}
                            </span>
                          </Link>
                        </motion.div>
                      );
                    })}
                    
                    {/* Misiones */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: items.length * 0.1 + 0.2, duration: 0.3 }}
                    >
                      <Link
                        className={`group relative inline-flex items-center gap-3 px-4 py-3 font-medium rounded-xl overflow-hidden transition-all duration-300 ease-out w-full active:scale-95 active:shadow-inner ${
                          pathname === "/main/misiones"
                            ? "bg-gradient-to-r from-red-500/20 to-red-600/20 text-white shadow-lg shadow-red-900/20 border border-red-500/20"
                            : "text-white/70 hover:bg-white/5 hover:text-white border border-transparent hover:border-white/10 active:bg-white/10"
                        }`}
                        href="/main/misiones"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <ListChecks className="h-5 w-5 text-primary/80" />
                        <span className="text-base font-medium flex items-center gap-2">
                          Misiones
                          {misionesDisponibles > 0 && (
                            <CircleAlert className="h-4 w-4 text-red-500" />
                          )}
                        </span>
                      </Link>
                    </motion.div>
                  </div>
                </div>

                {/* Sección de cuenta */}
                <div className="mb-6">
                  <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider px-2 mb-3">
                    CUENTA
                  </h3>
                  <div className="space-y-2">
                    {/* Créditos */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6, duration: 0.3 }}
                    >
                      <CreditosDisplay />
                    </motion.div>

                    {/* Cerrar sesión */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8, duration: 0.3 }}
                    >
                      <button
                        className="group relative inline-flex items-center gap-3 px-4 py-3 font-medium rounded-xl overflow-hidden transition-all duration-300 ease-out w-full active:scale-95 active:shadow-inner text-white/70 hover:bg-red-500/10 hover:text-red-400 border border-transparent hover:border-red-500/20 active:bg-red-500/20"
                        type="button"
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          onOpen();
                        }}
                      >
                        <LogOut className="h-5 w-5 text-primary/80 transform rotate-180 transition-colors" />
                        <span className="text-base font-medium">Cerrar sesión</span>
                      </button>
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modal de confirmación de cerrar sesión */}
      <Modal
        hideCloseButton
        backdrop="blur"
        classNames={{
          body: "py-6 px-8 flex flex-col items-center gap-5",
          backdrop: "bg-black/70 backdrop-blur-md",
          base: "border border-white/10 bg-gradient-to-b from-backgroundAlt to-background text-white rounded-2xl shadow-[0_10px_50px_-12px_rgba(0,0,0,0.4)] overflow-hidden",
          header: "w-full border-b border-white/10 pb-4 flex flex-col items-center gap-3",
          footer: "w-full border-t border-white/10 pt-4 flex justify-end gap-3",
        }}
        isOpen={isOpen}
        radius="lg"
        onOpenChange={onOpenChange}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-primary/50 to-transparent" />
              <ModalHeader className="flex flex-col items-center gap-2 relative z-10">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/30 border border-red-500/30 mt-2 shadow-lg shadow-red-900/10 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/20 opacity-50" />
                  <LogOut className="h-8 w-8 text-red-400 rotate-180 drop-shadow-md relative z-10" />
                </div>
                <span className="text-2xl font-bold text-white drop-shadow-sm">
                  ¿Cerrar sesión?
                </span>
              </ModalHeader>
              <ModalBody className="relative z-10">
                <p className="text-white/80 text-center text-base">
                  ¿Estás seguro de que deseas cerrar tu sesión?
                  <br />
                  Se cerrará tu cuenta y tendrás que volver a iniciar
                  sesión para acceder de nuevo.
                </p>
              </ModalBody>
              <ModalFooter className="relative z-10">
                <Button
                  className="!text-white/70 hover:!bg-white/10 active:!bg-white/20 transition-all duration-200 rounded-xl border border-transparent hover:border-white/10 active:scale-95"
                  variant="light"
                  onPress={onClose}
                >
                  Cancelar
                </Button>
                <Button
                  className="bg-red-600/20 hover:bg-red-600/30 text-white border border-red-500/20 hover:border-red-500/30 font-semibold px-6 rounded-xl transition-colors duration-300 shadow-lg shadow-red-900/20 active:scale-95 active:shadow-inner"
                  onPress={() => {
                    signOut({ callbackUrl: "/" });
                    onClose();
                  }}
                >
                  Cerrar sesión
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [misionesDisponibles, setMisionesDisponibles] = useState(0);
  const { data: session, status } = useSession();

  // Efecto para verificar misiones disponibles y procesar login
  useEffect(() => {
    const verificarYProcesarMisiones = async () => {
      if (status === "authenticated" && session?.user?.id) {
        try {
          // Procesar misión de login
          await procesarMisionLogin(session.user.id);
          
          // Verificar misiones disponibles
          const resultado = await verificarMisionesDisponibles(session.user.id);
          if (resultado.success) {
            setMisionesDisponibles(resultado.cantidad);
          }
        } catch (error) {
          console.error("Error al verificar misiones:", error);
        }
      }
    };

    verificarYProcesarMisiones();
  }, [session, status]);

  useEffect(() => {
    const handleMisionesActualizadas = async () => {
      if (status === "authenticated" && session?.user?.id) {
        try {
          const resultado = await verificarMisionesDisponibles(session.user.id);
          if (resultado.success) {
            setMisionesDisponibles(resultado.cantidad);
          }
        } catch (error) {
          console.error("Error al verificar misiones:", error);
        }
      }
    };

    window.addEventListener('misionesActualizadas', handleMisionesActualizadas);

    return () => {
      window.removeEventListener('misionesActualizadas', handleMisionesActualizadas);
    };
  }, [session, status]);

  return (
    <>
      <MobileMenu />

      <Sidebar className="hidden md:flex fixed left-4 top-4 z-50 h-[calc(100vh-32px)] w-64 flex-col items-center rounded-2xl border border-white/10 bg-backgroundAlt/10 backdrop-blur-xl shadow-[0_0_45px_-5px_rgba(0,0,0,0.3)] transition-all duration-300 hover:shadow-[0_0_55px_-5px_rgba(0,0,0,0.4)]">
        <div className="flex flex-col items-center w-full py-6 gap-3 border-b border-white/5 relative rounded-t-2xl overflow-hidden bg-gradient-to-b from-white/5 to-transparent">
          <Link className="block w-auto h-auto" href="/main">
            <Image
              alt="Valefy Logo"
              className="object-contain drop-shadow-custom"
              height={44}
              src="/logo-valefy.png"
              width={140}
            />
          </Link>
        </div>
        <SidebarContent className="flex-1 w-full px-3 pt-4">
          <SidebarGroup className="bg-gradient-to-b from-background/95 to-background/80 rounded-2xl shadow-inner border border-white/5">
            <SidebarGroupLabel className="text-xs font-bold text-white/60 uppercase tracking-wider px-4 py-3 border-b border-white/5">
              MENU
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="flex flex-col gap-2 p-2">
                {items.map((item) => {
                  const isActive =
                    pathname === item.url || (item.url !== "/main" && pathname.startsWith(item.url));
                  return (
                    <SidebarMenuItem key={item.title}>
                      <Link
                        className={`group relative inline-flex items-center gap-3 px-5 py-3 font-medium rounded-xl overflow-hidden transition-all duration-300 ease-out w-full active:scale-95 active:shadow-inner ${
                          isActive
                            ? "bg-gradient-to-r from-red-500/20 to-red-600/20 text-white shadow-lg shadow-red-900/20 border border-red-500/20 active:from-red-500/30 active:to-red-600/30"
                            : "text-white/70 hover:bg-white/5 hover:text-white border border-transparent hover:border-white/10 active:bg-white/10"
                        }`}
                        href={item.url}
                      >
                        <item.icon className="h-5 w-5 text-primary/80" />
                        <span className="text-base font-medium">
                          {item.title}
                        </span>
                      </Link>
                    </SidebarMenuItem>
                  );
                })}
                <SidebarMenuItem>
                  <Link
                    className={`group relative inline-flex items-center gap-3 px-5 py-3 font-medium rounded-xl overflow-hidden transition-all duration-300 ease-out w-full active:scale-95 active:shadow-inner ${
                      pathname === "/main/misiones"
                        ? "bg-gradient-to-r from-red-500/20 to-red-600/20 text-white shadow-lg shadow-red-900/20 border border-red-500/20 active:from-red-500/30 active:to-red-600/30"
                        : "text-white/70 hover:bg-white/5 hover:text-white border border-transparent hover:border-white/10 active:bg-white/10"
                    }`}
                    href="/main/misiones"
                  >
                    <ListChecks className="h-5 w-5 text-primary/80" />
                    <span className="text-base font-medium flex items-center gap-2">
                      Misiones
                      {misionesDisponibles > 0 && (
                        <CircleAlert className="h-4 w-4 text-red-500" />
                      )}
                    </span>
                  </Link>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Segundo Grupo: Cuenta */}
          <SidebarGroup className="bg-gradient-to-b from-background/95 to-background/80 rounded-2xl shadow-inner border border-white/5 mt-3">
            <SidebarGroupLabel className="text-xs font-bold text-white/70 uppercase tracking-wider px-4 py-3 border-b border-white/5">
              Cuenta
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="flex flex-col gap-2 p-2">
                <SidebarMenuItem>
                  <CreditosDisplay />
                </SidebarMenuItem>
                {/*
                <SidebarMenuItem>
                  <Popover>
                    <PopoverTrigger asChild>
                      <div className="group relative inline-flex items-center gap-3 px-5 py-3 font-medium rounded-xl overflow-hidden transition-all duration-300 ease-out w-full active:scale-95 active:shadow-inner text-white/70 hover:bg-white/5 hover:text-white border border-transparent hover:border-white/10 active:bg-white/10 cursor-pointer">
                        <Bell className="h-5 w-5 text-primary/80 transition-colors" />
                        <span className="text-base font-medium flex items-center gap-2">
                          Alertas
                          {notifications.length > 0 && (
                            <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-red-500/20 border border-red-500/30 text-[10px] text-white font-bold shadow-inner">
                              {notifications.length}
                            </span>
                          )}
                        </span>
                      </div>
                    </PopoverTrigger>
                    <PopoverContent
                      align="center"
                      className="w-80 p-0 border border-white/10 bg-background/95 backdrop-blur-xl rounded-xl shadow-[0_10px_40px_-5px_rgba(0,0,0,0.3)] ml-2 mb-1"
                      side="right"
                    >
                      <div className="flex flex-col">
                        <div className="px-4 py-3 border-b border-white/10 bg-gradient-to-r from-background to-background/80">
                          <h3 className="font-semibold text-base text-white flex items-center gap-2">
                            <Bell className="h-4 w-4 text-primary/80" />
                            Notificaciones
                          </h3>
                        </div>
                        {notifications.length > 0 ? (
                          <div className="divide-y divide-white/10 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                            {notifications.map((notification) => (
                              <div
                                key={notification.id}
                                className="p-4 hover:bg-white/5 transition-all duration-200 cursor-pointer border-l-2 border-l-transparent hover:border-l-primary"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="flex-1">
                                    <h4 className="font-medium text-sm text-white flex items-center gap-2">
                                      {notification.title}
                                      <span className="text-[10px] text-white/40 font-normal">
                                        {notification.time}
                                      </span>
                                    </h4>
                                    <p className="text-sm text-white/70 mt-1">
                                      {notification.description}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-6 text-center text-white/50 text-sm">
                            <Bell className="h-4 w-4 mx-auto mb-2 opacity-20" />
                            <p>No tienes notificaciones nuevas.</p>
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </SidebarMenuItem>
                */}

                <SidebarMenuItem>
                  <button
                    className="group relative inline-flex items-center gap-3 px-5 py-3 font-medium rounded-xl overflow-hidden transition-all duration-300 ease-out w-full active:scale-95 active:shadow-inner text-white/70 hover:bg-red-500/10 hover:text-red-400 border border-transparent hover:border-red-500/20 active:bg-red-500/20"
                    type="button"
                    onClick={onOpen}
                  >
                    <LogOut className="h-5 w-5 text-primary/80 transform rotate-180 transition-colors" />
                    <span className="text-base font-medium">Cerrar sesión</span>
                  </button>
                  <Modal
                    hideCloseButton
                    backdrop="blur"
                    classNames={{
                      body: "py-6 px-8 flex flex-col items-center gap-5",
                      backdrop: "bg-black/70 backdrop-blur-md",
                      base: "border border-white/10 bg-gradient-to-b from-backgroundAlt to-background text-white rounded-2xl shadow-[0_10px_50px_-12px_rgba(0,0,0,0.4)] overflow-hidden",
                      header:
                        "w-full border-b border-white/10 pb-4 flex flex-col items-center gap-3",
                      footer:
                        "w-full border-t border-white/10 pt-4 flex justify-end gap-3",
                    }}
                    isOpen={isOpen}
                    radius="lg"
                    onOpenChange={onOpenChange}
                  >
                    <ModalContent>
                      {(onClose) => (
                        <>
                          {/* Elementos decorativos */}
                          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-primary/50 to-transparent" />

                          <ModalHeader className="flex flex-col items-center gap-2 relative z-10">
                            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/30 border border-red-500/30 mt-2 shadow-lg shadow-red-900/10 overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/20 opacity-50" />
                              <LogOut className="h-8 w-8 text-red-400 rotate-180 drop-shadow-md relative z-10" />
                            </div>
                            <span className="text-2xl font-bold text-white drop-shadow-sm">
                              ¿Cerrar sesión?
                            </span>
                          </ModalHeader>
                          <ModalBody className="relative z-10">
                            <p className="text-white/80 text-center text-base">
                              ¿Estás seguro de que deseas cerrar tu sesión?
                              <br />
                              Se cerrará tu cuenta y tendrás que volver a iniciar
                              sesión para acceder de nuevo.
                            </p>
                          </ModalBody>
                          <ModalFooter className="relative z-10">
                            <Button
                              className="!text-white/70 hover:!bg-white/10 active:!bg-white/20 transition-all duration-200 rounded-xl border border-transparent hover:border-white/10 active:scale-95"
                              variant="light"
                              onPress={onClose}
                            >
                              Cancelar
                            </Button>
                            <Button
                              className="bg-red-600/20 hover:bg-red-600/30 text-white border border-red-500/20 hover:border-red-500/30 font-semibold px-6 rounded-xl transition-colors duration-300 shadow-lg shadow-red-900/20 active:scale-95 active:shadow-inner"
                              onPress={() => {
                                signOut({ callbackUrl: "/" });
                                onClose();
                              }}
                            >
                              Cerrar sesión
                            </Button>
                          </ModalFooter>
                        </>
                      )}
                    </ModalContent>
                  </Modal>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </>
  );
}
