"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { MapPin, Package } from "lucide-react";
import { getBatchStatus, groupBatchesByCategory } from "@/lib/stock-utils";
import type { Category, Location, Restaurant } from "@prisma/client";
import type { BatchWithRelations } from "@/lib/stock-utils";

interface StockViewSimpleProps {
  batches: BatchWithRelations[];
  restaurant: Restaurant;
}

/**
 * Versão simplificada do StockView para debug
 * Remove todas as features complexas para isolar o problema
 */
export function StockViewSimple({
  batches,
  restaurant,
}: StockViewSimpleProps) {
  // Validação defensiva
  if (!batches || !Array.isArray(batches)) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-destructive">
          <p className="text-lg font-medium mb-2">Erro: dados inválidos</p>
        </CardContent>
      </Card>
    );
  }

  // Agrupar por categoria
  const batchesByCategory = useMemo(
    () => groupBatchesByCategory(batches),
    [batches]
  );

  // Ordenar categorias
  const categoryNames = Object.keys(batchesByCategory).sort((a, b) => {
    return a.localeCompare(b);
  });

  const getBadgeClassName = (status: ReturnType<typeof getBatchStatus>) => {
    if (status.variant === "destructive") {
      return "bg-red-500 hover:bg-red-600 text-white border-red-600";
    }
    if (status.label.includes("A expirar")) {
      return "bg-orange-500 hover:bg-orange-600 text-white border-orange-600";
    }
    if (status.variant === "secondary") {
      return "bg-green-500/10 hover:bg-green-500/20 text-green-700 border-green-500/30 dark:text-green-400 dark:border-green-500/50";
    }
    return "bg-secondary text-secondary-foreground";
  };

  return (
    <div className="space-y-6">
      {batches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Package className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">
              Ainda não existem produtos em stock
            </p>
            <p className="text-sm">
              Adicione uma entrada em &quot;Nova Entrada&quot;.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {categoryNames.map((categoryName) => {
            const categoryBatches = batchesByCategory[categoryName];

            return (
              <Card key={categoryName} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl font-semibold">
                    {categoryName}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {categoryBatches.map((batch) => {
                      const status = getBatchStatus(batch, restaurant);

                      return (
                        <div
                          key={batch.id}
                          className="flex flex-col gap-2 rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <h3 className="text-lg font-semibold text-foreground">
                              {batch.name}
                            </h3>
                            <Badge className={getBadgeClassName(status)}>
                              {status.label}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground md:grid-cols-3">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4" />
                              <span className="font-medium text-foreground">
                                {batch.quantity} {batch.unit}
                              </span>
                            </div>
                            {batch.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                <span>{batch.location.name}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">
                                Validade:
                              </span>
                              <span>
                                {format(
                                  new Date(batch.expiryDate),
                                  "dd/MM/yyyy"
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

