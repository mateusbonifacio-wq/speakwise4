import { createProductBatch } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { Category, Location } from "@prisma/client";

interface NewEntryFormProps {
  restaurantId: string;
  categories: Category[];
  locations: Location[];
}

/**
 * New Entry Form - Mobile-first layout
 * All fields stack vertically on mobile for easy thumb navigation
 */
export default function NewEntryForm({
  restaurantId,
  categories,
  locations,
}: NewEntryFormProps) {
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
          <form action={createProductBatch} className="space-y-4 md:space-y-5">
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
                placeholder="Ex: Leite meio-gordo"
                className="h-11 md:h-10 text-base"
                required
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
                  placeholder="Ex: 10"
                  className="flex-1 h-11 md:h-10 text-base"
                  required
                />
                <Input
                  name="unit"
                  className="w-full sm:w-24 h-11 md:h-10 text-base"
                  defaultValue="un"
                  placeholder="un"
                  aria-label="Unidade"
                />
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
                className="h-11 md:h-10 text-base"
                required
              />
            </div>

            {/* Category - Full width */}
            <div className="space-y-2">
              <Label htmlFor="categoryId" className="text-sm md:text-base font-medium">
                Categoria
              </Label>
              <Select name="categoryId">
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
              <Select name="locationId">
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

            {/* Submit button - Full width on mobile, auto on desktop */}
            <div className="pt-2 md:pt-4">
              <Button 
                type="submit" 
                className="w-full md:w-auto md:min-w-[200px]" 
                size="lg"
              >
                Guardar entrada
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


