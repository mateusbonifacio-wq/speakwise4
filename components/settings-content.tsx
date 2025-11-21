"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { updateSettings, createCategory, createLocation, updateCategoryAlertById, deleteCategoryById, deleteLocationById } from "@/app/actions";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Restaurant, Category, Location } from "@prisma/client";

interface SettingsContentProps {
  restaurant: Restaurant & {
    categories: Category[];
    locations: Location[];
  };
}

/**
 * Settings Content - Mobile-first layout
 * Tabs adapt to mobile with better spacing and touch targets
 */
export default function SettingsContent({ restaurant }: SettingsContentProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [categoryName, setCategoryName] = useState("");
  const [locationName, setLocationName] = useState("");

  const handleCreateCategory = async (formData: FormData) => {
    startTransition(async () => {
      try {
        const result = await createCategory(formData);
        if (result?.success) {
          toast.success(result.message || "Categoria criada com sucesso!");
          setCategoryName("");
          router.refresh();
        } else {
          toast.error("Erro ao criar categoria", {
            description: result?.error || "Ocorreu um erro ao criar a categoria.",
          });
        }
      } catch (error) {
        console.error("Unexpected error:", error);
        toast.error("Erro inesperado", {
          description: "Ocorreu um erro inesperado. Por favor, tente novamente.",
        });
      }
    });
  };

  const handleCreateLocation = async (formData: FormData) => {
    startTransition(async () => {
      try {
        const result = await createLocation(formData);
        if (result?.success) {
          toast.success(result.message || "Localização criada com sucesso!");
          setLocationName("");
          router.refresh();
        } else {
          toast.error("Erro ao criar localização", {
            description: result?.error || "Ocorreu um erro ao criar a localização.",
          });
        }
      } catch (error) {
        console.error("Unexpected error:", error);
        toast.error("Erro inesperado", {
          description: "Ocorreu um erro inesperado. Por favor, tente novamente.",
        });
      }
    });
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader 
        title="Definições" 
        description="Gerir configurações do restaurante"
      />

      <Tabs defaultValue="general" className="w-full">
        {/* Mobile-first tabs: Full width, larger touch targets */}
        <TabsList className="grid w-full grid-cols-3 h-auto p-1 md:h-10">
          <TabsTrigger 
            value="general" 
            className="text-xs md:text-sm py-2 md:py-1.5 px-2 md:px-4 data-[state=active]:bg-background"
          >
            Geral
          </TabsTrigger>
          <TabsTrigger 
            value="categories"
            className="text-xs md:text-sm py-2 md:py-1.5 px-2 md:px-4 data-[state=active]:bg-background"
          >
            Categorias
          </TabsTrigger>
          <TabsTrigger 
            value="locations"
            className="text-xs md:text-sm py-2 md:py-1.5 px-2 md:px-4 data-[state=active]:bg-background"
          >
            Localizações
          </TabsTrigger>
        </TabsList>
        
        {/* Tab: Geral - Mobile-first form */}
        <TabsContent value="general" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
          <Card>
            <CardHeader className="px-4 pt-4 md:px-6 md:pt-6">
              <CardTitle className="text-lg md:text-xl">Alertas de Validade</CardTitle>
              <CardDescription className="text-sm md:text-base">
                Configure quantos dias antes da validade mostrar alertas
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4 md:px-6 md:pb-6">
              <form action={updateSettings} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="alertDays" className="text-sm md:text-base font-medium">
                    Dias antes da validade
                  </label>
                  <Input
                    id="alertDays"
                    name="alertDays"
                    type="number"
                    min="1"
                    defaultValue={restaurant.alertDaysBeforeExpiry}
                    className="w-full md:max-w-xs h-11 md:h-10 text-base"
                  />
                </div>
                <Button type="submit" className="w-full md:w-auto bg-indigo-600 text-white rounded-lg py-3 px-4 shadow-md hover:bg-indigo-700" size="lg">
                  Guardar
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Categorias - Mobile-first layout */}
        <TabsContent value="categories" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
          <Card>
            <CardHeader className="px-4 pt-4 md:px-6 md:pt-6">
              <CardTitle className="text-lg md:text-xl">Categorias</CardTitle>
              <CardDescription className="text-sm md:text-base">
                Gerir categorias de produtos
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4 md:px-6 md:pb-6 space-y-4 md:space-y-5">
              {/* Stack form on mobile, row on desktop */}
              <form action={handleCreateCategory} className="flex flex-col sm:flex-row gap-2 md:gap-3">
                <Input
                  name="name"
                  placeholder="Nome da categoria"
                  className="flex-1 h-11 md:h-10 text-base"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  required
                  disabled={isPending}
                />
                <Button 
                  type="submit" 
                  className="w-full sm:w-auto bg-indigo-600 text-white rounded-lg py-3 px-4 shadow-md hover:bg-indigo-700" 
                  size="lg"
                  disabled={isPending}
                >
                  {isPending ? "A guardar..." : "Adicionar"}
                </Button>
              </form>

              <div className="space-y-3 md:space-y-4">
                <h3 className="text-sm md:text-base font-medium">Categorias existentes</h3>
                <ul className="space-y-3 md:space-y-4">
                  {restaurant.categories.map((category) => (
                    <li
                      key={category.id}
                      className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 rounded-lg border p-3 md:p-4"
                    >
                      <div className="space-y-3 flex-1 min-w-0">
                        <p className="font-medium text-base md:text-lg">{category.name}</p>
                        {/* Alert inputs - Stack on mobile, row on desktop */}
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 text-sm md:text-base">
                          <div className="flex-1 space-y-1">
                            <label className="text-xs md:text-sm font-medium">Aviso urgente (dias)</label>
                            <form action={updateCategoryAlertById} className="flex gap-2">
                              <input type="hidden" name="categoryId" value={category.id} />
                              <Input
                                name="alertDays"
                                type="number"
                                min="0"
                                defaultValue={category.alertDaysBeforeExpiry ?? restaurant.alertDaysBeforeExpiry}
                                className="w-full sm:w-24 h-10 md:h-9 text-base"
                              />
                              <Button type="submit" size="sm" variant="outline" className="flex-shrink-0 border border-gray-300 text-gray-700 rounded-lg py-2 px-4">
                                Guardar
                              </Button>
                            </form>
                          </div>
                          <div className="flex-1 space-y-1">
                            <label className="text-xs md:text-sm font-medium">Aviso (dias)</label>
                            <form action={updateCategoryAlertById} className="flex gap-2">
                              <input type="hidden" name="categoryId" value={category.id} />
                              <Input
                                name="warningDays"
                                type="number"
                                min="0"
                                defaultValue={category.warningDaysBeforeExpiry ?? restaurant.alertDaysBeforeExpiry}
                                className="w-full sm:w-24 h-10 md:h-9 text-base"
                              />
                              <Button type="submit" size="sm" variant="outline" className="flex-shrink-0 border border-gray-300 text-gray-700 rounded-lg py-2 px-4">
                                Guardar
                              </Button>
                            </form>
                          </div>
                        </div>
                      </div>
                      {/* Delete button - Larger touch target on mobile */}
                      <form action={deleteCategoryById} className="flex-shrink-0">
                        <input type="hidden" name="categoryId" value={category.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 md:h-9 md:w-9 text-destructive hover:text-destructive touch-manipulation self-start sm:self-center"
                          aria-label="Eliminar categoria"
                        >
                          <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
                        </Button>
                      </form>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Localizações - Mobile-first layout */}
        <TabsContent value="locations" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
          <Card>
            <CardHeader className="px-4 pt-4 md:px-6 md:pt-6">
              <CardTitle className="text-lg md:text-xl">Localizações</CardTitle>
              <CardDescription className="text-sm md:text-base">
                Gerir localizações de armazenamento
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4 md:px-6 md:pb-6 space-y-4 md:space-y-5">
              {/* Stack form on mobile, row on desktop */}
              <form action={handleCreateLocation} className="flex flex-col sm:flex-row gap-2 md:gap-3">
                <Input
                  name="name"
                  placeholder="Nome da localização"
                  className="flex-1 h-11 md:h-10 text-base"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  required
                  disabled={isPending}
                />
                <Button 
                  type="submit" 
                  className="w-full sm:w-auto bg-indigo-600 text-white rounded-lg py-3 px-4 shadow-md hover:bg-indigo-700" 
                  size="lg"
                  disabled={isPending}
                >
                  {isPending ? "A guardar..." : "Adicionar"}
                </Button>
              </form>

              <div className="space-y-3 md:space-y-4">
                <h3 className="text-sm md:text-base font-medium">Localizações existentes</h3>
                <ul className="space-y-2 md:space-y-3">
                  {restaurant.locations.map((location) => (
                    <li
                      key={location.id}
                      className="flex items-center justify-between gap-3 rounded-lg border p-3 md:p-4"
                    >
                      <p className="font-medium text-base md:text-lg flex-1">{location.name}</p>
                      {/* Larger touch target for delete button */}
                      <form action={deleteLocationById} className="flex-shrink-0">
                        <input type="hidden" name="locationId" value={location.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 md:h-9 md:w-9 text-destructive hover:text-destructive touch-manipulation"
                          aria-label="Eliminar localização"
                        >
                          <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
                        </Button>
                      </form>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

