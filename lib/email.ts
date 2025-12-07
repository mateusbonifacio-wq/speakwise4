import { Resend } from "resend";

const ADMIN_EMAIL = process.env.SUPPORT_ADMIN_EMAIL || "clear.stock.pt@gmail.com";
// Resend requires a verified domain. Use onboarding@resend.dev for testing or configure your own domain
const EMAIL_FROM = process.env.EMAIL_FROM || "onboarding@resend.dev";

// Lazy initialization to avoid build-time errors
function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new Resend(apiKey);
}

interface SupportEmailData {
  restaurantName: string | null;
  restaurantPin: string;
  type: "bug" | "suggestion" | "question" | "other";
  message: string;
  contact: string;
}

const TYPE_LABELS: Record<SupportEmailData["type"], string> = {
  bug: "Problema / bug",
  suggestion: "Sugestão",
  question: "Dúvida",
  other: "Outro",
};

export async function sendSupportEmail(data: SupportEmailData) {
  const resend = getResend();
  
  // If Resend API key is not configured, log and skip
  if (!resend) {
    console.warn("RESEND_API_KEY not configured, skipping email send");
    console.log("Support message would be sent:", data);
    return;
  }

  const restaurantDisplay = data.restaurantName || `PIN ${data.restaurantPin}`;
  const subject = `Novo pedido de suporte - ${restaurantDisplay}`;

  const emailBody = `
Novo pedido de suporte da Clearstock:

Restaurante: ${restaurantDisplay}
PIN: ${data.restaurantPin}
Tipo: ${TYPE_LABELS[data.type]}
Contacto: ${data.contact}

Mensagem:

${data.message}
`.trim();

  console.log(`[EMAIL] Attempting to send support email:`);
  console.log(`[EMAIL] From: ${EMAIL_FROM}`);
  console.log(`[EMAIL] To: ${ADMIN_EMAIL}`);
  console.log(`[EMAIL] Subject: ${subject}`);

  try {
    const result = await resend.emails.send({
      from: EMAIL_FROM,
      to: ADMIN_EMAIL,
      subject,
      text: emailBody,
    });

    console.log(`[EMAIL] ✅ Support email sent successfully to ${ADMIN_EMAIL}`);
    console.log(`[EMAIL] Resend response:`, JSON.stringify(result, null, 2));
    
    return result;
  } catch (error: any) {
    console.error("[EMAIL] ❌ Error sending support email:");
    console.error("[EMAIL] Error details:", error);
    
    if (error?.message) {
      console.error("[EMAIL] Error message:", error.message);
    }
    
    if (error?.response) {
      console.error("[EMAIL] Error response:", JSON.stringify(error.response, null, 2));
    }
    
    // Re-throw to allow caller to handle
    throw error;
  }
}
