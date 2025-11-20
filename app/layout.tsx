import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ConditionalNav } from "@/components/conditional-nav";
import { SyncAuthCookie } from "@/components/sync-auth-cookie";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Clearstok",
  description: "Clearstok - Aplicação para gestão de validades em restauração",
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
          {/* Mobile-first padding: py-4 px-4 on mobile, py-6 on desktop */}
          <main className="flex-1 container py-4 px-4 md:py-6 md:px-6 max-w-4xl mx-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
