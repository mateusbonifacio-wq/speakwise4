"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { deleteProductBatch } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
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
import { MapPin, Package, Search, Edit, Trash2 } from "lucide-react";
import { EditBatchDialog } from "./edit-batch-dialog";
import { getBatchStatus, groupBatchesByCategory } from "@/lib/stock-utils";
import type { Category, Location, Restaurant } from "@prisma/client";
import type { BatchWithRelations } from "@/lib/stock-utils";

interface StockViewSimpleProps {
  batches: BatchWithRelations[];
  restaurant: Restaurant;
  categories: Category[];
  locations: Location[];
}

/**
 * Versão simplificada do StockView com Search bar
 */
export function StockViewSimple({
  batches,
  restaurant,
  categories,
  locations,
}: StockViewSimpleProps) {
  const router = useRouter();
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

  // Filtrar batches baseado na pesquisa
  const filteredBatches = useMemo(() => {
    if (!searchQuery.trim()) return batches;
    const query = searchQuery.toLowerCase();
    return batches.filter((batch) =>
      batch.name?.toLowerCase().includes(query)
    );
  }, [batches, searchQuery]);

  // Agrupar por categoria
  const batchesByCategory = useMemo(
    () => groupBatchesByCategory(filteredBatches),
    [filteredBatches]
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
    <div className="space-y-4 md:space-y-6">
      {/* Mobile-first search bar - Full width on mobile, max-w-sm on desktop */}
      <div className="relative w-full md:max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 md:h-5 md:w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Pesquisar produto..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 md:pl-10 h-11 md:h-10 text-base"
        />
      </div>

      {filteredBatches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Package className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">
              {searchQuery
                ? "Nenhum produto encontrado"
                : "Ainda não existem produtos em stock"}
            </p>
            <p className="text-sm">
              {searchQuery
                ? "Tente pesquisar por outro termo."
                : 'Adicione uma entrada em "Nova Entrada".'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4 md:space-y-6">
          {categoryNames.map((categoryName) => {
            const categoryBatches = batchesByCategory[categoryName];

            return (
              <Card key={categoryName} className="overflow-hidden">
                <CardHeader className="pb-3 px-4 pt-4 md:px-6 md:pt-6">
                  <CardTitle className="text-lg md:text-xl font-semibold">
                    {categoryName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 md:px-6 md:pb-6">
                  <div className="space-y-3 md:space-y-4">
                    {categoryBatches.map((batch) => {
                      const status = getBatchStatus(batch, restaurant);

                      return (
                        <div
                          key={batch.id}
                          className="flex flex-col gap-3 rounded-lg border p-3 md:p-4 hover:bg-muted/50 transition-colors"
                        >
                          {/* Mobile-first header: stack on mobile, row on desktop */}
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <h3 className="text-base md:text-lg font-semibold text-foreground flex-1">
                              {batch.name}
                            </h3>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge className={getBadgeClassName(status)}>
                                {status.label}
                              </Badge>
                              {/* Larger touch targets for mobile - min 44x44px */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 md:h-9 md:w-9 touch-manipulation"
                                onClick={() => handleEdit(batch)}
                                aria-label="Editar entrada"
                              >
                                <Edit className="h-4 w-4 md:h-4 md:w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 md:h-9 md:w-9 text-destructive hover:text-destructive touch-manipulation"
                                onClick={() => handleDelete(batch)}
                                aria-label="Eliminar entrada"
                              >
                                <Trash2 className="h-4 w-4 md:h-4 md:w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Product details - Stack on mobile, grid on desktop */}
                          <div className="grid grid-cols-1 gap-2 text-sm md:text-base text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 flex-shrink-0" />
                              <span className="font-medium text-foreground">
                                {batch.quantity} {batch.unit}
                              </span>
                            </div>
                            {batch.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate">{batch.location.name}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-1">
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

