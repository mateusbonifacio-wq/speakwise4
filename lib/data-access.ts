import { db } from "@/lib/db"
import { RESTAURANT_NAMES, PIN_TO_RESTAURANT, type RestaurantId } from "@/lib/auth"

/**
 * Get restaurant by PIN
 */
export async function getRestaurantByPin(pin: string) {
  const trimmedPin = pin.trim();
  const restaurant = await db.restaurant.findUnique({
    where: { pin: trimmedPin },
    include: {
      categories: true,
      locations: true,
    },
  });
  return restaurant;
}

/**
 * Get or create restaurant by tenant ID (A, B, or C) or restaurant ID
 * This is used for backward compatibility with the cookie-based system
 * Also supports direct restaurant IDs for new PINs not in the mapping
 */
export async function getRestaurantByTenantId(tenantId: RestaurantId | string) {
  // If tenantId is a restaurant ID (cuid format, longer than 10 chars and not in RESTAURANT_IDS)
  // This handles new PINs that use restaurant.id directly
  if (tenantId.length > 10 && !RESTAURANT_IDS.includes(tenantId as RestaurantId)) {
    const restaurant = await db.restaurant.findUnique({
      where: { id: tenantId },
      include: {
        categories: true,
        locations: true,
      },
    });
    if (restaurant) return restaurant;
    throw new Error(`Restaurant with ID ${tenantId} not found`);
  }

  // Find the PIN for this tenant ID (for legacy RestaurantId like "A", "B", etc.)
  const pin = Object.entries(PIN_TO_RESTAURANT).find(
    ([_, id]) => id === tenantId
  )?.[0];

  if (pin) {
    // Try to find restaurant by PIN first
    let restaurant = await db.restaurant.findUnique({
      where: { pin },
      include: {
        categories: true,
        locations: true,
      },
    });

    if (restaurant) return restaurant;

    // Create restaurant if it doesn't exist
    return await db.restaurant.create({
      data: {
        pin,
        name: RESTAURANT_NAMES[tenantId],
        alertDaysBeforeExpiry: 3,
        alertDaysBeforeExpiryMP: 3,
        alertDaysBeforeExpiryTransformado: 1,
        categories: {
          create: [
            // Matérias-primas
            { name: "Frescos", tipo: "mp" },
            { name: "Congelados", tipo: "mp" },
            { name: "Secos", tipo: "mp" },
            // Transformados
            { name: "Salgados", tipo: "transformado" },
            { name: "Sopas", tipo: "transformado" },
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
    });
  }

  // Fallback: try to find by name (for backward compatibility)
  let restaurant = await db.restaurant.findFirst({
    where: {
      name: RESTAURANT_NAMES[tenantId],
    },
    include: {
      categories: true,
      locations: true,
    },
  });

  if (restaurant) return restaurant;

  // Last resort: create with a default PIN
  const defaultPin = Object.keys(PIN_TO_RESTAURANT).find(
    (p) => PIN_TO_RESTAURANT[p] === tenantId
  ) || "0000";

  return await db.restaurant.create({
    data: {
      pin: defaultPin,
      name: RESTAURANT_NAMES[tenantId],
      alertDaysBeforeExpiry: 3,
      alertDaysBeforeExpiryMP: 3,
      alertDaysBeforeExpiryTransformado: 1,
      categories: {
        create: [
          { name: "Frescos", tipo: "mp" },
          { name: "Congelados", tipo: "mp" },
          { name: "Secos", tipo: "mp" },
          { name: "Salgados", tipo: "transformado" },
          { name: "Sopas", tipo: "transformado" },
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
  });
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
      pin: "0000", // Default PIN for legacy function
      name: "Meu Restaurante",
      alertDaysBeforeExpiry: 3,
      alertDaysBeforeExpiryMP: 3,
      alertDaysBeforeExpiryTransformado: 1,
      categories: {
        create: [
          // Matérias-primas
          { name: "Frescos", tipo: "mp" },
          { name: "Congelados", tipo: "mp" },
          { name: "Secos", tipo: "mp" },
          // Transformados
          { name: "Salgados", tipo: "transformado" },
          { name: "Sopas", tipo: "transformado" },
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
