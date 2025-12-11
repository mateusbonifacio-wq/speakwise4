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
export function formatMonthLabel(year: number, month: number): string {
  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  return `${monthNames[month - 1]} ${year}`;
}

/**
 * Normalize product name for grouping (lowercase + trim)
 * This ensures "Leite", "leite", "Leite " are treated as the same product
 */
function normalizeProductName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Get representative product name (first non-empty name found, or most recent)
 */
function getRepresentativeName(names: string[]): string {
  if (names.length === 0) return "Produto sem nome";
  // Return the first non-empty name, or the most recent one
  const nonEmpty = names.filter(n => n.trim().length > 0);
  return nonEmpty.length > 0 ? nonEmpty[0] : names[names.length - 1];
}

/**
 * Product summary with improved logic
 */
export interface ProductSummary {
  productName: string; // Representative name (display)
  normalizedName: string; // Normalized for grouping
  unit: string;
  totalOrdered: number;
  totalWasted: number;
  wastePercentage: number | null; // null when percentage doesn't make sense
  hasEntryData: boolean; // true if ENTRY > 0
  suggestion: string;
}

/**
 * Aggregate events by product with normalized names
 * Separates products with entry data from those without
 */
export interface AggregatedProducts {
  withEntryData: ProductSummary[]; // Products with ENTRY > 0
  withoutEntryData: ProductSummary[]; // Products with only WASTE (old stock being cleared)
}

export function aggregateEventsByProduct(
  events: Array<{ type: "ENTRY" | "WASTE"; productName: string; quantity: number; unit: string }>
): AggregatedProducts {
  // Map: normalizedName|unit -> { names: string[], unit, entry, waste }
  const productMap = new Map<
    string,
    { names: string[]; unit: string; entry: number; waste: number }
  >();

  // Aggregate by normalized product name + unit
  for (const event of events) {
    const normalizedName = normalizeProductName(event.productName);
    const key = `${normalizedName}|${event.unit}`;

    if (!productMap.has(key)) {
      productMap.set(key, {
        names: [],
        unit: event.unit,
        entry: 0,
        waste: 0,
      });
    }

    const product = productMap.get(key)!;
    
    // Track all names seen for this product (for representative name)
    if (!product.names.includes(event.productName)) {
      product.names.push(event.productName);
    }

    if (event.type === "ENTRY") {
      product.entry += event.quantity;
    } else {
      product.waste += event.quantity;
    }
  }

  const withEntryData: ProductSummary[] = [];
  const withoutEntryData: ProductSummary[] = [];

  // Convert to summaries
  for (const [key, data] of productMap.entries()) {
    const [normalizedName] = key.split("|");
    const totalEntry = data.entry;
    const totalWaste = data.waste;
    const representativeName = getRepresentativeName(data.names);
    const hasEntryData = totalEntry > 0;

    // Calculate waste percentage only when it makes sense
    let wastePercentage: number | null = null;
    if (hasEntryData && totalEntry > 0) {
      const percentage = (totalWaste / totalEntry) * 100;
      // Only set percentage if it's reasonable (avoid absurd values from data issues)
      if (percentage <= 200) {
        wastePercentage = percentage;
      }
    }

    // Generate human-readable suggestion
    const suggestion = generateSuggestion(totalEntry, totalWaste, data.unit, wastePercentage);

    const summary: ProductSummary = {
      productName: representativeName,
      normalizedName,
      unit: data.unit,
      totalOrdered: totalEntry,
      totalWasted: totalWaste,
      wastePercentage,
      hasEntryData,
      suggestion,
    };

    if (hasEntryData) {
      withEntryData.push(summary);
    } else {
      withoutEntryData.push(summary);
    }
  }

  // Sort products with entry data by waste percentage (highest first), then by name
  withEntryData.sort((a, b) => {
    if (a.wastePercentage !== null && b.wastePercentage !== null) {
      if (Math.abs(a.wastePercentage - b.wastePercentage) > 0.1) {
        return b.wastePercentage - a.wastePercentage;
      }
    }
    return a.productName.localeCompare(b.productName);
  });

  // Sort products without entry data by name
  withoutEntryData.sort((a, b) => a.productName.localeCompare(b.productName));

  return { withEntryData, withoutEntryData };
}

/**
 * Generate human-readable suggestion for next order
 */
function generateSuggestion(
  ordered: number,
  wasted: number,
  unit: string,
  wastePercentage: number | null
): string {
  // No entry data - old stock being cleared
  if (ordered === 0) {
    return "Sem histórico de encomenda neste período (provavelmente stock antigo).";
  }

  // Everything was wasted
  if (wasted >= ordered) {
    return `Quase tudo estragou (${wasted.toFixed(0)} ${unit} de ${ordered.toFixed(0)} ${unit}) → provavelmente encomendar muito menos ou parar temporariamente.`;
  }

  // No waste
  if (wasted === 0) {
    const rounded = Math.round(ordered);
    return `Parece bem manter ~${rounded} ${unit}.`;
  }

  // Has waste percentage
  if (wastePercentage !== null) {
    const base = ordered - wasted;
    const roundedBase = Math.round(base);

    if (wastePercentage >= 30) {
      // High waste
      return `Estragaste uma parte significativa (${wastePercentage.toFixed(0)}%) → talvez reduzir para ~${roundedBase} ${unit}.`;
    } else if (wastePercentage > 0) {
      // Low to moderate waste
      return `Talvez encomendar ~${roundedBase} ${unit}.`;
    }
  }

  // Fallback
  const base = ordered - wasted;
  const roundedBase = Math.round(base);
  return `Talvez encomendar ~${roundedBase} ${unit}.`;
}

/**
 * Calculate monthly summary with robust handling
 */
export interface MonthlySummary {
  totalOrdered: number;
  totalWasted: number;
  wastePercentage: number | null; // null when percentage doesn't make sense
  unit: string;
  hasEnoughData: boolean; // true if we have meaningful data
}

export function calculateMonthlySummary(
  events: Array<{ type: "ENTRY" | "WASTE"; quantity: number; unit: string }>
): MonthlySummary {
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

  const unit = units.size === 1 ? Array.from(units)[0] : "misto";
  const hasEnoughData = totalEntry > 0;

  // Calculate waste percentage only when it makes sense
  let wastePercentage: number | null = null;
  if (hasEnoughData && totalEntry > 0) {
    const percentage = (totalWaste / totalEntry) * 100;
    // Only set percentage if it's reasonable (avoid absurd values)
    if (percentage <= 200) {
      wastePercentage = percentage;
    }
  }

  return {
    totalOrdered: totalEntry,
    totalWasted: totalWaste,
    wastePercentage,
    unit,
    hasEnoughData,
  };
}
