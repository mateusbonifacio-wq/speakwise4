import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChefHat } from "lucide-react";

/**
 * Landing page - Public, no authentication required
 * Mobile-first hero with centered content and full-width button
 */
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 md:gap-8 text-center px-4 py-8">
      {/* Icon and Title - Mobile optimized spacing */}
      <div className="flex flex-col items-center gap-3 md:gap-4">
        <div className="rounded-full bg-primary/10 p-3 md:p-4">
          <ChefHat className="h-10 w-10 md:h-12 md:w-12 text-primary" />
        </div>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
          Clearstok
        </h1>
        <p className="max-w-[600px] text-base md:text-lg lg:text-xl text-muted-foreground px-4">
          Controla validades, evita desperdício, organiza o stock da tua cozinha.
        </p>
      </div>

      {/* CTA Button - Full width on mobile, auto width on desktop */}
      <div className="w-full max-w-sm">
        <Link href="/acesso" className="block w-full">
          <Button size="lg" className="w-full bg-indigo-600 text-white rounded-lg py-3 px-4 shadow-md hover:bg-indigo-700 font-semibold text-base md:text-lg">
            Entrar na aplicação
          </Button>
        </Link>
      </div>
    </div>
  );
}
