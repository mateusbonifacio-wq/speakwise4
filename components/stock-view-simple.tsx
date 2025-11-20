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
    <div className="space-y-6">
      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Pesquisar produto..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
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
                            <div className="flex items-center gap-2">
                              <Badge className={getBadgeClassName(status)}>
                                {status.label}
                              </Badge>
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

      {/* Dialog de edição - apenas renderiza se estiver aberto e tiver batch válido */}
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

