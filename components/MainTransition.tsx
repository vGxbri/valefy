// app/components/MainTransition.tsx
"use client";

import { useEffect, useState } from "react";

export default function MainTransition({
  children,
}: {
  children: React.ReactNode;
}) {
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
    return (
      <div className="w-full flex items-center justify-center py-10">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary" />
      </div>
    );
  }

  return (
    <div
      className={`transition-opacity duration-1500 ease-in-out w-full ${showContent ? "opacity-100" : "opacity-0"}`}
    >
      <main className="w-full max-w-full">{children}</main>
    </div>
  );
}
