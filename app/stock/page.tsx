import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getRestaurantByTenantId } from "@/lib/data-access";
import { PageHeader } from "@/components/page-header";
import { StockViewWrapper } from "@/components/stock-view-wrapper";
import { AuthGuard } from "@/components/auth-guard";
import { Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

/**
 * Stock page - Protected route
 * Busca dados do servidor e passa para o componente client StockView
 * que gere toda a lógica de UI, estado e interações.
 */
export default async function StockPage() {
  // Check authentication via cookie
  const cookieStore = await cookies();
  const restaurantId = cookieStore.get("clearskok_restaurantId")?.value;

  if (!restaurantId || !["A", "B", "C", "D"].includes(restaurantId)) {
    redirect("/acesso");
  }

  try {
    const restaurant = await getRestaurantByTenantId(restaurantId as "A" | "B" | "C" | "D");

    const batches = await db.productBatch.findMany({
      where: {
        restaurantId: restaurant.id,
        // Fetch all batches; client component will filter by quantity
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
    <AuthGuard>
      <div className="space-y-6">
        <PageHeader
          title="Stock"
          description="Lista de produtos em stock organizados por categoria ou por produto."
        />

        <StockViewWrapper
          batches={JSON.parse(JSON.stringify(batches))}
          restaurant={JSON.parse(JSON.stringify(restaurant))}
          categories={JSON.parse(JSON.stringify(restaurant.categories))}
          locations={JSON.parse(JSON.stringify(restaurant.locations))}
        />
      </div>
    </AuthGuard>
  );
  } catch (error) {
    console.error("Error loading stock page:", error);
    return (
      <div className="space-y-6">
        <PageHeader
          title="Stock"
          description="Lista de produtos em stock organizados por categoria ou por produto."
        />
        <Card>
          <CardContent className="py-12 text-center text-destructive">
            <Package className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">
              Erro ao carregar stock
            </p>
            <p className="text-sm text-muted-foreground">
              Por favor, recarregue a página ou contacte o suporte.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
}
