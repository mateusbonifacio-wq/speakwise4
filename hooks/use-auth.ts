"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import * as React from "react";
import {
  isAuthenticated,
  getRestaurantId,
  hasValidSession,
  setAuth,
  clearAuth,
  type RestaurantId,
} from "@/lib/auth";

/**
 * Hook to manage authentication state
 * Provides current auth status and restaurant ID
 * Now checks for valid session first
 */
export function useAuth() {
  const [authenticated, setAuthenticated] = useState(false);
  const [restaurantId, setRestaurantId] = useState<RestaurantId | null>(null);
  const [loading, setLoading] = useState(true);
  const checkCountRef = useRef(0);

  useEffect(() => {
    // Check auth status on mount and whenever storage changes
    const checkAuth = () => {
      checkCountRef.current += 1;
      console.log("[useAuth] checkAuth call #", checkCountRef.current);
      
      // First check for valid session (7-day persistence)
      const hasSession = hasValidSession();
      // Fallback to old auth check for backward compatibility
      const isAuth = hasSession || isAuthenticated();
      const restId = getRestaurantId();
      
      // Only update state if values actually changed (prevents unnecessary re-renders)
      setAuthenticated((prev) => {
        if (prev !== isAuth) {
          console.log("[useAuth] Auth state changed:", prev, "->", isAuth);
          return isAuth;
        }
        return prev;
      });
      
      setRestaurantId((prev) => {
        if (prev !== restId) {
          console.log("[useAuth] RestaurantId changed:", prev, "->", restId);
          return restId;
        }
        return prev;
      });
      
      setLoading((prev) => {
        if (prev !== false) {
          console.log("[useAuth] Loading finished");
          return false;
        }
        return prev;
      });
    };

    checkAuth();

    // Listen for storage changes (e.g., in other tabs)
    // Throttle to prevent excessive calls
    let storageTimeout: NodeJS.Timeout | null = null;
    const handleStorageChange = () => {
      if (storageTimeout) return;
      storageTimeout = setTimeout(() => {
        checkAuth();
        storageTimeout = null;
      }, 100);
    };

    window.addEventListener("storage", handleStorageChange);
    
    // Also check on focus in case auth changed in another tab (throttled)
    let focusTimeout: NodeJS.Timeout | null = null;
    const handleFocus = () => {
      if (focusTimeout) return;
      focusTimeout = setTimeout(() => {
        checkAuth();
        focusTimeout = null;
      }, 100);
    };
    
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", handleFocus);
      if (storageTimeout) clearTimeout(storageTimeout);
      if (focusTimeout) clearTimeout(focusTimeout);
    };
  }, []);

  return {
    authenticated,
    restaurantId,
    loading,
    setAuth,
    clearAuth,
  };
}

/**
 * Hook to protect routes - redirects to /acesso if not authenticated
 * CRITICAL FIX: Removed router from dependencies to prevent infinite loops
 */
export function useAuthGuard() {
  const router = useRouter();
  const { authenticated, loading } = useAuth();
  const hasRedirected = React.useRef(false);

  useEffect(() => {
    // Only redirect once, and only when we're sure about auth status
    if (!loading && !authenticated && !hasRedirected.current) {
      console.log("[useAuthGuard] Redirecting to /acesso - not authenticated");
      hasRedirected.current = true;
      router.push("/acesso");
    }
    
    // Reset redirect flag if authenticated (for when user logs in)
    if (authenticated) {
      hasRedirected.current = false;
    }
  }, [authenticated, loading]); // Removed router from deps - it's stable

  return { authenticated, loading };
}

