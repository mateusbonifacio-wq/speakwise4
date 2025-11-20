import { db } from "@/lib/db";
import { getRestaurant } from "@/lib/data-access";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { differenceInCalendarDays } from "date-fns";
import { AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const restaurant = await getRestaurant();

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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Visão Geral"
          description="Resumo do estado do stock hoje."
          className="pb-0"
        />
        <Link href="/entries/new">
          <Button>Nova Entrada</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expirados</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {expiredCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Produtos fora de validade
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgente</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {urgentCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Usar o mais rápido possível
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atenção</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {warningCount}
            </div>
            <p className="text-xs text-muted-foreground">
              A expirar em breve
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock OK</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{okCount}</div>
            <p className="text-xs text-muted-foreground">
              Validade segura
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Atalhos rápidos ou lista resumida podiam vir aqui */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
        <h3 className="font-semibold leading-none tracking-tight mb-4">
          Ações Rápidas
        </h3>
        <div className="flex gap-4">
          <Link href="/stock">
            <Button variant="outline">Ver Stock Completo</Button>
          </Link>
          <Link href="/settings">
            <Button variant="outline">Configurar Alertas</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

