"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { getRestaurantId, isAuthenticated } from "@/lib/auth";

/**
 * Client component to sync localStorage auth state to cookies
 * This allows server components to read restaurantId from cookies
 * OPTIMIZED: Only syncs when pathname actually changes, prevents unnecessary re-renders
 */
export function SyncAuthCookie() {
  const pathname = usePathname();
  const publicRoutes = ["/", "/acesso"];
  const lastPathnameRef = useRef<string | null>(null);
  const lastRestaurantIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Skip if pathname hasn't changed
    if (lastPathnameRef.current === pathname) {
      return;
    }
    
    lastPathnameRef.current = pathname;

      // Only sync on authenticated routes
      if (publicRoutes.includes(pathname)) {
        // Clear cookie on public routes (only if it was set)
        if (lastRestaurantIdRef.current !== null) {
          console.log("[SyncAuthCookie] Clearing cookie on public route:", pathname);
          document.cookie = "clearstock_restaurantId=; path=/; max-age=0";
          lastRestaurantIdRef.current = null;
        }
        return;
      }

      // Sync localStorage to cookie
      if (isAuthenticated()) {
        const restaurantId = getRestaurantId();
        if (restaurantId) {
          // Only update cookie if restaurantId changed
          if (lastRestaurantIdRef.current !== restaurantId) {
            console.log("[SyncAuthCookie] Syncing cookie for restaurantId:", restaurantId);
            // Set cookie (expires in 7 days)
            const expires = new Date();
            expires.setTime(expires.getTime() + 7 * 24 * 60 * 60 * 1000);
            document.cookie = `clearstock_restaurantId=${restaurantId}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
            lastRestaurantIdRef.current = restaurantId;
          }
        }
      } else {
        // Clear cookie if not authenticated (only if it was set)
        if (lastRestaurantIdRef.current !== null) {
          console.log("[SyncAuthCookie] Clearing cookie - not authenticated");
          document.cookie = "clearstock_restaurantId=; path=/; max-age=0";
          lastRestaurantIdRef.current = null;
        }
      }
  }, [pathname]);

  return null;
}

