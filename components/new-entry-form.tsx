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

export default function NewEntryForm({
  restaurantId,
  categories,
  locations,
}: NewEntryFormProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Nova Entrada"
        description="Registe uma nova entrada de produto no stock."
      />

      <Card>
        <CardHeader>
          <CardTitle>Detalhes do Produto</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createProductBatch} className="space-y-4">

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do produto</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Ex: Leite meio-gordo"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade</Label>
                <div className="flex gap-2">
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ex: 10"
                    required
                  />
                  <Input
                    name="unit"
                    className="w-24"
                    defaultValue="un"
                    aria-label="Unidade"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiryDate">Data de validade</Label>
                <Input
                  id="expiryDate"
                  name="expiryDate"
                  type="date"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select name="categoryId">
                  <SelectTrigger>
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

              <div className="space-y-2">
                <Label>Localização</Label>
                <Select name="locationId">
                  <SelectTrigger>
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
            </div>

            <div className="pt-4">
              <Button type="submit">Guardar entrada</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


