"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createProductBatch } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";

import type { Category, Location } from "@prisma/client";

interface NewEntryFormProps {
  restaurantId: string;
  categories: Category[];
  locations: Location[];
}

/**
 * New Entry Form - Mobile-first layout with enhanced UX
 * - Shows success/error feedback via toast
 * - Resets form automatically after successful submission
 * - Prevents multiple clicks with loading state
 */
export default function NewEntryForm({
  restaurantId,
  categories,
  locations,
}: NewEntryFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDetails, setShowDetails] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    quantity: "",
    unit: "un",
    expiryDate: "",
    categoryId: "",
    locationId: "",
    packagingType: "",
    size: "",
    sizeUnit: "",
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (isPending) return;

    const formElement = e.currentTarget;
    const formDataObj = new FormData(formElement);

    startTransition(async () => {
      try {
        const result = await createProductBatch(formDataObj);

        if (result?.success) {
          // Show success toast
          toast.success(result.message || "Entrada adicionada com sucesso!", {
            description: "O produto foi adicionado ao stock e pode ser visualizado na página Stock.",
            duration: 5000,
          });

          // Reset form
          setFormData({
            name: "",
            quantity: "",
            unit: "un",
            expiryDate: "",
            categoryId: "",
            locationId: "",
            packagingType: "",
            size: "",
            sizeUnit: "",
          });
          setShowDetails(false);

          // Reset form element (for native HTML form reset)
          formElement.reset();

          // Refresh router to update any cached data
          router.refresh();
        } else {
          // Show error toast
          toast.error("Erro ao guardar entrada", {
            description: result?.error || "Ocorreu um erro ao tentar guardar a entrada. Por favor, tente novamente.",
            duration: 5000,
          });
        }
      } catch (error) {
        // Handle unexpected errors
        console.error("Unexpected error:", error);
        toast.error("Erro inesperado", {
          description: "Ocorreu um erro inesperado. Por favor, tente novamente.",
          duration: 5000,
        });
      }
    });
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="Nova Entrada"
        description="Registe uma nova entrada de produto no stock."
      />

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg md:text-xl">Detalhes do Produto</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
            {/* Mobile-first: All fields stack vertically, full width on mobile */}
            {/* Desktop: Uses 2-column grid for better space utilization */}
            
            {/* Product name - Full width */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm md:text-base font-medium">
                Nome do produto
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Ex: Leite meio-gordo"
                className="h-11 md:h-10 text-base"
                required
                disabled={isPending}
              />
            </div>

            {/* Quantity and Unit - Stack on mobile, side-by-side on desktop */}
            <div className="space-y-2">
              <Label htmlFor="quantity" className="text-sm md:text-base font-medium">
                Quantidade
              </Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  placeholder="Ex: 10"
                  className="flex-1 h-11 md:h-10 text-base"
                  required
                  disabled={isPending}
                />
                <Select
                  name="unit"
                  value={formData.unit}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, unit: value }))
                  }
                  disabled={isPending}
                >
                  <SelectTrigger className="w-full sm:w-24 h-11 md:h-10 text-base" aria-label="Unidade">
                    <SelectValue placeholder="un" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="un">un</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Expiry date - Full width, larger input for mobile date picker */}
            <div className="space-y-2">
              <Label htmlFor="expiryDate" className="text-sm md:text-base font-medium">
                Data de validade
              </Label>
              <Input
                id="expiryDate"
                name="expiryDate"
                type="date"
                value={formData.expiryDate}
                onChange={handleInputChange}
                className="h-11 md:h-10 text-base"
                required
                disabled={isPending}
              />
            </div>

            {/* Category - Full width */}
            <div className="space-y-2">
              <Label htmlFor="categoryId" className="text-sm md:text-base font-medium">
                Categoria
              </Label>
              <Select
                name="categoryId"
                value={formData.categoryId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, categoryId: value }))
                }
                disabled={isPending}
              >
                <SelectTrigger className="h-11 md:h-10 text-base">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location - Full width */}
            <div className="space-y-2">
              <Label htmlFor="locationId" className="text-sm md:text-base font-medium">
                Localização
              </Label>
              <Select
                name="locationId"
                value={formData.locationId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, locationId: value }))
                }
                disabled={isPending}
              >
                <SelectTrigger className="h-11 md:h-10 text-base">
                  <SelectValue placeholder="Selecione uma localização" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Optional Details Section - Collapsible */}
            <div className="pt-4 md:pt-6 border-t">
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center justify-between w-full text-left mb-4"
                disabled={isPending}
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
                    <Label htmlFor="packagingType" className="text-sm md:text-base font-medium">
                      Tipo de Embalagem
                    </Label>
                    <Select
                      name="packagingType"
                      value={formData.packagingType}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, packagingType: value }))
                      }
                      disabled={isPending}
                    >
                      <SelectTrigger className="h-11 md:h-10 text-base">
                        <SelectValue placeholder="Selecione o tipo de embalagem" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Lata">Lata</SelectItem>
                        <SelectItem value="Garrafa">Garrafa</SelectItem>
                        <SelectItem value="Caixa">Caixa</SelectItem>
                        <SelectItem value="Frasco">Frasco</SelectItem>
                        <SelectItem value="Pack">Pack</SelectItem>
                        <SelectItem value="Mini">Mini</SelectItem>
                        <SelectItem value="Média">Média</SelectItem>
                        <SelectItem value="Saco">Saco</SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Size and Size Unit */}
                  <div className="space-y-2">
                    <Label htmlFor="size" className="text-sm md:text-base font-medium">
                      Tamanho / Volume
                    </Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        id="size"
                        name="size"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.size}
                        onChange={handleInputChange}
                        placeholder="Ex: 330"
                        className="flex-1 h-11 md:h-10 text-base"
                        disabled={isPending}
                      />
                      <Select
                        name="sizeUnit"
                        value={formData.sizeUnit}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, sizeUnit: value }))
                        }
                        disabled={isPending}
                      >
                        <SelectTrigger className="w-full sm:w-32 h-11 md:h-10 text-base" aria-label="Unidade do tamanho">
                          <SelectValue placeholder="Unidade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mL">mL</SelectItem>
                          <SelectItem value="L">L</SelectItem>
                          <SelectItem value="g">g</SelectItem>
                          <SelectItem value="kg">kg</SelectItem>
                          <SelectItem value="un">un</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Submit button - Full width on mobile, auto on desktop */}
            <div className="pt-4 md:pt-6">
              <Button
                type="submit"
                className="w-full md:w-auto bg-indigo-600 text-white rounded-lg py-3 px-4 shadow-md hover:bg-indigo-700 md:min-w-[200px] disabled:opacity-50 disabled:cursor-not-allowed"
                size="lg"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    A guardar...
                  </>
                ) : (
                  "Guardar entrada"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
