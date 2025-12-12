import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getRestaurantByTenantId } from "@/lib/data-access";
import SettingsContent from "@/components/settings-content";
import { AuthGuard } from "@/components/auth-guard";
import { isValidRestaurantIdentifier } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Protected route: /definicoes (alias for /settings)
 * Redirects to /acesso if not authenticated
 */
export default async function DefinicoesPage() {
  // Check authentication via cookie
  const cookieStore = await cookies();
  const restaurantId = cookieStore.get("clearstock_restaurantId")?.value;

  if (!restaurantId || !isValidRestaurantIdentifier(restaurantId)) {
    redirect("/acesso");
  }

  try {
    const restaurant = await getRestaurantByTenantId(restaurantId);

    return (
      <AuthGuard>
        <SettingsContent restaurant={restaurant} />
      </AuthGuard>
    );
  } catch (error) {
    console.error("Error loading settings page:", error);
    return (
      <AuthGuard>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Definições</h1>
            <p className="text-muted-foreground">
              Gerir configurações do restaurante
            </p>
          </div>
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-12 text-center text-destructive">
            <p className="text-lg font-medium mb-2">
              Erro ao carregar definições
            </p>
            <p className="text-sm text-muted-foreground">
              Por favor, recarregue a página ou contacte o suporte.
            </p>
          </div>
        </div>
      </AuthGuard>
    );
  }
}

