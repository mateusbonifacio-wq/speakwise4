"use client";

import { usePathname } from "next/navigation";
import { MainNav } from "@/components/main-nav";

/**
 * Conditionally renders MainNav only on authenticated pages
 * Hides navbar on landing page (/) and access page (/acesso)
 */
export function ConditionalNav() {
  const pathname = usePathname();

  // Public routes where navbar should NOT be shown
  const publicRoutes = ["/", "/acesso"];

  // Don't show navbar on public routes
  if (publicRoutes.includes(pathname)) {
    return null;
  }

  // Show navbar on all other routes (protected routes)
  // The server-side AuthGuard will redirect if not authenticated
  return <MainNav />;
}

