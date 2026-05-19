interface WhatsAppSendOptions {
  to: string;
  message: string;
}

function isConfigured() {
  return Boolean(process.env["WHATSAPP_ACCESS_TOKEN"] && process.env["WHATSAPP_PHONE_NUMBER_ID"]);
}

export function isWhatsAppConfigured() {
  return isConfigured();
}

function normalizePhone(value: string) {
  return String(value || "").replace(/[^0-9]/g, "");
}

export async function sendWhatsAppMessage(options: WhatsAppSendOptions) {
  if (!isConfigured()) {
    return { success: false, error: "WhatsApp is not configured" };
  }

  const token = process.env["WHATSAPP_ACCESS_TOKEN"] as string;
  const phoneNumberId = process.env["WHATSAPP_PHONE_NUMBER_ID"] as string;
  const to = normalizePhone(options.to);

  if (!to || !options.message?.trim()) {
    return { success: false, error: "Missing recipient or message" };
  }

  const url = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: options.message },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    return { success: false, error: text };
  }

  return { success: true };
}
