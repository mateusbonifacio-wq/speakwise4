import { db } from "@/lib/db";
import { getRestaurantByTenantId } from "@/lib/data-access";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { differenceInCalendarDays } from "date-fns";
import { AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { RestaurantId } from "@/lib/auth";

interface DashboardContentProps {
  restaurantId: RestaurantId;
}

export default async function DashboardContent({
  restaurantId,
}: DashboardContentProps) {
  try {
    const restaurant = await getRestaurantByTenantId(restaurantId);

    const batches = await db.productBatch.findMany({
      where: {
        restaurantId: restaurant.id,
        status: "ACTIVE",
      },
      include: {
        category: true,
      },
    });

    const today = new Date();

    let expiredCount = 0;
    let urgentCount = 0;
    let warningCount = 0;
    let okCount = 0;

    batches.forEach((batch) => {
      const daysToExpiry = differenceInCalendarDays(
        new Date(batch.expiryDate),
        today
      );

      const urgentDays =
        batch.category?.alertDaysBeforeExpiry ?? restaurant.alertDaysBeforeExpiry;

      const warningDays =
        batch.category?.warningDaysBeforeExpiry ?? urgentDays;

      if (daysToExpiry < 0) {
        expiredCount++;
      } else if (daysToExpiry <= urgentDays) {
        urgentCount++;
      } else if (daysToExpiry <= warningDays) {
        warningCount++;
      } else {
        okCount++;
      }
    });

    return (
      <div className="space-y-6 md:space-y-8">
        {/* Mobile-first header: stack on mobile, row on desktop */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <PageHeader
            title="Visão Geral"
            description="Resumo do estado do stock hoje."
            className="pb-0"
          />
          {/* Full-width button on mobile for easy access */}
          <Link href="/nova-entrada" className="w-full md:w-auto">
            <Button className="w-full md:w-auto bg-indigo-600 text-white rounded-lg py-3 px-4 shadow-md hover:bg-indigo-700" size="lg">
              Nova Entrada
            </Button>
          </Link>
        </div>

        {/* Mobile-first grid: 2x2 on mobile (gap-3), 2 cols on tablet, 4 cols on desktop */}
        <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Status cards with mobile-first styling */}
          <Card className="bg-white rounded-xl shadow-sm p-4 mb-3 cursor-pointer hover:shadow-md transition-shadow">
            <div className="flex flex-row items-center justify-between mb-3">
              <CardTitle className="text-xs md:text-sm font-medium">Expirados</CardTitle>
              <XCircle className="h-4 w-4 md:h-5 md:w-5 text-destructive flex-shrink-0" />
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-bold text-destructive mb-1">
                {expiredCount}
              </div>
              <p className="text-xs text-muted-foreground leading-tight">
                Produtos fora de validade
              </p>
            </div>
          </Card>

          <Card className="bg-white rounded-xl shadow-sm p-4 mb-3 cursor-pointer hover:shadow-md transition-shadow">
            <div className="flex flex-row items-center justify-between mb-3">
              <CardTitle className="text-xs md:text-sm font-medium">Urgente</CardTitle>
              <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-orange-500 flex-shrink-0" />
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-bold text-orange-500 mb-1">
                {urgentCount}
              </div>
              <p className="text-xs text-muted-foreground leading-tight">
                Usar o mais rápido possível
              </p>
            </div>
          </Card>

          <Card className="bg-white rounded-xl shadow-sm p-4 mb-3 cursor-pointer hover:shadow-md transition-shadow">
            <div className="flex flex-row items-center justify-between mb-3">
              <CardTitle className="text-xs md:text-sm font-medium">Atenção</CardTitle>
              <Clock className="h-4 w-4 md:h-5 md:w-5 text-yellow-500 flex-shrink-0" />
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-bold text-yellow-500 mb-1">
                {warningCount}
              </div>
              <p className="text-xs text-muted-foreground leading-tight">
                A expirar em breve
              </p>
            </div>
          </Card>

          <Card className="bg-white rounded-xl shadow-sm p-4 mb-3 cursor-pointer hover:shadow-md transition-shadow">
            <div className="flex flex-row items-center justify-between mb-3">
              <CardTitle className="text-xs md:text-sm font-medium">Stock OK</CardTitle>
              <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-500 flex-shrink-0" />
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-bold text-green-500 mb-1">{okCount}</div>
              <p className="text-xs text-muted-foreground leading-tight">
                Validade segura
              </p>
            </div>
          </Card>
        </div>

        {/* Quick actions - stack on mobile, row on desktop */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-3">
          <h3 className="text-base md:text-lg font-semibold leading-none tracking-tight mb-3 md:mb-4">
            Ações Rápidas
          </h3>
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
            <Link href="/stock" className="flex-1">
              <Button variant="outline" className="w-full border border-gray-300 text-gray-700 rounded-lg py-2 px-4" size="lg">
                Ver Stock Completo
              </Button>
            </Link>
            <Link href="/definicoes" className="flex-1">
              <Button variant="outline" className="w-full border border-gray-300 text-gray-700 rounded-lg py-2 px-4" size="lg">
                Configurar Alertas
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error loading dashboard:", error);
    return (
      <div className="space-y-8">
        <PageHeader
          title="Visão Geral"
          description="Resumo do estado do stock hoje."
          className="pb-0"
        />
        <Card>
          <CardContent className="py-12 text-center text-destructive">
            <p className="text-lg font-medium mb-2">
              Erro ao carregar dashboard
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

