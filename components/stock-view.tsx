"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { deleteProductBatch } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "./status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import {
  MapPin,
  Package,
  Search,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { EditBatchDialog } from "./edit-batch-dialog";
import {
  getBatchStatus,
  groupBatchesByCategory,
  aggregateBatchesByProduct,
} from "@/lib/stock-utils";
import type { Category, Location, Restaurant } from "@prisma/client";
import type { BatchWithRelations } from "@/lib/stock-utils";

interface StockViewProps {
  batches: BatchWithRelations[];
  restaurant: Restaurant;
  categories: Category[];
  locations: Location[];
}

/**
 * Componente client para visualização e gestão de stock.
 * Inclui:
 * - Toggle entre vista por categoria e por produto
 * - Search bar com debounce
 * - Edição e eliminação de entries
 * - Agregação de produtos na vista "By Product"
 */
export function StockView({
  batches,
  restaurant,
  categories,
  locations,
}: StockViewProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"category" | "product">("category");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(
    new Set()
  );
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<BatchWithRelations | null>(
    null
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingBatch, setDeletingBatch] = useState<BatchWithRelations | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);

  // Validação defensiva
  if (!batches || !Array.isArray(batches)) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-destructive">
          <p className="text-lg font-medium mb-2">
            Erro: dados inválidos
          </p>
        </CardContent>
      </Card>
    );
  }

  // Filtrar batches baseado na pesquisa (case-insensitive)
  const filteredBatches = useMemo(() => {
    if (!searchQuery.trim()) return batches;

    const query = searchQuery.toLowerCase();
    return batches.filter((batch) =>
      batch.name.toLowerCase().includes(query)
    );
  }, [batches, searchQuery]);

  // Agrupar por categoria (para vista "By Category")
  const batchesByCategory = useMemo(
    () => groupBatchesByCategory(filteredBatches),
    [filteredBatches]
  );

  // Agregar por produto (para vista "By Product")
  const aggregatedByProduct = useMemo(
    () => aggregateBatchesByProduct(filteredBatches),
    [filteredBatches]
  );

  // Ordenar categorias (urgentes primeiro)
  const sortedCategoryNames = useMemo(() => {
    return Object.keys(batchesByCategory).sort((a, b) => {
      const aHasUrgent = batchesByCategory[a].some(
        (b) => getBatchStatus(b, restaurant).status === "expired" || getBatchStatus(b, restaurant).status === "urgent"
      );
      const bHasUrgent = batchesByCategory[b].some(
        (b) => getBatchStatus(b, restaurant).status === "expired" || getBatchStatus(b, restaurant).status === "urgent"
      );
      if (aHasUrgent && !bHasUrgent) return -1;
      if (!aHasUrgent && bHasUrgent) return 1;
      return a.localeCompare(b);
    });
  }, [batchesByCategory, restaurant]);

  // Ordenar produtos por nome
  const sortedProductNames = useMemo(() => {
    return Object.keys(aggregatedByProduct).sort((a, b) => {
      // Produtos com batches urgentes primeiro
      const aHasUrgent = aggregatedByProduct[a].batches.some(
        (b) => getBatchStatus(b, restaurant).status === "expired" || getBatchStatus(b, restaurant).status === "urgent"
      );
      const bHasUrgent = aggregatedByProduct[b].batches.some(
        (b) => getBatchStatus(b, restaurant).status === "expired" || getBatchStatus(b, restaurant).status === "urgent"
      );
      if (aHasUrgent && !bHasUrgent) return -1;
      if (!aHasUrgent && bHasUrgent) return 1;
      return a.localeCompare(b);
    });
  }, [aggregatedByProduct, restaurant]);

  const handleEdit = (batch: BatchWithRelations) => {
    setEditingBatch(batch);
    setEditDialogOpen(true);
  };

  const handleDelete = (batch: BatchWithRelations) => {
    setDeletingBatch(batch);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingBatch) return;

    setIsDeleting(true);
    await deleteProductBatch(deletingBatch.id);
    setIsDeleting(false);
    setDeleteDialogOpen(false);
    setDeletingBatch(null);
    router.refresh();
  };

  const toggleProductExpansion = (productName: string) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productName)) {
      newExpanded.delete(productName);
    } else {
      newExpanded.add(productName);
    }
    setExpandedProducts(newExpanded);
  };

  // Map status to badge type
  const getBadgeStatus = (status: ReturnType<typeof getBatchStatus>): "expired" | "urgent" | "attention" | "ok" => {
    return status.status;
  };

  return (
    <div className="space-y-6">
      {/* Search bar e tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pesquisar produto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
          <TabsList>
            <TabsTrigger value="category">Por Categoria</TabsTrigger>
            <TabsTrigger value="product">Por Produto</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Vista por categoria */}
      <TabsContent value="category" className="mt-0">
        {filteredBatches.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Package className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">
                {searchQuery
                  ? "Nenhum produto encontrado"
                  : "Ainda não existem produtos em stock"}
              </p>
              {searchQuery && (
                <p className="text-sm">
                  Tente pesquisar por outro termo ou limpe a pesquisa.
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {sortedCategoryNames.map((categoryName) => {
              const categoryBatches = batchesByCategory[categoryName];
              const urgentCount = categoryBatches.filter(
                (b) => getBatchStatus(b, restaurant).status === "expired" || getBatchStatus(b, restaurant).status === "urgent"
              ).length;

              return (
                <Card key={categoryName} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl font-semibold">
                        {categoryName}
                      </CardTitle>
                      <Badge variant="outline" className="text-sm">
                        {categoryBatches.length}{" "}
                        {categoryBatches.length === 1 ? "produto" : "produtos"}
                        {urgentCount > 0 && (
                          <span className="ml-2 text-destructive">
                            ({urgentCount} urgente{urgentCount > 1 ? "s" : ""})
                          </span>
                        )}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {categoryBatches.map((batch) => {
                        const status = getBatchStatus(batch, restaurant);

                        return (
                          <div
                            key={batch.id}
                            className="flex flex-col gap-3 rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                          >
                            {/* Header: nome + badge + actions */}
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold text-foreground">
                                  {batch.name}
                                </h3>
                              </div>
                              <div className="flex items-center gap-2">
                                <StatusBadge status={getBadgeStatus(status)} label={status.label} />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleEdit(batch)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => handleDelete(batch)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            {/* Informações */}
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
      </TabsContent>

      {/* Vista por produto */}
      <TabsContent value="product" className="mt-0">
        {filteredBatches.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Package className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">
                {searchQuery
                  ? "Nenhum produto encontrado"
                  : "Ainda não existem produtos em stock"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedProductNames.map((productName) => {
              const aggregated = aggregatedByProduct[productName];
              const nearestStatus = getBatchStatus(
                {
                  ...aggregated.batches[0],
                  expiryDate: aggregated.nearestExpiry,
                } as BatchWithRelations,
                restaurant
              );
              const isExpanded = expandedProducts.has(productName);
              const hasUrgent = aggregated.batches.some(
                (b) => getBatchStatus(b, restaurant).status === "expired" || getBatchStatus(b, restaurant).status === "urgent"
              );

              return (
                <Card key={productName} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => toggleProductExpansion(productName)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                        <CardTitle className="text-xl font-semibold">
                          {productName}
                        </CardTitle>
                      </div>
                      <StatusBadge status={getBadgeStatus(nearestStatus)} label={nearestStatus.label} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Resumo agregado */}
                      <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-foreground">
                            Total: {aggregated.totalQuantity}{" "}
                            {aggregated.unit}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <div className="flex flex-wrap gap-1">
                            {aggregated.locations.length > 0 ? (
                              aggregated.locations.map((loc, idx) => (
                                <span key={idx}>
                                  {loc.name} ({loc.quantity} {loc.unit})
                                  {idx < aggregated.locations.length - 1 && ", "}
                                </span>
                              ))
                            ) : (
                              <span className="text-muted-foreground">
                                Sem localização
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            Validade mais próxima:
                          </span>
                          <span>
                            {format(aggregated.nearestExpiry, "dd/MM/yyyy")}
                          </span>
                        </div>
                      </div>

                      {/* Entradas individuais (expandido) */}
                      {isExpanded && (
                        <div className="mt-4 space-y-3 border-t pt-4">
                          <h4 className="text-sm font-semibold text-muted-foreground">
                            Entradas individuais ({aggregated.batches.length})
                          </h4>
                          {aggregated.batches.map((batch) => {
                            const status = getBatchStatus(batch, restaurant);

                            return (
                              <div
                                key={batch.id}
                                className="flex flex-col gap-2 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 text-sm">
                                      <span className="font-medium">
                                        {batch.quantity} {batch.unit}
                                      </span>
                                      {batch.location && (
                                        <>
                                          <span className="text-muted-foreground">
                                            •
                                          </span>
                                          <span>{batch.location.name}</span>
                                        </>
                                      )}
                                      <span className="text-muted-foreground">
                                        •
                                      </span>
                                      <span>
                                        Validade:{" "}
                                        {format(
                                          new Date(batch.expiryDate),
                                          "dd/MM/yyyy"
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <StatusBadge status={getBadgeStatus(status)} label={status.label} />
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => handleEdit(batch)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      onClick={() => handleDelete(batch)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </TabsContent>

      {/* Dialog de edição */}
      {editingBatch && (
        <EditBatchDialog
          batch={editingBatch}
          categories={categories}
          locations={locations}
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) setEditingBatch(null);
          }}
        />
      )}

      {/* Dialog de confirmação de eliminação */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar entrada</DialogTitle>
            <DialogDescription>
              Tem a certeza que deseja eliminar esta entrada de stock? Esta
              ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          {deletingBatch && (
            <div className="py-4">
              <p className="font-medium">{deletingBatch.name}</p>
              <p className="text-sm text-muted-foreground">
                {deletingBatch.quantity} {deletingBatch.unit}
                {deletingBatch.location &&
                  ` • ${deletingBatch.location.name}`}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "A eliminar..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

