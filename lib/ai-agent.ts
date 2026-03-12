/**
 * Agente de IA para NexReserva usando Vercel AI SDK.
 * Modelo: Claude 3.5 Haiku (Anthropic) — fallback a GPT-4o-mini (OpenAI).
 *
 * Responsabilidades:
 *  1. Responder mensajes de WhatsApp preguntando por local y sucursal.
 *  2. Identificar el local+sucursal en la BD y enviar el link de reserva.
 *  3. Manejar flujo de cancelación cuando el cliente escribe "Cancelar".
 */

import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

import { prisma } from "@/lib/prisma";

const SYSTEM_PROMPT = `Eres el asistente de agendamiento de NexReserva, un sistema de reservas para negocios de servicios en Chile (barberías, salones de belleza, clínicas veterinarias).

Tu único objetivo es ayudar al cliente a reservar una hora. Para ello DEBES seguir este proceso:

1. Saluda de forma breve y natural.
2. Pregunta EXPLÍCITAMENTE:
   a) ¿Cuál es el nombre de la barbería/salón/clínica? (nombre del local)
   b) ¿A qué sucursal deseas asistir? (si el local tiene varias)
3. Con esos datos, busca en la base de datos y responde con el enlace directo de reserva.
4. Si el cliente ya entregó ambos datos en su primer mensaje, ve directamente al paso 3.

Reglas:
- Responde SIEMPRE en español chileno, tono amigable pero profesional.
- NO inventes nombres de negocios ni links.
- Si no encuentras el local en la base de datos, indica al cliente que verifique el nombre.
- Sé conciso: máximo 3 oraciones por respuesta.
- NUNCA des información de precios, horarios o disponibilidad — solo el link de reserva.`;

export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Procesa un mensaje de WhatsApp con el agente IA.
 * Retorna la respuesta del bot como string.
 */
export async function processWhatsAppMessage(
  messages: AgentMessage[],
): Promise<string> {
  try {
    const { text } = await generateText({
      model: anthropic("claude-haiku-4-5"),
      system: SYSTEM_PROMPT,
      messages,
    });

    return text;
  } catch (error) {
    console.error("[processWhatsAppMessage]", error);
    return "Lo sentimos, hubo un error al procesar su mensaje. Por favor intente nuevamente.";
  }
}

/**
 * Busca una sucursal en la BD dado el nombre del local y nombre de sucursal.
 * Hace búsqueda case-insensitive parcial.
 */
export async function findSucursalByNombre(
  nombreLocal: string,
  nombreSucursal?: string,
): Promise<{ slug: string; nombre: string } | null> {
  try {
    const local = await prisma.local.findFirst({
      where: {
        nombre: {
          contains: nombreLocal,
          mode: "insensitive",
        },
      },
      include: {
        sucursales: true,
      },
    });

    if (!local) return null;

    if (local.sucursales.length === 1) {
      return {
        slug: local.sucursales[0].slug,
        nombre: local.sucursales[0].nombre,
      };
    }

    if (nombreSucursal) {
      const sucursal = local.sucursales.find((s) =>
        s.nombre.toLowerCase().includes(nombreSucursal.toLowerCase()),
      );
      if (sucursal) return { slug: sucursal.slug, nombre: sucursal.nombre };
    }

    return null;
  } catch (error) {
    console.error("[findSucursalByNombre]", error);
    return null;
  }
}
