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
  packagingType?: string | null;
  size?: number | null;
  sizeUnit?: string | null;
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
  try {
    const today = new Date();
    
    // Garantir que expiryDate é convertido para Date
    const expiryDate =
      typeof batch.expiryDate === "string"
        ? new Date(batch.expiryDate)
        : batch.expiryDate;

    if (isNaN(expiryDate.getTime())) {
      return { label: "Data inválida", status: "ok" as const, daysToExpiry: 999 };
    }

    const daysToExpiry = differenceInCalendarDays(expiryDate, today);

    const urgentDays =
      batch.category?.alertDaysBeforeExpiry ??
      (restaurant?.alertDaysBeforeExpiry ?? 3);

    const warningDays =
      batch.category?.warningDaysBeforeExpiry ?? urgentDays;

    if (daysToExpiry < 0) {
      return { label: "Expirado", status: "expired" as const, daysToExpiry };
    }

    if (daysToExpiry <= urgentDays) {
      return {
        label: `Urgente (${daysToExpiry} dias)`,
        status: "urgent" as const,
        daysToExpiry,
      };
    }

    if (daysToExpiry <= warningDays) {
      return {
        label: `Atenção (${daysToExpiry} dias)`,
        status: "attention" as const,
        daysToExpiry,
      };
    }

    return { label: "OK", status: "ok" as const, daysToExpiry };
  } catch (error) {
    console.error("Error calculating batch status:", error);
    return { label: "Erro", status: "ok" as const, daysToExpiry: 999 };
  }
}

/**
 * Agrupa batches por categoria.
 * @param batches - Array de batches
 * @returns Record com categoria como chave e batches como valor
 */
export function groupBatchesByCategory(
  batches: BatchWithRelations[]
): Record<string, BatchWithRelations[]> {
  try {
    if (!Array.isArray(batches)) {
      return {};
    }
    return batches.reduce((acc, batch) => {
      if (!batch) return acc;
      const categoryName = batch.category?.name ?? "Sem Categoria";
      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }
      acc[categoryName].push(batch);
      return acc;
    }, {} as Record<string, BatchWithRelations[]>);
  } catch (error) {
    console.error("Error grouping batches by category:", error);
    return {};
  }
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
  try {
    if (!Array.isArray(batches)) {
      return {};
    }

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
      if (!batch || !batch.name) continue;

      const productName = batch.name;

      // Converter expiryDate para Date se necessário
      const expiryDate =
        typeof batch.expiryDate === "string"
          ? new Date(batch.expiryDate)
          : batch.expiryDate;

      if (!aggregated[productName]) {
        aggregated[productName] = {
          batches: [],
          totalQuantity: 0,
          locations: [],
          nearestExpiry: expiryDate instanceof Date ? expiryDate : new Date(expiryDate),
          unit: batch.unit || "un",
        };
      }

      aggregated[productName].batches.push(batch);
      aggregated[productName].totalQuantity += batch.quantity || 0;

      // Atualizar data de validade mais próxima
      const batchExpiry =
        expiryDate instanceof Date ? expiryDate : new Date(expiryDate);
      if (
        !isNaN(batchExpiry.getTime()) &&
        batchExpiry < aggregated[productName].nearestExpiry
      ) {
        aggregated[productName].nearestExpiry = batchExpiry;
      }

      // Adicionar localização (agrupar por localização se houver)
      if (batch.location && batch.location.name) {
        const existingLocation = aggregated[productName].locations.find(
          (loc) => loc.name === batch.location!.name
        );

        if (existingLocation) {
          existingLocation.quantity += batch.quantity || 0;
        } else {
          aggregated[productName].locations.push({
            name: batch.location.name,
            quantity: batch.quantity || 0,
            unit: batch.unit || "un",
          });
        }
      }
    }

    return aggregated;
  } catch (error) {
    console.error("Error aggregating batches by product:", error);
    return {};
  }
}

