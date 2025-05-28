"use client";

import * as React from "react";
import { HeroUIProvider } from "@heroui/system";
import { useRouter } from "next/navigation";
import { Toaster } from "sonner";

export interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const router = useRouter();

  return (
    <>
      <Toaster 
        position="bottom-right" 
        richColors 
        expand={false}
        visibleToasts={4}
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'white',
            backdropFilter: 'blur(16px)',
            borderRadius: '12px',
            boxShadow: '0 10px 40px -5px rgba(0, 0, 0, 0.3)',
            padding: '16px',
            fontSize: '14px',
            fontWeight: '500',
          },
          classNames: {
            error: 'border-red-500/30 bg-gradient-to-r from-red-500/10 to-red-600/10',
            success: 'border-green-500/30 bg-gradient-to-r from-green-500/10 to-green-600/10',
            warning: 'border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-yellow-600/10',
            info: 'border-blue-500/30 bg-gradient-to-r from-blue-500/10 to-blue-600/10',
          },
        }}
      />
      <HeroUIProvider navigate={router.push}>{children}</HeroUIProvider>
    </>
  );
}
