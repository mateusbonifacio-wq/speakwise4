import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MainNav } from "@/components/main-nav";
import { getRestaurantByTenantId } from "@/lib/data-access";
import { RESTAURANT_IDS, type RestaurantId } from "@/lib/auth";
import { ConditionalNavClient } from "@/components/conditional-nav-client";

/**
 * Server component that conditionally renders MainNav only on authenticated pages
 * Hides navbar on landing page (/) and access page (/acesso)
 */
export async function ConditionalNav() {
  // Get pathname from headers (we'll use a client component for this)
  // For now, we'll fetch restaurant data if authenticated
  const cookieStore = await cookies();
  const restaurantId = cookieStore.get("clearstock_restaurantId")?.value;

  // If not authenticated, don't show nav (client component will handle route checking)
  if (!restaurantId || !RESTAURANT_IDS.includes(restaurantId as RestaurantId)) {
    return <ConditionalNavClient restaurantName={null} />;
  }

  // Fetch restaurant to get name
  try {
    const restaurant = await getRestaurantByTenantId(restaurantId as RestaurantId);
    return <ConditionalNavClient restaurantName={restaurant.name} />;
  } catch (error) {
    console.error("Error fetching restaurant for nav:", error);
    return <ConditionalNavClient restaurantName={null} />;
  }
}

