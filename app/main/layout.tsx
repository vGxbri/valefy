"use client";

import { ReactNode, useEffect, useState } from "react";
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Navbar } from "@/components/Navbar";
import { BellIcon, UserCircleIcon } from "@heroicons/react/24/outline";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import Loading from "@/app/loading";

interface MainLayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    } else if (status === 'authenticated') {
      setIsLoading(false);
    }
  }, [status, router]);

  const handleTransitionComplete = () => {
    setShowContent(true);
  };

  if (status === 'loading' || status === 'unauthenticated' || isLoading) {
    return <Loading onTransitionComplete={handleTransitionComplete} />;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <div className={`transition-opacity duration-1500 ease-in-out ${showContent ? 'opacity-100' : 'opacity-0'}`}>
        <main>
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}