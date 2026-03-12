/**
 * GET /api/disponibilidad
 *
 * Retorna los slots de tiempo disponibles para un profesional + servicio en una fecha dada.
 * Google Calendar es la fuente de verdad (se consultan los bloques ocupados en tiempo real).
 *
 * Query params:
 *  - profesionalId: string (CUID del profesional)
 *  - servicioId:    string (CUID del servicio)
 *  - fecha:         string (ISO date, ej: "2026-03-15")
 */

import { prisma } from "@/lib/prisma";
import { getBusySlots, getAvailableSlots } from "@/lib/google-calendar";

// Jornada laboral por defecto: 09:00 – 19:00 hora de Santiago.
const JORNADA_INICIO_HORA = 9;
const JORNADA_FIN_HORA = 19;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const profesionalId = searchParams.get("profesionalId");
    const servicioId = searchParams.get("servicioId");
    const fecha = searchParams.get("fecha"); // ej: "2026-03-15"

    if (!profesionalId || !servicioId || !fecha) {
      return Response.json(
        { error: "Faltan parámetros: profesionalId, servicioId, fecha." },
        { status: 400 },
      );
    }

    // Validar formato de fecha.
    const fechaDate = new Date(fecha);
    if (isNaN(fechaDate.getTime())) {
      return Response.json({ error: "Formato de fecha inválido." }, { status: 400 });
    }

    // Obtener profesional y servicio desde BD.
    const [profesional, servicio] = await Promise.all([
      prisma.profesional.findUnique({ where: { id: profesionalId } }),
      prisma.servicio.findUnique({ where: { id: servicioId } }),
    ]);

    if (!profesional) {
      return Response.json({ error: "Profesional no encontrado." }, { status: 404 });
    }
    if (!servicio) {
      return Response.json({ error: "Servicio no encontrado." }, { status: 404 });
    }

    // Construir rango de la jornada laboral en zona horaria de Santiago.
    // Usamos UTC offset de Santiago (-3 o -4 según horario de verano).
    // Para simplicidad usamos la fecha local asumiendo UTC-3 (verano Chile).
    const dateStr = fecha; // "YYYY-MM-DD"
    const desde = new Date(`${dateStr}T${String(JORNADA_INICIO_HORA).padStart(2, "0")}:00:00-03:00`);
    const hasta = new Date(`${dateStr}T${String(JORNADA_FIN_HORA).padStart(2, "0")}:00:00-03:00`);

    // No mostrar slots pasados.
    const ahora = new Date();
    const desdeEfectivo = desde < ahora ? ahora : desde;

    if (desdeEfectivo >= hasta) {
      return Response.json({ slots: [] });
    }

    // Google Calendar: obtener bloques ocupados.
    // NOTA: En producción se usaría un access token OAuth persistido por profesional.
    // Por ahora, si no hay token configurado, retornamos todos los slots libres.
    const accessToken = process.env.GOOGLE_ACCESS_TOKEN ?? "";
    let ocupados: { inicio: Date; fin: Date }[] = [];

    if (accessToken) {
      ocupados = await getBusySlots(
        profesional.google_calendar_id,
        accessToken,
        desdeEfectivo,
        hasta,
      );
    }

    const slots = getAvailableSlots(desdeEfectivo, hasta, servicio.duracion_minutos, ocupados);

    return Response.json({
      slots: slots.map((s) => ({
        inicio: s.inicio.toISOString(),
        fin: s.fin.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[api/disponibilidad]", error);
    return Response.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
