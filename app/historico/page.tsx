import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getRestaurantByTenantId } from "@/lib/data-access";
import { isValidRestaurantIdentifier } from "@/lib/auth";
import { AuthGuard } from "@/components/auth-guard";
import { HistoryContent } from "@/components/history-content";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Histórico & Encomendas page - Protected route
 * Shows monthly history (ENTRY and WASTE events) for decision making
 */
export default async function HistoricoPage() {
  // Check authentication via cookie
  const cookieStore = await cookies();
  const restaurantId = cookieStore.get("clearstock_restaurantId")?.value;

  if (!restaurantId || !isValidRestaurantIdentifier(restaurantId)) {
    redirect("/acesso");
  }

  try {
    const restaurant = await getRestaurantByTenantId(restaurantId);

    // Check for expired batches and register WASTE events
    const { checkAndRegisterExpiredBatches } = await import("@/app/actions");
    await checkAndRegisterExpiredBatches(restaurant.id);

    return (
      <AuthGuard>
        <HistoryContent restaurantId={restaurant.id} />
      </AuthGuard>
    );
  } catch (error) {
    console.error("Error loading history page:", error);
    redirect("/acesso");
  }
}
