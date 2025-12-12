import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getRestaurantByTenantId } from "@/lib/data-access";
import { isValidRestaurantIdentifier } from "@/lib/auth";
import { sendSupportEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

type SupportType = "bug" | "suggestion" | "question" | "other";

interface SupportRequest {
  type: SupportType;
  message: string;
  contact: string;
  restaurantId: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const cookieStore = await cookies();
    const restaurantIdCookie = cookieStore.get("clearstock_restaurantId")?.value;

    if (!restaurantIdCookie || !isValidRestaurantIdentifier(restaurantIdCookie)) {
      return NextResponse.json(
        { ok: false, error: "Não autenticado" },
        { status: 401 }
      );
    }

    // Parse request body
    const body: SupportRequest = await request.json();
    const { type, message, contact, restaurantId } = body;

    // Validate fields
    if (!type || !["bug", "suggestion", "question", "other"].includes(type)) {
      return NextResponse.json(
        { ok: false, error: "Tipo de mensagem inválido" },
        { status: 400 }
      );
    }

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { ok: false, error: "Mensagem é obrigatória" },
        { status: 400 }
      );
    }

    if (!contact || contact.trim().length === 0) {
      return NextResponse.json(
        { ok: false, error: "Contacto é obrigatório" },
        { status: 400 }
      );
    }

    // Verify restaurant exists and matches authenticated user
    const restaurant = await getRestaurantByTenantId(restaurantIdCookie);
    
    if (restaurant.id !== restaurantId) {
      return NextResponse.json(
        { ok: false, error: "Restaurante não corresponde à autenticação" },
        { status: 403 }
      );
    }

    // Save support message to database
    const supportMessage = await db.supportMessage.create({
      data: {
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        type: type as SupportType,
        message: message.trim(),
        contact: contact.trim(),
      },
    });

    // Send email to admin
    let emailSent = false;
    try {
      console.log("[API] Attempting to send support email...");
      await sendSupportEmail({
        restaurantName: restaurant.name,
        restaurantPin: restaurant.pin,
        type,
        message: message.trim(),
        contact: contact.trim(),
      });
      emailSent = true;
      console.log("[API] ✅ Support email sent successfully");
    } catch (emailError: any) {
      // Log email error but don't fail the request
      console.error("[API] ❌ Error sending support email:");
      console.error("[API] Error type:", emailError?.constructor?.name);
      console.error("[API] Error message:", emailError?.message);
      console.error("[API] Full error:", JSON.stringify(emailError, null, 2));
      // Continue - message is saved in DB even if email fails
    }

    return NextResponse.json({ ok: true, id: supportMessage.id });
  } catch (error) {
    console.error("Error processing support request:", error);
    return NextResponse.json(
      { ok: false, error: "Erro ao processar pedido de suporte" },
      { status: 500 }
    );
  }
}

