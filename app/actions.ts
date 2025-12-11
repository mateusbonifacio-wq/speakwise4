"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getRestaurantByTenantId, getUser, getRestaurantByPin } from "@/lib/data-access";
import { RESTAURANT_NAMES, RESTAURANT_IDS, PIN_TO_RESTAURANT, normalizePIN, type RestaurantId } from "@/lib/auth";

/**
 * Helper to get restaurantId from cookies in server actions
 */
async function getRestaurantIdFromCookie(): Promise<RestaurantId | null> {
  const cookieStore = await cookies();
  const restaurantId = cookieStore.get("clearstock_restaurantId")?.value;
  
  if (restaurantId && RESTAURANT_IDS.includes(restaurantId as RestaurantId)) {
    return restaurantId as RestaurantId;
  }
  
  return null;
}

// Simple in-memory cache to throttle checkAndRegisterExpiredBatches calls
// Key: restaurantId, Value: timestamp of last check
const expiredBatchesCheckCache = new Map<string, number>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

/**
 * Check for expired batches and register WASTE events for them
 * This function should be called periodically or when loading stock/history pages
 * OPTIMIZED: Uses batch queries instead of individual queries per batch
 * CACHED: Only runs once per minute per restaurant to avoid performance issues
 */
/**
 * Check for expired batches and mark them as expired
 * NOTE: This does NOT automatically create WASTE events
 * WASTE events should only be created when the user explicitly marks a product as waste
 * This function is kept for potential future use (e.g., marking batches as EXPIRED status)
 */
export async function checkAndRegisterExpiredBatches(restaurantId: string) {
  // Check cache to avoid running too frequently
  const lastCheck = expiredBatchesCheckCache.get(restaurantId);
  const now = Date.now();
  if (lastCheck && (now - lastCheck) < CACHE_TTL_MS) {
    console.log(`[checkAndRegisterExpiredBatches] Skipping check for restaurant ${restaurantId} (cached, last check ${Math.round((now - lastCheck) / 1000)}s ago)`);
    return { registered: 0, cached: true };
  }

  // Update cache
  expiredBatchesCheckCache.set(restaurantId, now);
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison

    // Find all ACTIVE batches that have expired
    const expiredBatches = await db.productBatch.findMany({
      where: {
        restaurantId,
        status: "ACTIVE",
        expiryDate: {
          lt: today, // expiryDate < today
        },
        quantity: {
          gt: 0, // Only batches with quantity > 0
        },
      },
      select: {
        id: true,
        name: true,
        quantity: true,
        unit: true,
        expiryDate: true,
        restaurantId: true,
      },
    });

    // NOTE: We no longer automatically create WASTE events for expired batches
    // WASTE events should only be created when the user explicitly marks a product as waste
    // This function is kept for potential future use (e.g., marking batches as EXPIRED status)
    // For now, we just return the count of expired batches without creating events
    console.log(`[checkAndRegisterExpiredBatches] Found ${expiredBatches.length} expired batches (no WASTE events created - user must explicitly mark as waste)`);
    return { registered: 0, expiredCount: expiredBatches.length };
  } catch (error) {
    console.error("[checkAndRegisterExpiredBatches] Error checking expired batches:", error);
    return { registered: 0, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function updateSettings(formData: FormData) {
  const tenantId = await getRestaurantIdFromCookie();
  if (!tenantId) throw new Error("Não autenticado");

  const restaurant = await getRestaurantByTenantId(tenantId);

  const alertDaysRaw = formData.get("alertDays");
  const alertDays = Number(alertDaysRaw ?? 3);

  await db.restaurant.update({
    where: { id: restaurant.id },
    data: {
      alertDaysBeforeExpiry: isNaN(alertDays) || alertDays <= 0 ? 3 : alertDays,
    },
  });

  revalidatePath("/definicoes", "page");
  revalidatePath("/settings", "page");
}

export async function getRestaurantNameByPin(pin: string) {
  try {
    const trimmedPin = pin.trim();
    // Normalize PIN (handle 4-digit backward compatibility)
    const normalizedPin = normalizePIN(trimmedPin);
    const restaurant = await getRestaurantByPin(normalizedPin);
    return restaurant?.name || null;
  } catch (error) {
    console.error("Error getting restaurant name by PIN:", error);
    return null;
  }
}

export async function validatePinAndLogin(pin: string) {
  try {
    const trimmedPin = pin.trim();
    
    // Normalize PIN (handle 4-digit backward compatibility)
    const normalizedPin = normalizePIN(trimmedPin);
    
    // Get restaurant by PIN
    const restaurant = await getRestaurantByPin(normalizedPin);
    
    if (!restaurant) {
      return {
        success: false,
        error: "PIN inválido. Tente novamente.",
      };
    }

    // Get the tenant ID from PIN mapping (for cookie compatibility)
    const tenantId = PIN_TO_RESTAURANT[normalizedPin];
    
    if (!tenantId) {
      return {
        success: false,
        error: "PIN não está associado a um restaurante válido.",
      };
    }

    // Set cookie for server components
    const cookieStore = await cookies();
    cookieStore.set("clearstock_restaurantId", tenantId, {
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      sameSite: "lax",
    });

    return {
      success: true,
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        pin: restaurant.pin,
      },
      needsOnboarding: !restaurant.name,
    };
  } catch (error) {
    console.error("Error validating PIN:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido ao validar PIN.";
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function updateRestaurantName(formData: FormData) {
  try {
    const tenantId = await getRestaurantIdFromCookie();
    if (!tenantId) {
      return {
        success: false,
        error: "Não autenticado. Por favor, faça login novamente.",
      };
    }

    const restaurant = await getRestaurantByTenantId(tenantId);
    const name = String(formData.get("name") ?? "").trim();

    if (!name) {
      return {
        success: false,
        error: "Por favor, forneça um nome para o restaurante.",
      };
    }

    await db.restaurant.update({
      where: { id: restaurant.id },
      data: {
        name,
      },
    });

    revalidatePath("/onboarding", "page");
    revalidatePath("/definicoes", "page");
    revalidatePath("/settings", "page");
    revalidatePath("/hoje", "page");
    revalidatePath("/dashboard", "page");

    return {
      success: true,
      message: `Nome do restaurante atualizado para "${name}"!`,
    };
  } catch (error) {
    console.error("Error updating restaurant name:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido ao atualizar nome do restaurante.";
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function createCategory(formData: FormData) {
  try {
    const tenantId = await getRestaurantIdFromCookie();
    if (!tenantId) {
      return {
        success: false,
        error: "Não autenticado. Por favor, faça login novamente.",
      };
    }

    const restaurant = await getRestaurantByTenantId(tenantId);
    const name = String(formData.get("name") ?? "").trim();
    const tipoRaw = String(formData.get("tipo") ?? "mp").trim();
    const tipo = (tipoRaw === "transformado" ? "transformado" : "mp") as "mp" | "transformado";

    if (!name) {
      return {
        success: false,
        error: "Por favor, forneça um nome para a categoria.",
      };
    }

    // Check if category already exists for this restaurant and tipo
    const existingCategory = await db.category.findFirst({
      where: {
        restaurantId: restaurant.id,
        name: name,
        tipo: tipo,
      },
    });

    if (existingCategory) {
      return {
        success: false,
        error: `A categoria "${name}" já existe para ${tipo === "mp" ? "matérias-primas" : "transformados"}.`,
      };
    }

    await db.category.create({
      data: {
        name,
        tipo,
        restaurantId: restaurant.id,
      },
    });

    // Only revalidate settings page - categories/locations appear in forms via server components
    revalidatePath("/definicoes", "page");
    revalidatePath("/settings", "page");

    return {
      success: true,
      message: `Categoria "${name}" criada com sucesso!`,
    };
  } catch (error) {
    console.error("Error creating category:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido ao criar categoria.";
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function createLocation(formData: FormData) {
  try {
    const tenantId = await getRestaurantIdFromCookie();
    if (!tenantId) {
      return {
        success: false,
        error: "Não autenticado. Por favor, faça login novamente.",
      };
    }

    const restaurant = await getRestaurantByTenantId(tenantId);
    const name = String(formData.get("name") ?? "").trim();

    if (!name) {
      return {
        success: false,
        error: "Por favor, forneça um nome para a localização.",
      };
    }

    // Check if location already exists for this restaurant
    const existingLocation = await db.location.findFirst({
      where: {
        restaurantId: restaurant.id,
        name: name,
      },
    });

    if (existingLocation) {
      return {
        success: false,
        error: `A localização "${name}" já existe.`,
      };
    }

    await db.location.create({
      data: {
        name,
        restaurantId: restaurant.id,
      },
    });

    // Only revalidate settings page - locations appear in forms via server components
    revalidatePath("/definicoes", "page");
    revalidatePath("/settings", "page");

    return {
      success: true,
      message: `Localização "${name}" criada com sucesso!`,
    };
  } catch (error) {
    console.error("Error creating location:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido ao criar localização.";
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function updateCategoryAlert(categoryId: string, formData: FormData) {
  try {
    const tenantId = await getRestaurantIdFromCookie();
    if (!tenantId) throw new Error("Não autenticado");

    const warningRaw = formData.get("warningDays");
    const urgentRaw = formData.get("alertDays");

    const warning =
      warningRaw && !isNaN(Number(warningRaw)) && Number(warningRaw) >= 0
        ? Number(warningRaw)
        : null;

    const urgent =
      urgentRaw && !isNaN(Number(urgentRaw)) && Number(urgentRaw) >= 0
        ? Number(urgentRaw)
        : null;

    await db.category.update({
      where: { 
        id: categoryId,
        restaurant: { name: RESTAURANT_NAMES[tenantId] },
      },
      data: {
        warningDaysBeforeExpiry: warning,
        alertDaysBeforeExpiry: urgent,
      },
    });

    revalidatePath("/definicoes", "page");
    revalidatePath("/settings", "page");
  } catch (error) {
    console.error("Error updating category alert:", error);
    throw error;
  }
}

/**
 * Server action wrappers to avoid passing functions to client components
 * These use hidden form fields to pass IDs
 */

export async function updateCategoryAlertById(formData: FormData) {
  "use server";
  const categoryId = formData.get("categoryId")?.toString();
  const warningDays = formData.get("warningDays")?.toString();
  const alertDays = formData.get("alertDays")?.toString();
  
  if (!categoryId) throw new Error("Category ID required");
  
  // Create new FormData with the values
  const newFormData = new FormData();
  if (warningDays) newFormData.set("warningDays", warningDays);
  if (alertDays) newFormData.set("alertDays", alertDays);
  
  return updateCategoryAlert(categoryId, newFormData);
}

export async function deleteCategoryById(formData: FormData) {
  "use server";
  const categoryId = formData.get("categoryId")?.toString();
  if (!categoryId) throw new Error("Category ID required");
  return deleteCategory(categoryId);
}

export async function deleteLocationById(formData: FormData) {
  "use server";
  const locationId = formData.get("locationId")?.toString();
  if (!locationId) throw new Error("Location ID required");
  return deleteLocation(locationId);
}

export async function deleteCategory(categoryId: string) {
  try {
    const tenantId = await getRestaurantIdFromCookie();
    if (!tenantId) throw new Error("Não autenticado");

    await db.category.delete({
      where: { 
        id: categoryId,
        restaurant: { name: RESTAURANT_NAMES[tenantId] },
      },
    });

    revalidatePath("/definicoes", "page");
    revalidatePath("/settings", "page");
    revalidatePath("/stock", "page");
  } catch (error) {
    console.error("Error deleting category:", error);
    throw error;
  }
}

export async function deleteLocation(locationId: string) {
  try {
    const tenantId = await getRestaurantIdFromCookie();
    if (!tenantId) throw new Error("Não autenticado");

    await db.location.delete({
      where: { 
        id: locationId,
        restaurant: { name: RESTAURANT_NAMES[tenantId] },
      },
    });

    revalidatePath("/definicoes", "page");
    revalidatePath("/settings", "page");
    revalidatePath("/stock", "page");
  } catch (error) {
    console.error("Error deleting location:", error);
    throw error;
  }
}

/**
 * Server action para criar nova entrada de produto
 * Retorna objeto com sucesso/erro para facilitar feedback no client
 */
export async function createProductBatch(formData: FormData) {
  try {
    const tenantId = await getRestaurantIdFromCookie();
    if (!tenantId) {
      return {
        success: false,
        error: "Não autenticado. Por favor, faça login novamente.",
      };
    }

    const restaurant = await getRestaurantByTenantId(tenantId);
    const user = await getUser(restaurant.id);

    const name = String(formData.get("name") ?? "").trim();
    const quantityRaw = formData.get("quantity");
    const unitRaw = String(formData.get("unit") ?? "").trim();
    const expiryDateRaw = formData.get("expiryDate");
    const tipoRaw = String(formData.get("tipo") ?? "mp").trim();
    const tipo = (tipoRaw === "transformado" ? "transformado" : "mp") as "mp" | "transformado";
    const categoryIdRaw = formData.get("categoryId");
    const locationIdRaw = formData.get("locationId");
    const packagingTypeRaw = formData.get("packagingType");
    const sizeRaw = formData.get("size");
    const sizeUnitRaw = formData.get("sizeUnit");

    if (!name || !quantityRaw || !expiryDateRaw) {
      return {
        success: false,
        error: "Por favor, preencha todos os campos obrigatórios (nome, quantidade e data de validade).",
      };
    }

    const quantity = Number(quantityRaw);
    const unit = unitRaw || "un";
    const expiryDate = new Date(String(expiryDateRaw));

    if (isNaN(expiryDate.getTime())) {
      return {
        success: false,
        error: "Data de validade inválida. Por favor, selecione uma data válida.",
      };
    }

    // Optional fields
    const packagingType = packagingTypeRaw && String(packagingTypeRaw).trim() !== "" ? String(packagingTypeRaw).trim() : null;
    const sizeRawValue = sizeRaw && String(sizeRaw).trim() !== "" ? String(sizeRaw).trim() : null;
    const size = sizeRawValue && !isNaN(Number(sizeRawValue)) && Number(sizeRawValue) > 0 ? Number(sizeRawValue) : null;
    const sizeUnit = size && sizeUnitRaw && String(sizeUnitRaw).trim() !== "" ? String(sizeUnitRaw).trim() : null;

    const finalQuantity = isNaN(quantity) || quantity <= 0 ? 1 : quantity;
    
    // Check if the product is already expired when being added
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
    const expiryDateOnly = new Date(expiryDate);
    expiryDateOnly.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
    const isAlreadyExpired = expiryDateOnly < today;
    
    // Create the batch and get its ID
    const createdBatch = await db.productBatch.create({
      data: {
        name,
        quantity: finalQuantity,
        unit,
        expiryDate,
        tipo,
        restaurantId: restaurant.id,
        userId: user.id,
        categoryId: categoryIdRaw && String(categoryIdRaw).trim() !== "" ? String(categoryIdRaw) : null,
        locationId: locationIdRaw && String(locationIdRaw).trim() !== "" ? String(locationIdRaw) : null,
        packagingType,
        size,
        sizeUnit,
      },
    });

    // Register event for history tracking
    // If product is already expired when added, register as WASTE, otherwise as ENTRY
    try {
      const eventType = isAlreadyExpired ? "WASTE" : "ENTRY";
      const event = await db.stockEvent.create({
        data: {
          restaurantId: restaurant.id,
          type: eventType,
          productName: name,
          quantity: finalQuantity,
          unit,
          batchId: createdBatch.id, // Link to the specific batch
        },
      });
      console.log(`[createProductBatch] Created ${eventType} event:`, {
        id: event.id,
        productName: name,
        quantity: finalQuantity,
        unit,
        restaurantId: restaurant.id,
        isAlreadyExpired,
        expiryDate: expiryDate.toISOString(),
        today: today.toISOString(),
      });
    } catch (eventError) {
      // Don't fail the whole operation if event creation fails
      console.error("[createProductBatch] Error creating stock event:", eventError);
    }

    // Only revalidate paths that actually need to be updated
    revalidatePath("/stock", "page");
    revalidatePath("/hoje", "page");

    return {
      success: true,
      message: `Entrada "${name}" adicionada com sucesso ao stock!`,
    };
  } catch (error) {
    console.error("Error creating product batch:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido ao guardar entrada.";
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function updateProductBatch(batchId: string, formData: FormData) {
  try {
    const tenantId = await getRestaurantIdFromCookie();
    if (!tenantId) throw new Error("Não autenticado");

    if (!batchId) {
      throw new Error("ID do batch não fornecido");
    }

    // Get current batch to check if name changed
    const currentBatch = await db.productBatch.findUnique({
      where: { id: batchId },
      select: { name: true, unit: true },
    });

    if (!currentBatch) {
      throw new Error("Batch não encontrado");
    }

    const name = String(formData.get("name") ?? "").trim();
    const quantityRaw = formData.get("quantity");
    const unitRaw = String(formData.get("unit") ?? "").trim();
    const expiryDateRaw = formData.get("expiryDate");
    const tipoRaw = String(formData.get("tipo") ?? "mp").trim();
    const tipo = (tipoRaw === "transformado" ? "transformado" : "mp") as "mp" | "transformado";
    const categoryIdRaw = formData.get("categoryId");
    const locationIdRaw = formData.get("locationId");
    const packagingTypeRaw = formData.get("packagingType");
    const sizeRaw = formData.get("size");
    const sizeUnitRaw = formData.get("sizeUnit");

    if (!name || !quantityRaw || !expiryDateRaw) {
      throw new Error("Campos obrigatórios em falta");
    }

    const quantity = Number(quantityRaw);
    const unit = unitRaw || "un";
    const expiryDateString = String(expiryDateRaw);
    const expiryDate = new Date(expiryDateString);

    if (isNaN(expiryDate.getTime())) {
      throw new Error("Data de validade inválida");
    }

    // Converter categoryId e locationId: se vazio ou "undefined", usar null
    const categoryId =
      categoryIdRaw && String(categoryIdRaw).trim() !== ""
        ? String(categoryIdRaw)
        : null;
    const locationId =
      locationIdRaw && String(locationIdRaw).trim() !== ""
        ? String(locationIdRaw)
        : null;

    // Optional fields
    const packagingType = packagingTypeRaw && String(packagingTypeRaw).trim() !== "" ? String(packagingTypeRaw).trim() : null;
    const sizeRawValue = sizeRaw && String(sizeRaw).trim() !== "" ? String(sizeRaw).trim() : null;
    const size = sizeRawValue && !isNaN(Number(sizeRawValue)) && Number(sizeRawValue) > 0 ? Number(sizeRawValue) : null;
    const sizeUnit = size && sizeUnitRaw && String(sizeUnitRaw).trim() !== "" ? String(sizeUnitRaw).trim() : null;

    // Check if name or unit changed
    const nameChanged = currentBatch.name !== name;
    const unitChanged = currentBatch.unit !== unit;

    // Update the batch
    await db.productBatch.update({
      where: { id: batchId },
      data: {
        name,
        quantity: isNaN(quantity) || quantity <= 0 ? 1 : quantity,
        unit,
        expiryDate,
        tipo,
        categoryId,
        locationId,
        packagingType,
        size,
        sizeUnit,
      },
    });

    // If name or unit changed, update all historical events
    if (nameChanged || unitChanged) {
      try {
        const restaurant = await getRestaurantByTenantId(tenantId);
        
        // Normalize product names for comparison (case-insensitive, trimmed)
        const normalizeName = (n: string) => n.trim().toLowerCase();
        const oldNormalizedName = normalizeName(currentBatch.name);
        const newNormalizedName = normalizeName(name);
        
        // Update events linked to this specific batch
        const batchEventsUpdated = await db.stockEvent.updateMany({
          where: {
            batchId: batchId,
          },
          data: {
            productName: name,
            unit: unit,
          },
        });
        
        // Also update all other events of the same product (normalized name) with the old unit
        // This helps uniformize units across all batches of the same product
        // Example: if changing "batata" from "un" to "kg", update all "batata" events in "un" to "kg"
        let otherEventsUpdated = { count: 0 };
        
        // Get all events for this restaurant with the old unit
        // Exclude events already linked to this batch (batchId can be null for old events)
        const allEventsWithOldUnit = await db.stockEvent.findMany({
          where: {
            restaurantId: restaurant.id,
            unit: currentBatch.unit, // Old unit
            OR: [
              { batchId: null }, // Events without batchId (old events)
              { batchId: { not: batchId } }, // Events linked to other batches
            ],
          },
          select: {
            id: true,
            productName: true,
          },
        });
        
        // Filter events where normalized name matches the old product name
        const matchingEvents = allEventsWithOldUnit.filter(
          e => normalizeName(e.productName) === oldNormalizedName
        );
        
        if (matchingEvents.length > 0) {
          const matchingIds = matchingEvents.map(e => e.id);
          otherEventsUpdated = await db.stockEvent.updateMany({
            where: {
              id: {
                in: matchingIds,
              },
            },
            data: {
              productName: name, // Use the new name (with correct casing)
              unit: unit, // New unit
            },
          });
        }
        
        console.log(`[updateProductBatch] Updated ${batchEventsUpdated.count} batch events and ${otherEventsUpdated.count} other events for product (name: ${currentBatch.name} -> ${name}, unit: ${currentBatch.unit} -> ${unit})`);
      } catch (eventError) {
        // Don't fail the whole operation if event update fails
        console.error(`[updateProductBatch] Error updating historical events for batch ${batchId}:`, eventError);
      }
    }

    revalidatePath("/stock", "page");
    revalidatePath("/historico", "page"); // Also revalidate history page
  } catch (error) {
    console.error("Error updating product batch:", error);
    throw error; // Re-throw para o client conseguir capturar
  }
}

/**
 * Delete a product batch WITHOUT registering it as waste
 * This is for technical operations: correcting errors, removing test data, cleaning up old data
 * IMPORTANT: This does NOT create a WASTE event - use markAsWaste() for actual waste
 */
export async function deleteProductBatch(batchId: string) {
  const tenantId = await getRestaurantIdFromCookie();
  if (!tenantId) throw new Error("Não autenticado");

  // Simply delete the batch - no WASTE event is created
  // This is intentional: delete is a technical operation, not waste tracking
  await db.productBatch.delete({
    where: { id: batchId },
  });

  console.log(`[deleteProductBatch] Deleted batch ${batchId} (no WASTE event created - technical delete)`);

  revalidatePath("/stock", "page");
  revalidatePath("/historico", "page");
}

/**
 * Mark a product batch as waste and delete it
 * This is an EXPLICIT action by the kitchen to declare that the product was thrown away
 * Creates a WASTE event in the history before deleting the batch
 */
export async function markAsWaste(batchId: string) {
  const tenantId = await getRestaurantIdFromCookie();
  if (!tenantId) throw new Error("Não autenticado");

  // Get batch info before deleting to register WASTE event
  const batch = await db.productBatch.findUnique({
    where: { id: batchId },
    include: { restaurant: true },
  });

  if (!batch) {
    throw new Error("Batch não encontrado");
  }

  // Register WASTE event for history tracking (explicit waste declaration)
  if (batch.quantity > 0) {
    try {
      const event = await db.stockEvent.create({
        data: {
          restaurantId: batch.restaurantId,
          type: "WASTE",
          productName: batch.name,
          quantity: batch.quantity,
          unit: batch.unit,
          batchId: batch.id, // Link to the specific batch
        },
      });
      console.log(`[markAsWaste] Created WASTE event:`, {
        id: event.id,
        productName: batch.name,
        quantity: batch.quantity,
        unit: batch.unit,
        restaurantId: batch.restaurantId,
      });
    } catch (eventError) {
      console.error("[markAsWaste] Error creating waste event:", eventError);
      // Don't fail the whole operation, but log the error
    }
  }

  // Delete the batch after registering waste
  await db.productBatch.delete({
    where: { id: batchId },
  });

  console.log(`[markAsWaste] Marked batch ${batchId} as waste and deleted`);

  revalidatePath("/stock", "page");
  revalidatePath("/historico", "page");
}

/**
 * Server action para ajustar quantidade de um batch
 * Pode aumentar ou diminuir quantidade
 * Se quantity <= 0, marca como USED e define quantity = 0
 */
export async function adjustBatchQuantity(batchId: string, adjustment: number) {
  try {
    const tenantId = await getRestaurantIdFromCookie();
    if (!tenantId) {
      return {
        success: false,
        error: "Não autenticado. Por favor, faça login novamente.",
      };
    }

    // Get current batch
    const batch = await db.productBatch.findFirst({
      where: {
        id: batchId,
        restaurant: { name: RESTAURANT_NAMES[tenantId] },
      },
    });

    if (!batch) {
      return {
        success: false,
        error: "Entrada não encontrada.",
      };
    }

    // Calculate new quantity
    const newQuantity = Math.max(0, batch.quantity + adjustment);

    // NOTE: We no longer automatically create WASTE events when adjusting quantity
    // Adjusting quantity is a technical operation (e.g., correcting errors, consuming normally)
    // WASTE events should only be created when the user explicitly marks a product as waste

    // Update batch
    await db.productBatch.update({
      where: { id: batchId },
      data: {
        quantity: newQuantity,
        // Mark as USED if quantity reaches 0
        status: newQuantity <= 0 ? "USED" : batch.status === "USED" ? "ACTIVE" : batch.status,
      },
    });

    // Revalidate pages that show stock data (dashboard is same as hoje)
    revalidatePath("/stock", "page");
    revalidatePath("/hoje", "page");

    return {
      success: true,
      message: `Quantidade ajustada para ${newQuantity} ${batch.unit}`,
    };
  } catch (error) {
    console.error("Error adjusting batch quantity:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido ao ajustar quantidade.";
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Server action to get stock events for a specific month
 */
export async function getStockEventsForMonthAction(year: number, month: number) {
  try {
    const tenantId = await getRestaurantIdFromCookie();
    if (!tenantId) {
      return {
        success: false,
        error: "Não autenticado",
        events: [],
      };
    }

    const restaurant = await getRestaurantByTenantId(tenantId);
    const { getStockEventsForMonth } = await import("@/lib/history-utils");
    const events = await getStockEventsForMonth(restaurant.id, year, month);

    return {
      success: true,
      events: events.map(e => ({
        type: e.type,
        productName: e.productName,
        quantity: e.quantity,
        unit: e.unit,
        createdAt: e.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error("Error getting stock events:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
      events: [],
    };
  }
}

