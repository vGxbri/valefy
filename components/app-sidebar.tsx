import { LayoutGrid, Boxes, ArrowLeftRight, Settings2, XCircle, Bell, User, Wallet } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { signOut } from "next-auth/react";

const items = [
  {
    title: "Catálogo",
    url: "/main/catalogo",
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
  const pathname = usePathname();
  const [notifications] = useState([
    {
      id: 1,
      title: "Nuevo intercambio",
      description: "Has recibido una nueva propuesta de intercambio",
      time: "Hace 5 minutos"
    },
    {
      id: 2,
      title: "Actualización de catálogo",
      description: "Se han añadido nuevos items al catálogo",
      time: "Hace 1 hora"
    }
  ]);
  return (
    <Sidebar className="fixed left-4 top-4 z-50 h-[calc(100vh-32px)] w-60 flex-col items-center rounded-xl border border-white/10 bg-background/90 backdrop-blur-md shadow-2xl"> {/* Increased width slightly to w-60 */}
      <div className="flex flex-col items-center w-full py-5 gap-2 border-b border-white/10 relative rounded-t-xl overflow-hidden"> {/* Adjusted py-5 */}
        <Link href="/" className="block w-auto h-auto">
          <Image src="/logo-valefy.png" alt="Valefy Logo" width={100} height={40} className="object-contain hover:opacity-80 transition-opacity" />
        </Link>
      </div>
      <SidebarContent className="flex-1 w-full px-2 pt-2"> {/* Adjusted px-4 pt-5 */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-white/50 uppercase tracking-wider px-3 py-2">MENU</SidebarGroupLabel> {/* Added Label */}
          <SidebarGroupContent>
            <SidebarMenu className="flex flex-col gap-0.5"> {/* Adjusted gap-2.5 */}
              {items.map((item) => {
                const isActive = pathname === item.url || (item.url !== "/main" && pathname.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link 
                        href={item.url}
                        className={`group flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 ease-in-out text-base font-medium ${isActive ? "bg-primary/90 text-white shadow-md shadow-primary/30 scale-[1.02]" : "text-white/70 hover:bg-white/10 hover:text-white"}`}
                        title={item.title}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <item.icon className="h-6 w-6" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Segundo Grupo: Cuenta */}
        <SidebarGroup className="pb-2"> {/* Eliminado mt-auto para que no se empuje al fondo */} 
          <SidebarGroupLabel className="text-xs font-semibold text-white/50 uppercase tracking-wider px-3 py-2">Cuenta</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="flex flex-col gap-0.5">
              {/* Placeholder Créditos */}
              <SidebarMenuItem>
                <div className="flex items-center gap-3 px-3 py-3 rounded-lg text-white/70 text-base font-medium w-full"> {/* Matched styling, w-full */} 
                  <Wallet className="h-6 w-6 text-primary/80" />
                  <span>Créditos: --</span> {/* Placeholder text */}
                </div>
              </SidebarMenuItem>

              {/* Notificaciones Popover como SidebarMenuItem */}
              <SidebarMenuItem>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-3 px-3 py-3 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-all group relative w-full justify-start text-base font-medium"> {/* Matched styling, w-full */} 
                      <Bell className="h-6 w-6 text-primary/80 group-hover:text-primary transition-colors" />
                      <span className="relative flex items-center">
                        <span>Notificaciones</span>
                        {notifications.length > 0 && (
                          <span className="inline-flex items-center justify-center ml-1.5 h-4 w-4 rounded-full bg-primary text-[9px] text-white font-bold">
                            {notifications.length}
                          </span>
                        )}
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0 border-white/10 bg-background/95 backdrop-blur-lg rounded-xl shadow-2xl mr-2 mb-1">
                    <div className="flex flex-col">
                      <div className="px-4 py-3 border-b border-white/10">
                        <h3 className="font-semibold text-base text-white">Notificaciones</h3>
                      </div>
                      {notifications.length > 0 ? (
                        <div className="divide-y divide-white/10 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                          {notifications.map((notification) => (
                            <div key={notification.id} className="p-3 hover:bg-white/5 transition-colors cursor-pointer">
                              <div className="flex items-start gap-1">
                                <div className="flex-1">
                                  <h4 className="font-medium text-sm text-white">{notification.title}</h4>
                                  <p className="text-xs text-white/70 mt-0.5">{notification.description}</p>
                                  <span className="text-[11px] text-white/50 mt-1.5 block">{notification.time}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-5 text-center text-white/70 text-sm">
                          <p>No tienes notificaciones nuevas.</p>
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </SidebarMenuItem>

              {/* Cerrar Sesión Link como SidebarMenuItem */}
              <SidebarMenuItem>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-all text-base font-medium w-full"
                  type="button"
                >
                  <XCircle className="h-6 w-6" />
                  <span>Cerrar sesión</span>
                </button>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}