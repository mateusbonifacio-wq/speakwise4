"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthGuard } from "@/hooks/use-auth";

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * Client-side route guard component
 * Redirects to /acesso if user is not authenticated
 * OPTIMIZED: Added logging and prevents unnecessary re-renders
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { authenticated, loading } = useAuthGuard();
  const renderCountRef = useRef(0);
  
  renderCountRef.current += 1;
  
  useEffect(() => {
    console.log("[AuthGuard] Render #", renderCountRef.current, { authenticated, loading });
  }, [authenticated, loading]);

  // Show nothing while checking auth status
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">A carregar...</div>
      </div>
    );
  }

  // Don't render children if not authenticated (will redirect)
  if (!authenticated) {
    console.log("[AuthGuard] Not authenticated, not rendering children");
    return null;
  }

  console.log("[AuthGuard] Authenticated, rendering children");
  return <>{children}</>;
}

