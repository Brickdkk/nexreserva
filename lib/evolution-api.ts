/**
 * Cliente HTTP para Evolution API v2.
 * Documentación: https://doc.evolution-api.com/v2
 */

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL ?? "http://localhost:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY ?? "";

interface SendMessagePayload {
  number: string; // número E.164 sin + (ej: "56912345678")
  text: string;
}

interface EvolutionResponse {
  key: { id: string };
  message: { conversation: string };
  status: string;
}

/**
 * Envía un mensaje de texto vía WhatsApp usando Evolution API v2.
 * @param instanceName - nombre de la instancia configurada en Evolution API
 * @param to - teléfono destinatario en formato E.164 sin "+" (ej: "56912345678")
 * @param text - texto del mensaje
 */
export async function sendWhatsApp(
  instanceName: string,
  to: string,
  text: string,
): Promise<EvolutionResponse | null> {
  try {
    const payload: SendMessagePayload = { number: to, text };

    const res = await fetch(
      `${EVOLUTION_API_URL}/message/sendText/${instanceName}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: EVOLUTION_API_KEY,
        },
        body: JSON.stringify(payload),
      },
    );

    if (!res.ok) {
      const error = await res.text();
      console.error("[sendWhatsApp] Error HTTP", res.status, error);
      return null;
    }

    return (await res.json()) as EvolutionResponse;
  } catch (error) {
    console.error("[sendWhatsApp]", error);
    return null;
  }
}

/**
 * Obtiene la lista de instancias configuradas en Evolution API.
 */
export async function getInstances(): Promise<unknown[]> {
  try {
    const res = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
      headers: { apikey: EVOLUTION_API_KEY },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as unknown[];
    return data;
  } catch (error) {
    console.error("[getInstances]", error);
    return [];
  }
}
