"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getRestaurantByTenantId, getUser } from "@/lib/data-access";
import { RESTAURANT_NAMES, type RestaurantId } from "@/lib/auth";

/**
 * Helper to get restaurantId from cookies in server actions
 */
async function getRestaurantIdFromCookie(): Promise<RestaurantId | null> {
  const cookieStore = await cookies();
  const restaurantId = cookieStore.get("clearskok_restaurantId")?.value;
  
  if (restaurantId && ["A", "B", "C", "D"].includes(restaurantId)) {
    return restaurantId as RestaurantId;
  }
  
  return null;
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

  revalidatePath("/definicoes");
  revalidatePath("/settings");
}

export async function createCategory(formData: FormData) {
  const tenantId = await getRestaurantIdFromCookie();
  if (!tenantId) throw new Error("Não autenticado");

  const restaurant = await getRestaurantByTenantId(tenantId);
  const name = String(formData.get("name") ?? "").trim();

  if (!name) return;

  await db.category.create({
    data: {
      name,
      restaurantId: restaurant.id,
    },
  });

  revalidatePath("/definicoes");
  revalidatePath("/settings");
}

export async function createLocation(formData: FormData) {
  const tenantId = await getRestaurantIdFromCookie();
  if (!tenantId) throw new Error("Não autenticado");

  const restaurant = await getRestaurantByTenantId(tenantId);
  const name = String(formData.get("name") ?? "").trim();

  if (!name) return;

  await db.location.create({
    data: {
      name,
      restaurantId: restaurant.id,
    },
  });

  revalidatePath("/definicoes");
  revalidatePath("/settings");
}

export async function updateCategoryAlert(categoryId: string, formData: FormData) {
  const tenantId = await getRestaurantIdFromCookie();
  if (!tenantId) throw new Error("Não autenticado");

  const warningRaw = formData.get("warningDays");
  const urgentRaw = formData.get("alertDays");

  const warning =
    warningRaw && !isNaN(Number(warningRaw)) && Number(warningRaw) > 0
      ? Number(warningRaw)
      : null;

  const urgent =
    urgentRaw && !isNaN(Number(urgentRaw)) && Number(urgentRaw) > 0
      ? Number(urgentRaw)
      : null;

  await db.category.update({
    where: { id: categoryId },
    data: {
      warningDaysBeforeExpiry: warning,
      alertDaysBeforeExpiry: urgent,
    },
  });

  revalidatePath("/definicoes");
  revalidatePath("/settings");
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
  const tenantId = await getRestaurantIdFromCookie();
  if (!tenantId) throw new Error("Não autenticado");

  await db.category.delete({
    where: { id: categoryId },
  });

  revalidatePath("/definicoes");
  revalidatePath("/settings");
}

export async function deleteLocation(locationId: string) {
  const tenantId = await getRestaurantIdFromCookie();
  if (!tenantId) throw new Error("Não autenticado");

  await db.location.delete({
    where: { id: locationId },
  });

  revalidatePath("/definicoes");
  revalidatePath("/settings");
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

    await db.productBatch.create({
      data: {
        name,
        quantity: isNaN(quantity) || quantity <= 0 ? 1 : quantity,
        unit,
        expiryDate,
        restaurantId: restaurant.id,
        userId: user.id,
        categoryId: categoryIdRaw && String(categoryIdRaw).trim() !== "" ? String(categoryIdRaw) : null,
        locationId: locationIdRaw && String(locationIdRaw).trim() !== "" ? String(locationIdRaw) : null,
        packagingType,
        size,
        sizeUnit,
      },
    });

    revalidatePath("/nova-entrada");
    revalidatePath("/entries/new");
    revalidatePath("/stock");
    revalidatePath("/hoje");

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

    const name = String(formData.get("name") ?? "").trim();
    const quantityRaw = formData.get("quantity");
    const unitRaw = String(formData.get("unit") ?? "").trim();
    const expiryDateRaw = formData.get("expiryDate");
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

    await db.productBatch.update({
      where: { id: batchId },
      data: {
        name,
        quantity: isNaN(quantity) || quantity <= 0 ? 1 : quantity,
        unit,
        expiryDate,
        categoryId,
        locationId,
        packagingType,
        size,
        sizeUnit,
      },
    });

    revalidatePath("/stock");
  } catch (error) {
    console.error("Error updating product batch:", error);
    throw error; // Re-throw para o client conseguir capturar
  }
}

export async function deleteProductBatch(batchId: string) {
  const tenantId = await getRestaurantIdFromCookie();
  if (!tenantId) throw new Error("Não autenticado");

  await db.productBatch.delete({
    where: { id: batchId },
  });

  revalidatePath("/stock");
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

    // Update batch
    await db.productBatch.update({
      where: { id: batchId },
      data: {
        quantity: newQuantity,
        // Mark as USED if quantity reaches 0
        status: newQuantity <= 0 ? "USED" : batch.status === "USED" ? "ACTIVE" : batch.status,
      },
    });

    revalidatePath("/stock");
    revalidatePath("/hoje");
    revalidatePath("/dashboard");

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


