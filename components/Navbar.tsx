"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import clsx from "clsx";
import {
  HomeIcon,
  RectangleStackIcon,
  ArchiveBoxIcon,
  ArrowsRightLeftIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

const navigationItems = [
  { name: "Principal", href: "/main", icon: HomeIcon },
  { name: "Catálogo", href: "/main/catalogo", icon: RectangleStackIcon },
  { name: "Inventario", href: "/main/inventario", icon: ArchiveBoxIcon },
  { name: "Intercambios", href: "/main/trade", icon: ArrowsRightLeftIcon },
  { name: "Ajustes", href: "/main/ajustes", icon: Cog6ToothIcon },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex h-screen w-20 flex-col items-center border-r border-white/10 bg-background/80 backdrop-blur-md">
      <div className="flex h-20 w-full items-center justify-center border-b border-white/10">
        <Link href="/main">
          <Image
            alt="Valefy Icon"
            className="rounded-lg"
            height={40}
            src="/logo-valefy-icon.png"
            width={40}
          />
        </Link>
      </div>
      <nav className="flex flex-1 flex-col items-center space-y-4 p-4">
        {navigationItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/main" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              className={clsx(
                "group relative flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-200 ease-in-out",
                isActive
                  ? "bg-primary text-white shadow-lg shadow-primary/30"
                  : "text-white/60 hover:bg-white/10 hover:text-white",
              )}
              href={item.href}
              title={item.name}
            >
              <item.icon className="h-6 w-6" />
              {isActive && (
                <span className="absolute -right-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
