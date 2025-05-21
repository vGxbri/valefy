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
      <Toaster position="top-right" richColors />
      <HeroUIProvider navigate={router.push}>{children}</HeroUIProvider>
    </>
  );
}
