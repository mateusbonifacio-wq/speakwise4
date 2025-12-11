"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { StockViewSimple } from "./stock-view-simple";
import type { BatchWithRelations } from "@/lib/stock-utils";
import type { Restaurant } from "@prisma/client";

interface StockViewWrapperProps {
  batches: any[];
  restaurant: any;
  categories: any[];
  locations: any[];
}

/**
 * Wrapper que garante conversão segura de dados serializados do server
 * Versão simplificada para debug
 */
export function StockViewWrapper({
  batches,
  restaurant,
  categories,
  locations,
}: StockViewWrapperProps) {
  const searchParams = useSearchParams();
  const [convertedData, setConvertedData] = useState<{
    batches: BatchWithRelations[];
    restaurant: Restaurant;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Get initial status filter and search query from URL
  const initialStatusFilter = searchParams?.get("status") || undefined;
  const initialSearchQuery = searchParams?.get("search") || undefined;

  // CRITICAL FIX: Memoize conversion to prevent unnecessary re-renders
  // Only convert when batches or restaurant actually change (by reference or length)
  const batchesLengthRef = useRef(batches?.length);
  const restaurantIdRef = useRef(restaurant?.id);

  useEffect(() => {
    // Skip if data hasn't actually changed
    const batchesLength = batches?.length || 0;
    const restaurantId = restaurant?.id;
    
    if (
      batchesLengthRef.current === batchesLength &&
      restaurantIdRef.current === restaurantId &&
      convertedData !== null
    ) {
      console.log("[StockViewWrapper] Data unchanged, skipping conversion");
      return;
    }

    console.log("[StockViewWrapper] Converting data", { batchesLength, restaurantId });
    batchesLengthRef.current = batchesLength;
    restaurantIdRef.current = restaurantId;

    try {
      if (!batches || !Array.isArray(batches)) {
        throw new Error("Batches não é um array válido");
      }

      if (!restaurant) {
        throw new Error("Restaurant não está definido");
      }

      // Converter strings de data para Date objects
      const convertedBatches: BatchWithRelations[] = batches.map((batch: any) => {
        if (!batch || !batch.id) {
          console.warn("Batch inválido encontrado:", batch);
          return null;
        }
        return {
          ...batch,
          expiryDate:
            typeof batch.expiryDate === "string"
              ? new Date(batch.expiryDate)
              : batch.expiryDate instanceof Date
              ? batch.expiryDate
              : new Date(),
          createdAt:
            typeof batch.createdAt === "string"
              ? new Date(batch.createdAt)
              : batch.createdAt instanceof Date
              ? batch.createdAt
              : new Date(),
          updatedAt:
            typeof batch.updatedAt === "string"
              ? new Date(batch.updatedAt)
              : batch.updatedAt instanceof Date
              ? batch.updatedAt
              : new Date(),
          category: batch.category
            ? {
                ...batch.category,
                createdAt:
                  typeof batch.category.createdAt === "string"
                    ? new Date(batch.category.createdAt)
                    : batch.category.createdAt,
                updatedAt:
                  typeof batch.category.updatedAt === "string"
                    ? new Date(batch.category.updatedAt)
                    : batch.category.updatedAt,
              }
            : null,
          location: batch.location
            ? {
                ...batch.location,
                createdAt:
                  typeof batch.location.createdAt === "string"
                    ? new Date(batch.location.createdAt)
                    : batch.location.createdAt,
                updatedAt:
                  typeof batch.location.updatedAt === "string"
                    ? new Date(batch.location.updatedAt)
                    : batch.location.updatedAt,
              }
            : null,
        };
      }).filter((b): b is BatchWithRelations => b !== null);

      setConvertedData({
        batches: convertedBatches,
        restaurant,
      });
    } catch (err) {
      console.error("Error converting stock data:", err);
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    }
  }, [batches, restaurant]);

  if (error) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-6 text-center">
          <p className="text-lg font-medium text-destructive mb-2">
            Erro ao carregar stock
          </p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-sm font-medium">
              Detalhes técnicos
            </summary>
            <pre className="mt-2 text-xs overflow-auto p-2 bg-muted rounded">
              {JSON.stringify({ batches: batches?.length, restaurant: !!restaurant }, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    );
  }

  if (!convertedData) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border p-6 text-center">
          <p className="text-sm text-muted-foreground">A carregar...</p>
        </div>
      </div>
    );
  }

  return (
    <StockViewSimple
      {...convertedData}
      categories={Array.isArray(categories) ? categories : []}
      locations={Array.isArray(locations) ? locations : []}
      initialStatusFilter={initialStatusFilter}
      initialSearchQuery={initialSearchQuery}
    />
  );
}

