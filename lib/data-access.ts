import { db } from "@/lib/db"
import { RESTAURANT_NAMES, type RestaurantId } from "@/lib/auth"

/**
 * Get or create restaurant by tenant ID (A, B, or C)
 */
export async function getRestaurantByTenantId(tenantId: RestaurantId) {
  // Try to find restaurant by tenantId (if exists) or by name
  let restaurant = await db.restaurant.findFirst({
    where: {
      OR: [
        // If tenantId field exists in schema
        // { tenantId },
        // Fallback to name matching
        { name: RESTAURANT_NAMES[tenantId] },
      ],
    },
    include: {
      categories: true,
      locations: true,
    },
  })

  if (restaurant) return restaurant

  // Create restaurant if it doesn't exist
  return await db.restaurant.create({
    data: {
      name: RESTAURANT_NAMES[tenantId],
      alertDaysBeforeExpiry: 3,
      categories: {
        create: [
          { name: "Frescos" },
          { name: "Congelados" },
          { name: "Secos" },
        ],
      },
      locations: {
        create: [
          { name: "Frigorífico 1" },
          { name: "Despensa" },
          { name: "Arca" },
        ],
      },
    },
    include: {
      categories: true,
      locations: true,
    },
  })
}

/**
 * Legacy function - uses first restaurant found
 * @deprecated Use getRestaurantByTenantId instead
 */
export async function getRestaurant() {
  const restaurant = await db.restaurant.findFirst({
    include: {
      categories: true,
      locations: true,
    },
  })

  if (restaurant) return restaurant

  return await db.restaurant.create({
    data: {
      name: "Meu Restaurante",
      alertDaysBeforeExpiry: 3,
      categories: {
        create: [
          { name: "Frescos" },
          { name: "Congelados" },
          { name: "Secos" },
        ],
      },
      locations: {
        create: [
          { name: "Frigorífico 1" },
          { name: "Despensa" },
          { name: "Arca" },
        ],
      },
    },
    include: {
      categories: true,
      locations: true,
    },
  })
}

/**
 * Get or create user for a restaurant
 * Creates unique email per restaurant to avoid unique constraint errors
 */
export async function getUser(restaurantId: string) {
  // Try to find existing user for this restaurant
  const user = await db.user.findFirst({
    where: { restaurantId }
  })

  if (user) return user

  // Create user with unique email based on restaurantId
  // This ensures each restaurant has its own user without email conflicts
  const uniqueEmail = `demo-${restaurantId}@example.com`;

  try {
    return await db.user.create({
      data: {
        name: "Demo User",
        email: uniqueEmail,
        restaurantId,
      }
    })
  } catch (error) {
    // If email already exists (shouldn't happen), try to find the user
    console.error("Error creating user, trying to find existing:", error);
    const existingUser = await db.user.findUnique({
      where: { email: uniqueEmail }
    });
    
    if (existingUser) {
      return existingUser;
    }
    
    // If still can't find, throw the error
    throw error;
  }
}
