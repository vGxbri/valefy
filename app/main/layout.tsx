import { ReactNode } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/app/auth";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import MainTransition from "@/components/MainTransition";

export default async function Layout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  return (
    <SidebarProvider>
      <div className="bg-background">
        <AppSidebar />
      </div>
      <MainTransition>{children}</MainTransition>
    </SidebarProvider>
  );
}
