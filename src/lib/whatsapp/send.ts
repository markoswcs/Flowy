/**
 * Replies through the WhatsApp Cloud API. Answers go out within 24 hours of
 * the person's own message, which WhatsApp does not charge for.
 */
export async function sendWhatsAppText(to: string, body: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) throw new Error("WhatsApp não configurado.");
  const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body, preview_url: false },
    }),
  });
  if (!response.ok) throw new Error(`WhatsApp respondeu ${response.status}: ${await response.text()}`);
}
