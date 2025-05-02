"use client"

import {
  LayoutGrid,
  Boxes,
  ArrowLeftRight,
  LogOut,
  Bell,
  Wallet,
} from "lucide-react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
} from "@heroui/react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { signOut } from "next-auth/react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

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
    title: "Trade",
    url: "/main/trade",
    icon: ArrowLeftRight,
  },
];

export function AppSidebar() {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const pathname = usePathname();
  const [notifications] = useState([
    {
      id: 1,
      title: "Nuevo intercambio",
      description: "Has recibido una nueva propuesta de intercambio",
      time: "Hace 5 minutos",
    },
    {
      id: 2,
      title: "Actualización de catálogo",
      description: "Se han añadido nuevos items al catálogo",
      time: "Hace 1 hora",
    },
  ]);

  return (
    <Sidebar className="fixed left-4 top-4 z-50 h-[calc(100vh-32px)] w-64 flex-col items-center rounded-2xl border border-white/10 bg-backgroundAlt/10 backdrop-blur-xl shadow-[0_0_45px_-5px_rgba(0,0,0,0.3)] transition-all duration-300 hover:shadow-[0_0_55px_-5px_rgba(0,0,0,0.4)]">
      <div className="flex flex-col items-center w-full py-6 gap-3 border-b border-white/5 relative rounded-t-2xl overflow-hidden bg-gradient-to-b from-white/5 to-transparent">
        <Link className="block w-auto h-auto" href="/">
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
                  pathname === item.url ||
                  (item.url !== "/main" && pathname.startsWith(item.url));

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
                <div className="group relative inline-flex items-center gap-3 px-5 py-3 font-medium rounded-xl overflow-hidden transition-all duration-300 ease-out w-full active:scale-95 active:shadow-inner text-white/70 hover:bg-white/5 hover:text-white border border-transparent hover:border-white/10 active:bg-white/10">
                  <Wallet className="h-5 w-5 text-primary/80" />
                  <span className="text-base font-medium">Créditos: --</span>
                </div>
              </SidebarMenuItem>

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
  );
}
