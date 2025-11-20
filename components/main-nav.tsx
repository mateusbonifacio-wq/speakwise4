"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, PlusCircle, Package, Settings, Menu } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"

export function MainNav() {
  const pathname = usePathname()
  const [open, setOpen] = React.useState(false)

  const routes = [
    {
      href: "/hoje",
      label: "Hoje",
      icon: LayoutDashboard,
      active: pathname === "/hoje" || pathname === "/dashboard",
    },
    {
      href: "/nova-entrada",
      label: "Nova Entrada",
      icon: PlusCircle,
      active: pathname === "/nova-entrada" || pathname === "/entries/new",
    },
    {
      href: "/stock",
      label: "Stock",
      icon: Package,
      active: pathname === "/stock",
    },
    {
      href: "/definicoes",
      label: "Definições",
      icon: Settings,
      active: pathname === "/definicoes" || pathname === "/settings",
    },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/95">
      {/* Mobile-first: h-12 on mobile for compact, h-14 on desktop */}
      <div className="container flex h-12 md:h-14 items-center px-4 md:px-6">
        {/* Desktop navigation - hidden on mobile */}
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold">
              Clearstok
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  "transition-colors hover:text-foreground/80 px-3 py-2 rounded-md text-sm font-medium",
                  route.active ? "text-foreground bg-indigo-50 text-indigo-600" : "text-foreground/60"
                )}
              >
                {route.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Mobile Menu - Visible on mobile, hidden on desktop */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-10 w-10" // Larger touch target on mobile
              aria-label="Toggle Menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] sm:w-[300px]">
            <Link
              href="/"
              className="flex items-center py-4"
              onClick={() => setOpen(false)}
            >
              <span className="text-lg font-bold">Clearstok</span>
            </Link>
            <nav className="flex flex-col space-y-1 mt-2">
              {routes.map((route) => (
                <Link
                  key={route.href}
                  href={route.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 text-base font-medium rounded-lg transition-colors",
                    route.active 
                      ? "text-foreground bg-indigo-50 text-indigo-600" 
                      : "text-foreground/70 hover:text-foreground hover:bg-gray-50"
                  )}
                >
                  <route.icon className="h-5 w-5" />
                  {route.label}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        {/* Mobile: Show app name next to menu button */}
        <Link href="/" className="md:hidden ml-2 font-bold text-base">
          Clearstok
        </Link>
        
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            {/* Search could go here */}
          </div>
        </div>
      </div>
    </header>
  )
}
