import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getRestaurantByTenantId } from "@/lib/data-access";
import NewEntryForm from "@/components/new-entry-form";
import { AuthGuard } from "@/components/auth-guard";
import { isValidRestaurantIdentifier } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Protected route: /nova-entrada (alias for /entries/new)
 * Redirects to /acesso if not authenticated
 */
export default async function NovaEntradaPage() {
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
        <NewEntryForm
          restaurantId={restaurant.id}
          categories={restaurant.categories}
          locations={restaurant.locations}
        />
      </AuthGuard>
    );
  } catch (error) {
    console.error("Error loading new entry page:", error);
    return (
      <AuthGuard>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Nova Entrada</h1>
            <p className="text-muted-foreground">
              Adicione um novo produto ao stock.
            </p>
          </div>
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-12 text-center text-destructive">
            <p className="text-lg font-medium mb-2">
              Erro ao carregar formulário
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

