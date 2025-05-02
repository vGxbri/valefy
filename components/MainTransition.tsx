// app/components/MainTransition.tsx
"use client";

import { useEffect, useState } from "react";

export default function MainTransition({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      setShowContent(true);
    }
  }, [isLoading]);

  if (isLoading) {
    return <div>Cargando...</div>; // O tu componente <Loading />
  }

  return (
    <div className={`transition-opacity duration-1500 ease-in-out ${showContent ? "opacity-100" : "opacity-0"}`}>
      <main>{children}</main>
    </div>
  );
}