/**
 * POST /api/reservas
 *
 * Crea una nueva cita (Cita) en la BD y el evento correspondiente en Google Calendar.
 * Envía confirmación por WhatsApp al cliente.
 *
 * Body JSON:
 *  {
 *    sucursalId:     string,
 *    profesionalId:  string,
 *    servicioId:     string,
 *    clienteTelefono: string,   // E.164 sin "+" (ej: "56912345678")
 *    fechaHoraInicio: string,   // ISO 8601 (ej: "2026-03-15T10:00:00.000Z")
 *  }
 */

import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { createCalendarEvent } from "@/lib/google-calendar";
import { sendWhatsApp } from "@/lib/evolution-api";
import { calcularFechaFin, formatFechaHora } from "@/lib/utils";

const ReservaSchema = z.object({
  sucursalId: z.string().min(1),
  profesionalId: z.string().min(1),
  servicioId: z.string().min(1),
  clienteTelefono: z.string().min(8),
  fechaHoraInicio: z.string().datetime(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validar payload con Zod.
    const parsed = ReservaSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Datos inválidos.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { sucursalId, profesionalId, servicioId, clienteTelefono, fechaHoraInicio } =
      parsed.data;

    // Cargar entidades relacionadas.
    const [sucursal, profesional, servicio] = await Promise.all([
      prisma.sucursal.findUnique({
        where: { id: sucursalId },
        include: { local: { select: { evolution_token: true } } },
      }),
      prisma.profesional.findUnique({ where: { id: profesionalId } }),
      prisma.servicio.findUnique({ where: { id: servicioId } }),
    ]);

    if (!sucursal) {
      return Response.json({ error: "Sucursal no encontrada." }, { status: 404 });
    }
    if (!profesional) {
      return Response.json({ error: "Profesional no encontrado." }, { status: 404 });
    }
    if (!servicio) {
      return Response.json({ error: "Servicio no encontrado." }, { status: 404 });
    }

    // Calcular fecha de fin.
    const inicio = new Date(fechaHoraInicio);
    const fin = calcularFechaFin(inicio, servicio.duracion_minutos);

    // Verificar que no haya solapamiento con otra cita activa del profesional.
    const solapamiento = await prisma.cita.findFirst({
      where: {
        profesional_id: profesionalId,
        estado: { in: ["activa", "pagada"] },
        OR: [
          {
            fecha_hora_inicio: { lt: fin },
            fecha_hora_fin: { gt: inicio },
          },
        ],
      },
    });

    if (solapamiento) {
      return Response.json(
        { error: "El horario seleccionado ya no está disponible. Por favor elige otro." },
        { status: 409 },
      );
    }

    // Crear la cita en BD.
    const cita = await prisma.cita.create({
      data: {
        sucursal_id: sucursalId,
        profesional_id: profesionalId,
        servicio_id: servicioId,
        cliente_telefono: clienteTelefono,
        fecha_hora_inicio: inicio,
        fecha_hora_fin: fin,
        estado: "activa",
      },
    });

    // Crear evento en Google Calendar (best-effort; no falla la reserva si falla Calendar).
    const accessToken = process.env.GOOGLE_ACCESS_TOKEN ?? "";
    if (accessToken) {
      await createCalendarEvent(accessToken, {
        calendarId: profesional.google_calendar_id,
        summary: `${servicio.nombre} — ${clienteTelefono}`,
        description: `Reserva NexReserva | Cita ID: ${cita.id}`,
        inicio,
        fin,
      });
    }

    // Enviar confirmación WhatsApp al cliente.
    const instanceName = sucursal.local.evolution_token;
    const fechaTexto = formatFechaHora(inicio);
    const msgCliente =
      `¡Tu reserva está confirmada! 🎉\n` +
      `📅 ${fechaTexto}\n` +
      `👤 Profesional: ${profesional.nombre}\n` +
      `✂️ Servicio: ${servicio.nombre}\n\n` +
      `Para cancelar, responde con la palabra *Cancelar*.`;

    await sendWhatsApp(instanceName, clienteTelefono, msgCliente);

    return Response.json({ ok: true, citaId: cita.id }, { status: 201 });
  } catch (error) {
    console.error("[api/reservas]", error);
    return Response.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
