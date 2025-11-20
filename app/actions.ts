"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getRestaurantByTenantId, getUser } from "@/lib/data-access";
import type { RestaurantId } from "@/lib/auth";

/**
 * Helper to get restaurantId from cookies in server actions
 */
async function getRestaurantIdFromCookie(): Promise<RestaurantId | null> {
  const cookieStore = await cookies();
  const restaurantId = cookieStore.get("clearskok_restaurantId")?.value;
  
  if (restaurantId && ["A", "B", "C"].includes(restaurantId)) {
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

export async function createProductBatch(formData: FormData) {
  try {
    const tenantId = await getRestaurantIdFromCookie();
    if (!tenantId) throw new Error("Não autenticado");

    const restaurant = await getRestaurantByTenantId(tenantId);
    const user = await getUser(restaurant.id);

    const name = String(formData.get("name") ?? "").trim();
    const quantityRaw = formData.get("quantity");
    const unitRaw = String(formData.get("unit") ?? "").trim();
    const expiryDateRaw = formData.get("expiryDate");
    const categoryIdRaw = formData.get("categoryId");
    const locationIdRaw = formData.get("locationId");

    if (!name || !quantityRaw || !expiryDateRaw) {
      throw new Error("Campos obrigatórios em falta");
    }

    const quantity = Number(quantityRaw);
    const unit = unitRaw || "un";
    const expiryDate = new Date(String(expiryDateRaw));

    if (isNaN(expiryDate.getTime())) {
      throw new Error("Data de validade inválida");
    }

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
      },
    });

    revalidatePath("/nova-entrada");
    revalidatePath("/entries/new");
    revalidatePath("/stock");
    revalidatePath("/hoje");
  } catch (error) {
    console.error("Error creating product batch:", error);
    throw error; // Re-throw para o client conseguir capturar
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

    await db.productBatch.update({
      where: { id: batchId },
      data: {
        name,
        quantity: isNaN(quantity) || quantity <= 0 ? 1 : quantity,
        unit,
        expiryDate,
        categoryId,
        locationId,
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


