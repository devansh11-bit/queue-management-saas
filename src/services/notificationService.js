const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export async function sendWhatsAppNotification({ phoneNumber, placeName, position }) {
  const response = await fetch(`${apiBaseUrl}/api/notify-whatsapp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      phoneNumber,
      placeName,
      position
    })
  });

  if (!response.ok) {
    throw new Error("Could not send WhatsApp notification.");
  }

  return response.json();
}
