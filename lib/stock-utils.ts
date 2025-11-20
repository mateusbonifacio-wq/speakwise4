import { differenceInCalendarDays } from "date-fns";
import type {
  ProductBatch,
  Category,
  Restaurant,
  Location,
} from "@prisma/client";

// Tipo que aceita tanto Date objects (server) como strings (serializado do server para client)
export type BatchWithRelations = Omit<ProductBatch, "expiryDate" | "createdAt" | "updatedAt"> & {
  expiryDate: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
  category: (Omit<Category, "createdAt" | "updatedAt"> & {
    createdAt: Date | string;
    updatedAt: Date | string;
  }) | null;
  location: (Omit<Location, "createdAt" | "updatedAt"> & {
    createdAt: Date | string;
    updatedAt: Date | string;
  }) | null;
};

/**
 * Calcula o status de um batch baseado na data de validade e nas configurações de alerta.
 * @param batch - O batch do produto com categoria incluída
 * @param restaurant - O restaurante com configuração padrão de alertas
 * @returns Objeto com label e variant para exibição do status
 */
export function getBatchStatus(
  batch: BatchWithRelations,
  restaurant: Restaurant
) {
  const today = new Date();
  const daysToExpiry = differenceInCalendarDays(
    new Date(batch.expiryDate),
    today
  );

  const urgentDays =
    batch.category?.alertDaysBeforeExpiry ?? restaurant.alertDaysBeforeExpiry;

  const warningDays =
    batch.category?.warningDaysBeforeExpiry ?? urgentDays;

  if (daysToExpiry < 0) {
    return { label: "Expirado", variant: "destructive" as const };
  }

  if (daysToExpiry <= urgentDays) {
    return {
      label: `Urgente usar (${daysToExpiry} dias)`,
      variant: "destructive" as const,
    };
  }

  if (daysToExpiry <= warningDays) {
    return {
      label: `A expirar em breve (${daysToExpiry} dias)`,
      variant: "default" as const,
    };
  }

  return { label: "OK", variant: "secondary" as const };
}

/**
 * Agrupa batches por categoria.
 * @param batches - Array de batches
 * @returns Record com categoria como chave e batches como valor
 */
export function groupBatchesByCategory(
  batches: BatchWithRelations[]
): Record<string, BatchWithRelations[]> {
  return batches.reduce((acc, batch) => {
    const categoryName = batch.category?.name ?? "Sem Categoria";
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(batch);
    return acc;
  }, {} as Record<string, BatchWithRelations[]>);
}

/**
 * Agrega batches por nome de produto.
 * Para cada produto, calcula:
 * - Total de quantidade (soma de todas as entradas)
 * - Lista de localizações com quantidades
 * - Data de validade mais próxima (mais cedo)
 * @param batches - Array de batches
 * @returns Record com nome do produto como chave e dados agregados como valor
 */
export function aggregateBatchesByProduct(batches: BatchWithRelations[]) {
  const aggregated: Record<
    string,
    {
      batches: BatchWithRelations[];
      totalQuantity: number;
      locations: Array<{ name: string; quantity: number; unit: string }>;
      nearestExpiry: Date;
      unit: string;
    }
  > = {};

  for (const batch of batches) {
    const productName = batch.name;

    if (!aggregated[productName]) {
      aggregated[productName] = {
        batches: [],
        totalQuantity: 0,
        locations: [],
        nearestExpiry: new Date(batch.expiryDate),
        unit: batch.unit,
      };
    }

    aggregated[productName].batches.push(batch);
    aggregated[productName].totalQuantity += batch.quantity;

    // Atualizar data de validade mais próxima
    const batchExpiry = new Date(batch.expiryDate);
    if (batchExpiry < aggregated[productName].nearestExpiry) {
      aggregated[productName].nearestExpiry = batchExpiry;
    }

    // Adicionar localização (agrupar por localização se houver)
    if (batch.location) {
      const existingLocation = aggregated[productName].locations.find(
        (loc) => loc.name === batch.location!.name
      );

      if (existingLocation) {
        existingLocation.quantity += batch.quantity;
      } else {
        aggregated[productName].locations.push({
          name: batch.location.name,
          quantity: batch.quantity,
          unit: batch.unit,
        });
      }
    }
  }

  return aggregated;
}

