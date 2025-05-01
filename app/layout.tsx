import "@/styles/globals.css";
import { Metadata, Viewport } from "next";
import clsx from "clsx";

import { Providers } from "./providers";

// Add this import
import { siteConfig } from "@/config/site";
import { fontSans } from "@/config/fonts";
import { SessionProvider } from "next-auth/react";

import Loading from "./loading";

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning lang="en">
      <head />
      <body
        className={clsx(
          "min-h-screen font-sans antialiased bg-background text-text",
          fontSans.variable,
        )}
      >
        <Providers>
          <SessionProvider>
            <div className="relative flex flex-col h-screen">
              <div className="relative flex flex-col h-screen">
                <main className="dark relative z-10">
                  <Loading>
                    {children}
                  </Loading>
                </main>
              </div>
            </div>
          </SessionProvider>
        </Providers>
      </body>
    </html>
  );
}
