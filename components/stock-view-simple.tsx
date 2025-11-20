"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteProductBatch, adjustBatchQuantity } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { MapPin, Package, Search, Edit, Trash2, Plus, Minus } from "lucide-react";
import { EditBatchDialog } from "./edit-batch-dialog";
import { StatusBadge } from "./status-badge";
import { Badge } from "@/components/ui/badge";
import { getBatchStatus, groupBatchesByCategory } from "@/lib/stock-utils";
import { toast } from "sonner";
import type { Category, Location, Restaurant } from "@prisma/client";
import type { BatchWithRelations } from "@/lib/stock-utils";

interface StockViewSimpleProps {
  batches: BatchWithRelations[];
  restaurant: Restaurant;
  categories: Category[];
  locations: Location[];
  initialStatusFilter?: string;
}

/**
 * Versão simplificada do StockView com Search bar
 */
export type StatusFilter = "all" | "expired" | "urgent" | "attention" | "ok";

export function StockViewSimple({
  batches,
  restaurant,
  categories,
  locations,
  initialStatusFilter,
}: StockViewSimpleProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  // Initialize status filter from prop (passed from wrapper that reads URL)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    (initialStatusFilter && ["expired", "urgent", "attention", "ok"].includes(initialStatusFilter)
      ? initialStatusFilter
      : "all") as StatusFilter
  );
  const [showFinished, setShowFinished] = useState(false); // Toggle to show finished items
  const [searchQuery, setSearchQuery] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<BatchWithRelations | null>(
    null
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingBatch, setDeletingBatch] = useState<BatchWithRelations | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [adjustingBatchId, setAdjustingBatchId] = useState<string | null>(null);

  // Update status filter when prop changes (e.g., from navigation)
  useEffect(() => {
    if (initialStatusFilter && ["expired", "urgent", "attention", "ok"].includes(initialStatusFilter)) {
      setStatusFilter(initialStatusFilter as StatusFilter);
    } else {
      setStatusFilter("all");
    }
  }, [initialStatusFilter]);

  const handleEdit = (batch: BatchWithRelations) => {
    if (!batch || !batch.id) {
      console.warn("Cannot edit batch: invalid batch or missing ID");
      return;
    }
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

  // Update URL when status filter changes (optional but useful for sharing/bookmarking)
  const handleStatusFilterChange = (filter: StatusFilter) => {
    setStatusFilter(filter);
    if (filter === "all") {
      router.push("/stock", { scroll: false });
    } else {
      router.push(`/stock?status=${filter}`, { scroll: false });
    }
  };

  // Handle quantity adjustment
  const handleAdjustQuantity = async (batchId: string, adjustment: number) => {
    setAdjustingBatchId(batchId);
    startTransition(async () => {
      try {
        const result = await adjustBatchQuantity(batchId, adjustment);
        if (result.success) {
          toast.success(result.message || "Quantidade ajustada com sucesso!");
          router.refresh();
        } else {
          toast.error("Erro ao ajustar quantidade", {
            description: result.error || "Ocorreu um erro ao ajustar a quantidade.",
          });
        }
      } catch (error) {
        console.error("Error adjusting quantity:", error);
        toast.error("Erro inesperado", {
          description: "Ocorreu um erro inesperado. Por favor, tente novamente.",
        });
      } finally {
        setAdjustingBatchId(null);
      }
    });
  };

  // Filtrar batches baseado na pesquisa, filtro de status e finished items
  const filteredBatches = useMemo(() => {
    let filtered = batches;

    // Filter by finished status (by default, hide finished items)
    if (!showFinished) {
      filtered = filtered.filter((batch) => (batch.quantity ?? 0) > 0);
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((batch) => {
        const status = getBatchStatus(batch, restaurant);
        return status.status === statusFilter;
      });
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((batch) =>
        batch.name?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [batches, searchQuery, statusFilter, showFinished, restaurant]);

  // Agrupar por categoria
  const batchesByCategory = useMemo(
    () => groupBatchesByCategory(filteredBatches),
    [filteredBatches]
  );

  // Ordenar categorias
  const categoryNames = Object.keys(batchesByCategory).sort((a, b) => {
    return a.localeCompare(b);
  });

  // Map status to badge type
  const getBadgeStatus = (status: ReturnType<typeof getBatchStatus>): "expired" | "urgent" | "attention" | "ok" => {
    if (status.status === "expired") return "expired";
    if (status.status === "urgent") return "urgent";
    if (status.status === "attention") return "attention";
    return "ok";
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Show finished toggle and status filters */}
      <div className="flex flex-col gap-3 mb-4">
        {/* Toggle to show finished items */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="showFinished"
            checked={showFinished}
            onChange={(e) => setShowFinished(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="showFinished" className="text-sm font-medium text-gray-700 cursor-pointer">
            Mostrar também esgotados
          </label>
        </div>

        {/* Status filters - Mobile-first pill buttons */}
        <div className="flex flex-wrap gap-2">
        <Button
          variant={statusFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => handleStatusFilterChange("all")}
          className={`py-1 px-3 rounded-full text-sm font-medium transition-colors ${
            statusFilter === "all"
              ? "bg-indigo-600 text-white hover:bg-indigo-700"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300"
          }`}
        >
          Todos
        </Button>
        <Button
          variant={statusFilter === "expired" ? "default" : "outline"}
          size="sm"
          onClick={() => handleStatusFilterChange("expired")}
          className={`py-1 px-3 rounded-full text-sm font-medium transition-colors ${
            statusFilter === "expired"
              ? "bg-indigo-600 text-white hover:bg-indigo-700"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300"
          }`}
        >
          Expirados
        </Button>
        <Button
          variant={statusFilter === "urgent" ? "default" : "outline"}
          size="sm"
          onClick={() => handleStatusFilterChange("urgent")}
          className={`py-1 px-3 rounded-full text-sm font-medium transition-colors ${
            statusFilter === "urgent"
              ? "bg-indigo-600 text-white hover:bg-indigo-700"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300"
          }`}
        >
          Urgente
        </Button>
        <Button
          variant={statusFilter === "attention" ? "default" : "outline"}
          size="sm"
          onClick={() => handleStatusFilterChange("attention")}
          className={`py-1 px-3 rounded-full text-sm font-medium transition-colors ${
            statusFilter === "attention"
              ? "bg-indigo-600 text-white hover:bg-indigo-700"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300"
          }`}
        >
          Atenção
        </Button>
        <Button
          variant={statusFilter === "ok" ? "default" : "outline"}
          size="sm"
          onClick={() => handleStatusFilterChange("ok")}
          className={`py-1 px-3 rounded-full text-sm font-medium transition-colors ${
            statusFilter === "ok"
              ? "bg-indigo-600 text-white hover:bg-indigo-700"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300"
          }`}
        >
          OK
        </Button>
        </div>
      </div>

      {/* Mobile-first search bar - Full width with border-gray-300 styling */}
      <div className="relative w-full mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 md:h-5 md:w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Pesquisar produto..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 md:pl-10 h-11 md:h-10 text-base border-gray-300 rounded-lg px-4 py-2 w-full"
        />
      </div>

      {filteredBatches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Package className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">
              {searchQuery || statusFilter !== "all" || showFinished
                ? "Nenhum produto encontrado"
                : "Ainda não existem produtos em stock"}
            </p>
            <p className="text-sm">
              {searchQuery || statusFilter !== "all"
                ? "Tente pesquisar por outro termo ou altere o filtro."
                : showFinished
                ? "Não existem produtos esgotados."
                : 'Adicione uma entrada em "Nova Entrada".'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4 md:space-y-6">
          {categoryNames.map((categoryName) => {
            const categoryBatches = batchesByCategory[categoryName];

            return (
              <div key={categoryName} className="space-y-3">
                {/* Category title */}
                <h2 className="text-lg font-semibold mb-2 text-foreground">
                  {categoryName}
                </h2>
                {/* Product entries */}
                {categoryBatches.map((batch) => {
                  const status = getBatchStatus(batch, restaurant);

                  const isFinished = (batch.quantity ?? 0) <= 0;
                  const isAdjusting = adjustingBatchId === batch.id;

                  return (
                    <div
                      key={batch.id}
                      className={`bg-white rounded-xl shadow-sm p-4 mb-3 border border-gray-100 hover:shadow-md transition-shadow ${
                        isFinished ? "opacity-60" : ""
                      }`}
                    >
                      {/* Top row: Product name bold, status badge aligned right */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base md:text-lg font-semibold text-foreground">
                              {batch.name}
                            </h3>
                            {/* Finished badge */}
                            {isFinished && (
                              <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600">
                                Esgotado
                              </Badge>
                            )}
                          </div>
                          {/* Display packaging and size info if available */}
                          {(batch.packagingType || (batch.size && batch.sizeUnit)) && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {[
                                batch.packagingType,
                                batch.size && batch.sizeUnit ? `${batch.size} ${batch.sizeUnit}` : null
                              ].filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <StatusBadge status={getBadgeStatus(status)} label={status.label} />
                          {/* Edit/Delete buttons - Small icon buttons aligned right */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-muted-foreground hover:text-foreground"
                            onClick={() => handleEdit(batch)}
                            aria-label="Editar entrada"
                            disabled={isAdjusting || isPending}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(batch)}
                            aria-label="Eliminar entrada"
                            disabled={isAdjusting || isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Second row: Quantity with +/- buttons + Location */}
                      <div className="flex flex-col sm:flex-row gap-2 text-sm text-muted-foreground mb-2">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 flex-shrink-0" />
                          <span className="font-medium text-foreground">
                            {batch.quantity} {batch.unit}
                          </span>
                          {/* Quantity adjustment buttons */}
                          {!isFinished && (
                            <div className="flex items-center gap-1 ml-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 text-sm border-gray-300 hover:bg-gray-50"
                                onClick={() => handleAdjustQuantity(batch.id, -1)}
                                disabled={isAdjusting || isPending}
                                aria-label="Diminuir quantidade"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 text-sm border-gray-300 hover:bg-gray-50"
                                onClick={() => handleAdjustQuantity(batch.id, 1)}
                                disabled={isAdjusting || isPending}
                                aria-label="Aumentar quantidade"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        {batch.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{batch.location.name}</span>
                          </div>
                        )}
                      </div>

                      {/* Third row: Expiry date */}
                      <div className="text-sm">
                        <span className="font-medium text-foreground">Validade: </span>
                        <span>
                          {format(
                            new Date(batch.expiryDate),
                            "dd/MM/yyyy"
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog de edição */}
      {editDialogOpen && editingBatch && editingBatch.id && categories && locations && (
        <EditBatchDialog
          batch={editingBatch}
          categories={categories}
          locations={locations}
          open={editDialogOpen}
          onOpenChange={(open: boolean) => {
            setEditDialogOpen(open);
            if (!open) {
              setEditingBatch(null);
            }
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

