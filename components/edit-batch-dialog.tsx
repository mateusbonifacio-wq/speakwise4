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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronUp } from "lucide-react";
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
  const [showDetails, setShowDetails] = useState(
    !!(batch.packagingType || (batch.size && batch.sizeUnit))
  );

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
      // Only refresh if dialog is still open (user might have closed it)
      if (open) {
        router.refresh();
      }
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
      {/* Mobile-first dialog: full width on mobile, max-w-md on desktop */}
      <DialogContent className="w-[95vw] max-w-md sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <form action={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">Editar Entrada</DialogTitle>
            <DialogDescription className="text-sm md:text-base">
              Atualize os detalhes desta entrada de stock.
            </DialogDescription>
          </DialogHeader>

          {/* Mobile-first form: Stack fields on mobile, 2-col on desktop */}
          <div className="grid gap-4 md:gap-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-sm md:text-base font-medium">
                Nome do produto
              </Label>
              <Input
                id="edit-name"
                name="name"
                defaultValue={batch.name}
                placeholder="Ex: Leite meio-gordo"
                className="h-11 md:h-10 text-base"
                required
              />
            </div>

            {/* Quantity and Unit: Stack on mobile, side-by-side on desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-quantity" className="text-sm md:text-base font-medium">
                  Quantidade
                </Label>
                <Input
                  id="edit-quantity"
                  name="quantity"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={batch.quantity}
                  className="h-11 md:h-10 text-base"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-unit" className="text-sm md:text-base font-medium">
                  Unidade
                </Label>
                <Input
                  id="edit-unit"
                  name="unit"
                  defaultValue={batch.unit}
                  className="w-full h-11 md:h-10 text-base"
                />
              </div>
            </div>

            {/* Expiry date - Full width, larger for mobile date picker */}
            <div className="space-y-2">
              <Label htmlFor="edit-expiryDate" className="text-sm md:text-base font-medium">
                Data de validade
              </Label>
              <Input
                id="edit-expiryDate"
                name="expiryDate"
                type="date"
                defaultValue={expiryDateString}
                className="h-11 md:h-10 text-base"
                required
              />
            </div>

            {/* Category - Full width select */}
            <div className="space-y-2">
              <Label htmlFor="edit-categoryId" className="text-sm md:text-base font-medium">
                Categoria
              </Label>
              <select
                id="edit-categoryId"
                name="categoryId"
                defaultValue={batch.categoryId ? String(batch.categoryId) : ""}
                className="flex h-11 md:h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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

            {/* Location - Full width select */}
            <div className="space-y-2">
              <Label htmlFor="edit-locationId" className="text-sm md:text-base font-medium">
                Localização
              </Label>
              <select
                id="edit-locationId"
                name="locationId"
                defaultValue={batch.locationId ? String(batch.locationId) : ""}
                className="flex h-11 md:h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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

            {/* Optional Details Section - Collapsible */}
            <div className="pt-4 md:pt-6 border-t">
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center justify-between w-full text-left mb-4"
                disabled={isSubmitting}
              >
                <Label className="text-sm md:text-base font-medium cursor-pointer">
                  Detalhes do Produto (Opcional)
                </Label>
                {showDetails ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {showDetails && (
                <div className="space-y-4 md:space-y-5 animate-in slide-in-from-top-2">
                  {/* Packaging Type */}
                  <div className="space-y-2">
                    <Label htmlFor="edit-packagingType" className="text-sm md:text-base font-medium">
                      Tipo de Embalagem
                    </Label>
                    <select
                      id="edit-packagingType"
                      name="packagingType"
                      defaultValue={batch.packagingType ? String(batch.packagingType) : ""}
                      className="flex h-11 md:h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Selecione o tipo de embalagem</option>
                      <option value="Lata">Lata</option>
                      <option value="Garrafa">Garrafa</option>
                      <option value="Caixa">Caixa</option>
                      <option value="Frasco">Frasco</option>
                      <option value="Barril">Barril</option>
                      <option value="Pack">Pack</option>
                      <option value="Mini">Mini</option>
                      <option value="Média">Média</option>
                      <option value="Saco">Saco</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>

                  {/* Size and Size Unit */}
                  <div className="space-y-2">
                    <Label htmlFor="edit-size" className="text-sm md:text-base font-medium">
                      Tamanho / Volume
                    </Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        id="edit-size"
                        name="size"
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={batch.size ? String(batch.size) : ""}
                        placeholder="Ex: 330"
                        className="flex-1 h-11 md:h-10 text-base"
                        disabled={isSubmitting}
                      />
                      <select
                        id="edit-sizeUnit"
                        name="sizeUnit"
                        defaultValue={batch.sizeUnit ? String(batch.sizeUnit) : ""}
                        className="flex h-11 md:h-10 w-full sm:w-32 rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Unidade</option>
                        <option value="mL">mL</option>
                        <option value="L">L</option>
                        <option value="g">g</option>
                        <option value="kg">kg</option>
                        <option value="un">un</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm md:text-base text-destructive">
              {error}
            </div>
          )}

          {/* Mobile-first footer: Stack on mobile, row on desktop */}
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="w-full sm:w-auto order-2 sm:order-1"
              size="lg"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full sm:w-auto order-1 sm:order-2"
              size="lg"
            >
              {isSubmitting ? "A guardar..." : "Guardar alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

