"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { usePathname } from "next/navigation";

/**
 * Floating Action Button - Mobile only
 * Quick access to create new entry from any authenticated page
 */
export function FloatingActionButton() {
  const pathname = usePathname();
  const publicRoutes = ["/", "/acesso"];

  // Only show on authenticated pages
  if (publicRoutes.includes(pathname)) {
    return null;
  }

  return (
    <Link
      href="/nova-entrada"
      className="fixed bottom-4 right-4 z-50 bg-indigo-600 text-white rounded-full p-4 shadow-lg hover:bg-indigo-700 transition-colors md:hidden touch-manipulation"
      aria-label="Nova entrada"
    >
      <Plus className="h-6 w-6" />
    </Link>
  );
}

