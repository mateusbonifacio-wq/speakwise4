import { db } from "@/lib/db";
import { startOfMonth, endOfMonth } from "date-fns";
import { format } from "date-fns";

/**
 * Get stock events for a specific month
 */
export async function getStockEventsForMonth(restaurantId: string, year: number, month: number) {
  const startDate = startOfMonth(new Date(year, month - 1, 1));
  const endDate = endOfMonth(new Date(year, month - 1, 1));

  const events = await db.stockEvent.findMany({
    where: {
      restaurantId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return events;
}

/**
 * Format month label in Portuguese
 */
function formatMonthLabel(year: number, month: number): string {
  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  return `${monthNames[month - 1]} ${year}`;
}

/**
 * Aggregate events by product for a month
 */
export interface ProductHistory {
  productName: string;
  unit: string;
  totalEntry: number;
  totalWaste: number;
  wastePercentage: number;
  suggestion: string;
}

export function aggregateEventsByProduct(events: Array<{ type: "ENTRY" | "WASTE"; productName: string; quantity: number; unit: string }>): ProductHistory[] {
  const productMap = new Map<string, { unit: string; entry: number; waste: number }>();

  // Aggregate by product name
  for (const event of events) {
    const key = `${event.productName}|${event.unit}`;
    if (!productMap.has(key)) {
      productMap.set(key, { unit: event.unit, entry: 0, waste: 0 });
    }
    const product = productMap.get(key)!;
    if (event.type === "ENTRY") {
      product.entry += event.quantity;
    } else {
      product.waste += event.quantity;
    }
  }

  // Convert to array and calculate percentages
  const result: ProductHistory[] = [];
  for (const [key, data] of productMap.entries()) {
    const [productName] = key.split("|");
    const totalEntry = data.entry;
    const totalWaste = data.waste;
    const wastePercentage = totalEntry > 0 ? (totalWaste / totalEntry) * 100 : 0;

    // Generate suggestion
    let suggestion = "";
    if (totalEntry === 0) {
      suggestion = "Sem dados de encomenda";
    } else if (totalEntry > 0 && totalWaste >= totalEntry) {
      // Special case: everything was wasted (100% waste)
      suggestion = `Todo o stock foi desperdiçado (${totalEntry.toFixed(1)} ${data.unit}). Revisa o processo de armazenamento ou reduz drasticamente a encomenda.`;
    } else if (wastePercentage > 30) {
      // High waste - suggest reducing order
      const suggested = Math.max(0, Math.round(totalEntry - totalWaste));
      suggestion = `Desperdício alto (${wastePercentage.toFixed(1)}%). Considera encomendar ~${suggested} ${data.unit}`;
    } else if (wastePercentage > 10) {
      // Moderate waste
      const suggested = Math.round(totalEntry * 0.9);
      suggestion = `Desperdício moderado (${wastePercentage.toFixed(1)}%). Considera encomendar ~${suggested} ${data.unit}`;
    } else {
      // Low waste - maintain similar order
      const base = totalEntry - totalWaste;
      suggestion = `Desperdício baixo (${wastePercentage.toFixed(1)}%). Parece bem manter ~${Math.round(base)} ${data.unit}`;
    }

    result.push({
      productName,
      unit: data.unit,
      totalEntry,
      totalWaste,
      wastePercentage,
      suggestion,
    });
  }

  // Sort by waste percentage (highest first), then by name
  result.sort((a, b) => {
    if (Math.abs(a.wastePercentage - b.wastePercentage) > 0.1) {
      return b.wastePercentage - a.wastePercentage;
    }
    return a.productName.localeCompare(b.productName);
  });

  return result;
}

/**
 * Calculate monthly summary
 */
export interface MonthlySummary {
  totalEntry: number;
  totalWaste: number;
  wastePercentage: number;
  entryUnit: string;
  wasteUnit: string;
}

export function calculateMonthlySummary(events: Array<{ type: "ENTRY" | "WASTE"; quantity: number; unit: string }>): MonthlySummary {
  let totalEntry = 0;
  let totalWaste = 0;
  const units = new Set<string>();

  for (const event of events) {
    units.add(event.unit);
    if (event.type === "ENTRY") {
      totalEntry += event.quantity;
    } else {
      totalWaste += event.quantity;
    }
  }

  const wastePercentage = totalEntry > 0 ? (totalWaste / totalEntry) * 100 : 0;
  const unitArray = Array.from(units);
  const entryUnit = unitArray.length > 0 ? unitArray[0] : "un";
  const wasteUnit = unitArray.length > 0 ? unitArray[0] : "un";

  return {
    totalEntry,
    totalWaste,
    wastePercentage,
    entryUnit,
    wasteUnit,
  };
}

