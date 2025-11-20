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
      href: "/dashboard",
      label: "Hoje",
      icon: LayoutDashboard,
      active: pathname === "/dashboard",
    },
    {
      href: "/entries/new",
      label: "Nova Entrada",
      icon: PlusCircle,
      active: pathname === "/entries/new",
    },
    {
      href: "/stock",
      label: "Stock",
      icon: Package,
      active: pathname === "/stock",
    },
    {
      href: "/settings",
      label: "Definições",
      icon: Settings,
      active: pathname === "/settings",
    },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block">
              ValidadeApp
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  "transition-colors hover:text-foreground/80",
                  route.active ? "text-foreground" : "text-foreground/60"
                )}
              >
                {route.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Mobile Menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="pr-0">
            <Link
              href="/"
              className="flex items-center"
              onClick={() => setOpen(false)}
            >
              <span className="font-bold">ValidadeApp</span>
            </Link>
            <div className="my-4 pb-10 pl-6">
              <div className="flex flex-col space-y-3">
                {routes.map((route) => (
                  <Link
                    key={route.href}
                    href={route.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-2 text-sm font-medium transition-colors hover:text-foreground/80",
                      route.active ? "text-foreground" : "text-foreground/60"
                    )}
                  >
                    <route.icon className="h-4 w-4" />
                    {route.label}
                  </Link>
                ))}
              </div>
            </div>
          </SheetContent>
        </Sheet>
        
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            {/* Search could go here */}
          </div>
        </div>
      </div>
    </header>
  )
}
