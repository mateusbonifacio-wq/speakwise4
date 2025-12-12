import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AuthGuard } from "@/components/auth-guard";
import DashboardContent from "@/components/dashboard-content";
import { isValidRestaurantIdentifier } from "@/lib/auth";
import { getRestaurantByTenantId } from "@/lib/data-access";

export const dynamic = "force-dynamic";

/**
 * Protected route: /hoje (alias for /dashboard)
 * Redirects to /acesso if not authenticated
 */
export default async function HojePage() {
  // Check authentication via cookie (set by client)
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
        <DashboardContent restaurantId={restaurantId as RestaurantId} />
      </AuthGuard>
    );
  } catch (error) {
    console.error("Error loading hoje page:", error);
    redirect("/acesso");
  }
}

