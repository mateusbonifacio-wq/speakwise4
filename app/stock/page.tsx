import { db } from "@/lib/db";
import { getRestaurant } from "@/lib/data-access";
import { PageHeader } from "@/components/page-header";
import { StockView } from "@/components/stock-view";
import { Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

/**
 * Stock page - Server component
 * Busca dados do servidor e passa para o componente client StockView
 * que gere toda a lógica de UI, estado e interações.
 */
export default async function StockPage() {
  const restaurant = await getRestaurant();

  const batches = await db.productBatch.findMany({
    where: {
      restaurantId: restaurant.id,
    },
    include: {
      category: true,
      location: true,
    },
    orderBy: {
      expiryDate: "asc",
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock"
        description="Lista de produtos em stock organizados por categoria ou por produto."
      />

      {batches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Package className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">
              Ainda não existem produtos em stock
            </p>
            <p className="text-sm">
              Adicione uma entrada em &quot;Nova Entrada&quot;.
            </p>
          </CardContent>
        </Card>
      ) : (
        <StockView
          batches={JSON.parse(JSON.stringify(batches))}
          restaurant={JSON.parse(JSON.stringify(restaurant))}
          categories={JSON.parse(JSON.stringify(restaurant.categories))}
          locations={JSON.parse(JSON.stringify(restaurant.locations))}
        />
      )}
    </div>
  );
}
