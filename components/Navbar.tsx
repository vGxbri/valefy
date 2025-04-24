import Image from "next/image";
import { Link } from "@heroui/link";
import { button as buttonStyles } from "@heroui/theme";

export function Navbar() {
  return (
    <nav className="fixed pt-3 pb-3 top-0 w-full border-b border-divider bg-background/70 backdrop-blur-xl z-50">
      <div className="container mx-auto max-w-7xl flex items-center justify-between px-6 h-16">
        {/* Logo section */}
        <div className="flex items-center">
          <Link className="flex items-center gap-1" href="/">
            <Image
              alt="Valefy Logo"
              className="object-contain"
              height={40}
              src="/logo-white.png"
              width={120}
            />
          </Link>
        </div>

        {/* Right section with button */}
        <div className="flex items-center gap-4">
          <Link
            className={buttonStyles({
              color: "primary",
              radius: "full",
              variant: "shadow",
              size: "lg",
            })}
            href="/app"
          >
            Continuar
          </Link>
        </div>
      </div>
    </nav>
  );
}
