 "use server";

 import { revalidatePath } from "next/cache";
 import { db } from "@/lib/db";
import { getRestaurant, getUser } from "@/lib/data-access";

 export async function updateSettings(formData: FormData) {
   const restaurant = await getRestaurant();

   const alertDaysRaw = formData.get("alertDays");
   const alertDays = Number(alertDaysRaw ?? 3);

   await db.restaurant.update({
     where: { id: restaurant.id },
     data: {
       alertDaysBeforeExpiry: isNaN(alertDays) || alertDays <= 0 ? 3 : alertDays,
     },
   });

   revalidatePath("/settings");
 }

 export async function createCategory(formData: FormData) {
   const restaurant = await getRestaurant();
   const name = String(formData.get("name") ?? "").trim();

   if (!name) return;

   await db.category.create({
     data: {
       name,
       restaurantId: restaurant.id,
     },
   });

   revalidatePath("/settings");
 }

 export async function createLocation(formData: FormData) {
   const restaurant = await getRestaurant();
   const name = String(formData.get("name") ?? "").trim();

   if (!name) return;

   await db.location.create({
     data: {
       name,
       restaurantId: restaurant.id,
     },
   });

   revalidatePath("/settings");
 }

export async function updateCategoryAlert(categoryId: string, formData: FormData) {
  const alertRaw = formData.get("alertDays");
  const alertDays = alertRaw ? Number(alertRaw) : null;

  await db.category.update({
    where: { id: categoryId },
    data: {
      alertDaysBeforeExpiry:
        alertDays !== null && !isNaN(alertDays) && alertDays > 0
          ? alertDays
          : null,
    },
  });

  revalidatePath("/settings");
}

 export async function deleteCategory(categoryId: string) {
   await db.category.delete({
     where: { id: categoryId },
   });

   revalidatePath("/settings");
 }

 export async function deleteLocation(locationId: string) {
   await db.location.delete({
     where: { id: locationId },
   });

   revalidatePath("/settings");
 }

 export async function createProductBatch(formData: FormData) {
   const restaurantId = String(formData.get("restaurantId") ?? "");
   if (!restaurantId) return;

   const [restaurant, user] = await Promise.all([
     db.restaurant.findUnique({ where: { id: restaurantId } }),
     getUser(restaurantId),
   ]);

   if (!restaurant) return;

   const name = String(formData.get("name") ?? "").trim();
   const quantityRaw = formData.get("quantity");
   const unitRaw = String(formData.get("unit") ?? "").trim();
   const expiryDateRaw = formData.get("expiryDate");
   const categoryIdRaw = formData.get("categoryId");
   const locationIdRaw = formData.get("locationId");

   if (!name || !quantityRaw || !expiryDateRaw) {
     return;
   }

   const quantity = Number(quantityRaw);
   const unit = unitRaw || "un";
   const expiryDate = new Date(String(expiryDateRaw));

   await db.productBatch.create({
     data: {
       name,
       quantity: isNaN(quantity) ? 1 : quantity,
       unit,
       expiryDate,
       restaurantId: restaurant.id,
       userId: user.id,
       categoryId: categoryIdRaw ? String(categoryIdRaw) : null,
       locationId: locationIdRaw ? String(locationIdRaw) : null,
     },
   });

   revalidatePath("/entries/new");
   revalidatePath("/stock");
 }


