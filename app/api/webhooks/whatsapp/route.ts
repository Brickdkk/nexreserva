/**
 * Flujo 5 — Webhook de Evolution API v2 para WhatsApp.
 *
 * Responsabilidades:
 *  1. Recibir mensajes entrantes de clientes vía WhatsApp.
 *  2. Si el mensaje es "Cancelar" (case-insensitive): cancelar la cita activa más próxima
 *     del cliente, liberar el evento de Google Calendar, y notificar al profesional.
 *  3. Para cualquier otro mensaje: procesar con el agente IA y responder.
 */

import { prisma } from "@/lib/prisma";
import { sendWhatsApp } from "@/lib/evolution-api";
import { processWhatsAppMessage, findSucursalByNombre } from "@/lib/ai-agent";
import { deleteCalendarEvent } from "@/lib/google-calendar";
import { formatHora } from "@/lib/utils";

import type { AgentMessage } from "@/lib/ai-agent";

// Texto exacto según PRD Sección 6 (Mega-Prompt), regla de negocio 6.
const MSG_CANCELACION_BARBERO = (slug: string) =>
  `Hola. Por motivos de fuerza mayor, su hora ha sido cancelada y deberá reagendar. Lamentamos las molestias. Por favor, reserve su nueva hora aquí: ${process.env.NEXT_PUBLIC_BASE_URL}/${slug}`;

// Texto exacto según PRD Sección 6 (Mega-Prompt), regla de negocio 7.
const MSG_LIBERO_BLOQUE = (nombre: string, hora: string) =>
  `🚨 Hola ${nombre}, se acaba de liberar tu bloque de las ${hora}. Un cliente canceló.`;

interface EvolutionWebhookBody {
  event: string;
  instance: string;
  data: {
    key: { remoteJid: string; fromMe: boolean; id: string };
    message?: { conversation?: string; extendedTextMessage?: { text?: string } };
    messageType?: string;
  };
}

/**
 * Extrae el número de teléfono limpio desde un remoteJid de Evolution API.
 * Ejemplo: "56912345678@s.whatsapp.net" → "56912345678"
 */
function extractPhone(remoteJid: string): string {
  return remoteJid.replace(/@.*$/, "");
}

/**
 * Extrae el texto del mensaje de un payload de Evolution API v2.
 */
function extractText(body: EvolutionWebhookBody): string {
  const msg = body.data?.message;
  if (!msg) return "";
  return (
    msg.conversation ??
    msg.extendedTextMessage?.text ??
    ""
  ).trim();
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as EvolutionWebhookBody;

    // Solo procesar eventos de mensajes recibidos (no propios).
    if (body.event !== "messages.upsert") {
      return Response.json({ ok: true });
    }

    if (body.data?.key?.fromMe) {
      return Response.json({ ok: true });
    }

    const instanceName = body.instance;
    const remoteJid = body.data?.key?.remoteJid ?? "";
    const clientePhone = extractPhone(remoteJid);
    const text = extractText(body);

    if (!text || !clientePhone) {
      return Response.json({ ok: true });
    }

    // ──────────────────────────────────────────────────────────────────────
    // CASO 1: El cliente escribe "Cancelar"
    // ──────────────────────────────────────────────────────────────────────
    if (text.toLowerCase() === "cancelar") {
      // Buscar la cita activa más próxima del cliente.
      const cita = await prisma.cita.findFirst({
        where: {
          cliente_telefono: clientePhone,
          estado: "activa",
          fecha_hora_inicio: { gte: new Date() },
        },
        orderBy: { fecha_hora_inicio: "asc" },
        include: {
          profesional: true,
          sucursal: true,
        },
      });

      if (!cita) {
        await sendWhatsApp(
          instanceName,
          clientePhone,
          "No encontramos una cita activa asociada a tu número. Si necesitas ayuda, escríbenos.",
        );
        return Response.json({ ok: true });
      }

      // Cancelar la cita en BD.
      await prisma.cita.update({
        where: { id: cita.id },
        data: { estado: "cancelada_cliente" },
      });

      // Liberar Google Calendar (el eventId no está en el schema actual —
      // se intenta borrar el evento más cercano con nombre de la cita si existiera).
      // En producción real se almacenaría el google_event_id en la Cita.
      // Por ahora: no-op sin token (requiere OAuth del profesional).

      // Notificar al profesional (texto exacto del PRD).
      const hora = formatHora(cita.fecha_hora_inicio);
      await sendWhatsApp(
        instanceName,
        cita.profesional.telefono,
        MSG_LIBERO_BLOQUE(cita.profesional.nombre, hora),
      );

      // Confirmar cancelación al cliente.
      await sendWhatsApp(
        instanceName,
        clientePhone,
        `Tu cita ha sido cancelada exitosamente. Si deseas reagendar, puedes hacerlo en: ${process.env.NEXT_PUBLIC_BASE_URL}/${cita.sucursal.slug}`,
      );

      return Response.json({ ok: true });
    }

    // ──────────────────────────────────────────────────────────────────────
    // CASO 2: Cualquier otro mensaje → agente IA
    // ──────────────────────────────────────────────────────────────────────
    const messages: AgentMessage[] = [{ role: "user", content: text }];
    const aiResponse = await processWhatsAppMessage(messages);

    // Si la respuesta del agente menciona un local/sucursal identificado,
    // intentar adjuntar el link de reserva directamente.
    // (La lógica avanzada de multi-turno requiere sesiones persistentes;
    //  aquí implementamos el flujo single-turn + resolución directa si el
    //  usuario mencionó el nombre en su primer mensaje.)
    const linkMatch = await tryResolveBookingLink(text);
    const finalResponse = linkMatch
      ? `${aiResponse}\n\nLink de reserva: ${process.env.NEXT_PUBLIC_BASE_URL}/${linkMatch}`
      : aiResponse;

    await sendWhatsApp(instanceName, clientePhone, finalResponse);

    return Response.json({ ok: true });
  } catch (error) {
    console.error("[webhook/whatsapp]", error);
    return Response.json({ ok: false }, { status: 500 });
  }
}

/**
 * Intenta resolver el slug de reserva si el usuario mencionó
 * directamente el nombre del local (o local + sucursal) en su mensaje.
 * Retorna el slug o null si no se puede determinar.
 */
async function tryResolveBookingLink(text: string): Promise<string | null> {
  try {
    // Buscar todos los locales y ver si alguno aparece mencionado en el texto.
    const locales = await prisma.local.findMany({
      include: { sucursales: { select: { slug: true, nombre: true } } },
    });

    for (const local of locales) {
      if (text.toLowerCase().includes(local.nombre.toLowerCase())) {
        if (local.sucursales.length === 1) {
          return local.sucursales[0].slug;
        }
        // Si hay varias sucursales, buscar mención de alguna.
        for (const suc of local.sucursales) {
          if (text.toLowerCase().includes(suc.nombre.toLowerCase())) {
            return suc.slug;
          }
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}
