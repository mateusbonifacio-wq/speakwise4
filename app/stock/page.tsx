import { db } from "@/lib/db";
import { getRestaurant } from "@/lib/data-access";
import { PageHeader } from "@/components/page-header";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, differenceInCalendarDays } from "date-fns";

export const dynamic = "force-dynamic";

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

  const today = new Date();

  function getStatus(batch: (typeof batches)[number]) {
    const daysToExpiry = differenceInCalendarDays(
      new Date(batch.expiryDate),
      today
    );

    const urgentDays =
      batch.category?.alertDaysBeforeExpiry ??
      restaurant.alertDaysBeforeExpiry;

    const warningDays =
      batch.category?.warningDaysBeforeExpiry ?? urgentDays;

    if (daysToExpiry < 0) {
      return { label: "Expirado", variant: "destructive" as const };
    }

    if (daysToExpiry <= urgentDays) {
      return {
        label: `Urgente usar (${daysToExpiry} dias)`,
        variant: "destructive" as const,
      };
    }

    if (daysToExpiry <= warningDays) {
      return {
        label: `A expirar em breve (${daysToExpiry} dias)`,
        variant: "default" as const,
      };
    }

    return { label: "OK", variant: "secondary" as const };
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock"
        description="Lista de produtos em stock e respetivas validades."
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Produto</TableHead>
            <TableHead>Quantidade</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Localização</TableHead>
            <TableHead>Validade</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {batches.map((batch) => (
            <TableRow key={batch.id}>
              <TableCell>{batch.name}</TableCell>
              <TableCell>
                {batch.quantity} {batch.unit}
              </TableCell>
              <TableCell>{batch.category?.name ?? "-"}</TableCell>
              <TableCell>{batch.location?.name ?? "-"}</TableCell>
              <TableCell>
                {format(new Date(batch.expiryDate), "dd/MM/yyyy")}
              </TableCell>
              <TableCell>
                {(() => {
                  const status = getStatus(batch);
                  return (
                    <Badge variant={status.variant}>
                      {status.label}
                    </Badge>
                  );
                })()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        {batches.length === 0 && (
          <TableCaption>
            Ainda não existem produtos em stock. Adicione uma entrada em
            &quot;Nova Entrada&quot;.
          </TableCaption>
        )}
      </Table>
    </div>
  );
}


