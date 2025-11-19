import { getRestaurant } from "@/lib/data-access"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { updateSettings, createCategory, createLocation, deleteCategory, deleteLocation } from "@/app/actions"
import { Trash2 } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const restaurant = await getRestaurant()

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Definições" 
        description="Gerir configurações do restaurante"
      />

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="locations">Localizações</TabsTrigger>
        </TabsList>
        
        {/* Tab: Geral */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Alertas</CardTitle>
              <CardDescription>
                Configurar quando os produtos devem começar a aparecer como "A expirar".
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={updateSettings} className="flex items-end gap-4">
                <div className="space-y-2 flex-1 max-w-sm">
                  <label className="text-sm font-medium">Dias antes de expirar</label>
                  <Input 
                    name="alertDays" 
                    type="number" 
                    min="1" 
                    defaultValue={restaurant.alertDaysBeforeExpiry} 
                    required 
                  />
                </div>
                <Button type="submit">Guardar</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Categorias */}
        <TabsContent value="categories">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Nova Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={createCategory} className="flex gap-4">
                  <Input name="name" placeholder="Nome da categoria (ex: Congelados)" required />
                  <Button type="submit">Adicionar</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Categorias Existentes</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {restaurant.categories.map((cat) => (
                    <li key={cat.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                      <span>{cat.name}</span>
                      <form action={deleteCategory.bind(null, cat.id)}>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </form>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Localizações */}
        <TabsContent value="locations">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Nova Localização</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={createLocation} className="flex gap-4">
                  <Input name="name" placeholder="Nome da localização (ex: Arca Frigorífica)" required />
                  <Button type="submit">Adicionar</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Localizações Existentes</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {restaurant.locations.map((loc) => (
                    <li key={loc.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                      <span>{loc.name}</span>
                      <form action={deleteLocation.bind(null, loc.id)}>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </form>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
