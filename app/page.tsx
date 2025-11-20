import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChefHat } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-8 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="rounded-full bg-primary/10 p-4">
          <ChefHat className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">
          ValidadeApp
        </h1>
        <p className="max-w-[600px] text-muted-foreground md:text-xl">
          Gestão inteligente de validades e stock para o seu restaurante.
          Evite desperdícios e mantenha tudo organizado.
        </p>
      </div>

      <div className="flex gap-4">
        <Link href="/dashboard">
          <Button size="lg" className="font-semibold">
            Entrar na Aplicação
          </Button>
        </Link>
      </div>
    </div>
  );
}
