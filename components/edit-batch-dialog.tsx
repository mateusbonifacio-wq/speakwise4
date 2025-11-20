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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    await updateProductBatch(batch.id, formData);
    setIsSubmitting(false);
    onOpenChange(false);
    router.refresh();
  }

  // Formatar data para input type="date" (YYYY-MM-DD)
  // Garantir que funciona tanto com Date objects como strings
  const expiryDate =
    typeof batch.expiryDate === "string"
      ? new Date(batch.expiryDate)
      : batch.expiryDate;
  const expiryDateString = expiryDate.toISOString().split("T")[0];

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
              <Label>Categoria</Label>
              <Select
                name="categoryId"
                defaultValue={batch.categoryId || undefined}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sem categoria</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Localização</Label>
              <Select
                name="locationId"
                defaultValue={batch.locationId || undefined}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma localização" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sem localização</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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

