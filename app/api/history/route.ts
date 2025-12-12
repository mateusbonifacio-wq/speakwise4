import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getRestaurantByTenantId } from "@/lib/data-access";
import { isValidRestaurantIdentifier } from "@/lib/auth";
import { startOfMonth, endOfMonth } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const restaurantIdCookie = cookieStore.get("clearstock_restaurantId")?.value;

    if (!restaurantIdCookie || !isValidRestaurantIdentifier(restaurantIdCookie)) {
      return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });
    }

    const restaurant = await getRestaurantByTenantId(restaurantIdCookie);
    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get("month");

    // Default to current month if no month specified
    const today = new Date();
    let year = today.getFullYear();
    let month = today.getMonth() + 1;

    if (monthParam) {
      const [yearStr, monthStr] = monthParam.split("-");
      const parsedYear = parseInt(yearStr);
      const parsedMonth = parseInt(monthStr);

      if (!isNaN(parsedYear) && !isNaN(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12) {
        year = parsedYear;
        month = parsedMonth;
      }
    }

    const startDate = startOfMonth(new Date(year, month - 1, 1));
    const endDate = endOfMonth(new Date(year, month - 1, 1));

    console.log(`[API History] Fetching events for restaurant ${restaurant.id}, month ${year}-${month}, range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Fetch events for the date range
    const events = await db.stockEvent.findMany({
      where: {
        restaurantId: restaurant.id,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    console.log(`[API History] Found ${events.length} events`);

    return NextResponse.json({
      ok: true,
      events: events.map((event) => ({
        id: event.id,
        type: event.type,
        productName: event.productName,
        quantity: event.quantity,
        unit: event.unit,
        createdAt: event.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[API History] Error fetching history:", error);
    return NextResponse.json(
      { ok: false, error: "Erro ao carregar histórico" },
      { status: 500 }
    );
  }
}

