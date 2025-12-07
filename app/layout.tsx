import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ConditionalNav } from "@/components/conditional-nav";
import { SyncAuthCookie } from "@/components/sync-auth-cookie";
import { FloatingActionButton } from "@/components/floating-action-button";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Clearstock",
  description: "Clearstock - Aplicação para gestão de validades em restauração",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt">
      <body className={cn(inter.className, "min-h-screen bg-background font-sans antialiased")}>
        <SyncAuthCookie />
        <div className="relative flex min-h-screen flex-col">
          <ConditionalNav />
          {/* Mobile-first container: max-w-3xl on desktop, full width on mobile */}
          <main className="flex-1 w-full py-4 px-4 md:py-6 md:px-6 max-w-3xl mx-auto">
            {children}
          </main>
          {/* Floating Action Button - Mobile only */}
          <FloatingActionButton />
        </div>
        {/* Toast notifications */}
        <Toaster position="top-center" richColors />
        {/* Vercel Analytics */}
        <Analytics />
        {/* Vercel Speed Insights */}
        <SpeedInsights />
      </body>
    </html>
  );
}
