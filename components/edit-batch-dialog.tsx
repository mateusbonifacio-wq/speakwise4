"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProductBatch } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Category, Location } from "@prisma/client";
import type { BatchWithRelations } from "@/lib/stock-utils";

interface EditBatchDialogProps {
  batch: BatchWithRelations;
  categories: Category[];
  locations: Location[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditBatchDialog({
  batch,
  categories,
  locations,
  open,
  onOpenChange,
}: EditBatchDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validação defensiva inicial
  if (!batch || !batch.id) {
    console.warn("EditBatchDialog: batch inválido");
    return null;
  }

  if (!categories || !Array.isArray(categories)) {
    console.warn("EditBatchDialog: categories inválidas");
    return null;
  }

  if (!locations || !Array.isArray(locations)) {
    console.warn("EditBatchDialog: locations inválidas");
    return null;
  }

  async function handleSubmit(formData: FormData) {
    try {
      setIsSubmitting(true);
      setError(null);
      
      if (!batch?.id) {
        throw new Error("ID do batch não encontrado");
      }

      await updateProductBatch(batch.id, formData);
      setIsSubmitting(false);
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      console.error("Error updating batch:", err);
      setIsSubmitting(false);
      setError(err instanceof Error ? err.message : "Erro ao guardar alterações");
    }
  }

  // Formatar data para input type="date" (YYYY-MM-DD)
  // Garantir que funciona tanto com Date objects como strings
  let expiryDateString = "";
  try {
    if (!batch?.expiryDate) {
      expiryDateString = new Date().toISOString().split("T")[0];
    } else {
      const expiryDate =
        typeof batch.expiryDate === "string"
          ? new Date(batch.expiryDate)
          : batch.expiryDate instanceof Date
          ? batch.expiryDate
          : new Date(batch.expiryDate);
      
      if (isNaN(expiryDate.getTime())) {
        expiryDateString = new Date().toISOString().split("T")[0];
      } else {
        expiryDateString = expiryDate.toISOString().split("T")[0];
      }
    }
  } catch (err) {
    console.error("Error formatting date:", err);
    expiryDateString = new Date().toISOString().split("T")[0];
  }

  // Se batch não está disponível ou dialog está fechado, não renderizar nada
  if (!open || !batch || !batch.id) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form action={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar Entrada</DialogTitle>
            <DialogDescription>
              Atualize os detalhes desta entrada de stock.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome do produto</Label>
              <Input
                id="edit-name"
                name="name"
                defaultValue={batch.name}
                placeholder="Ex: Leite meio-gordo"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-quantity">Quantidade</Label>
                <Input
                  id="edit-quantity"
                  name="quantity"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={batch.quantity}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-unit">Unidade</Label>
                <Input
                  id="edit-unit"
                  name="unit"
                  defaultValue={batch.unit}
                  className="w-full"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-expiryDate">Data de validade</Label>
              <Input
                id="edit-expiryDate"
                name="expiryDate"
                type="date"
                defaultValue={expiryDateString}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-categoryId">Categoria</Label>
              <select
                id="edit-categoryId"
                name="categoryId"
                defaultValue={batch.categoryId ? String(batch.categoryId) : ""}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Sem categoria</option>
                {categories && categories.length > 0
                  ? categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))
                  : null}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-locationId">Localização</Label>
              <select
                id="edit-locationId"
                name="locationId"
                defaultValue={batch.locationId ? String(batch.locationId) : ""}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Sem localização</option>
                {locations && locations.length > 0
                  ? locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))
                  : null}
              </select>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "A guardar..." : "Guardar alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

