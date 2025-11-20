"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { deleteProductBatch } from "@/app/actions";
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
import { StatusBadge } from "./status-badge";
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

  // Map status to badge type
  const getBadgeStatus = (status: ReturnType<typeof getBatchStatus>): "expired" | "urgent" | "attention" | "ok" => {
    if (status.status === "expired") return "expired";
    if (status.status === "urgent") return "urgent";
    if (status.status === "attention") return "attention";
    return "ok";
  };

  return (
    <div className="space-y-4 md:space-y-6">
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
              <div key={categoryName} className="space-y-3">
                {/* Category title */}
                <h2 className="text-lg font-semibold mb-2 text-foreground">
                  {categoryName}
                </h2>
                {/* Product entries */}
                {categoryBatches.map((batch) => {
                  const status = getBatchStatus(batch, restaurant);

                  return (
                    <div
                      key={batch.id}
                      className="bg-white rounded-xl shadow-sm p-4 mb-3 border border-gray-100 hover:shadow-md transition-shadow"
                    >
                      {/* Top row: Product name bold, status badge aligned right */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                        <h3 className="text-base md:text-lg font-semibold text-foreground flex-1">
                          {batch.name}
                        </h3>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <StatusBadge status={getBadgeStatus(status)} label={status.label} />
                          {/* Edit/Delete buttons - Small icon buttons aligned right */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-muted-foreground hover:text-foreground"
                            onClick={() => handleEdit(batch)}
                            aria-label="Editar entrada"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(batch)}
                            aria-label="Eliminar entrada"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Second row: Quantity + Location */}
                      <div className="flex flex-col sm:flex-row gap-2 text-sm text-muted-foreground mb-2">
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

