import { getRestaurant } from "@/lib/data-access";
import NewEntryForm from "@/components/new-entry-form";

export const dynamic = "force-dynamic";

export default async function NewEntryPage() {
  const restaurant = await getRestaurant();

  return (
    <NewEntryForm
      restaurantId={restaurant.id}
      categories={restaurant.categories}
      locations={restaurant.locations}
    />
  );
}
