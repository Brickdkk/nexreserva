/**
 * Integración con Google Calendar API v3.
 * Requiere OAuth2 configurado con GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI.
 *
 * Cada Profesional tiene un campo `google_calendar_id` que es el ID del calendario
 * al que se le escribirán/leerán los eventos de citas.
 */

const GOOGLE_API_BASE = "https://www.googleapis.com/calendar/v3";

export interface GoogleSlot {
  inicio: Date;
  fin: Date;
}

export interface GoogleEventInput {
  calendarId: string;
  summary: string;
  description: string;
  inicio: Date;
  fin: Date;
  attendeeEmail?: string;
}

/**
 * Obtiene los bloques OCUPADOS de un calendario en un rango de fechas.
 * Usa la API freebusy para consultar disponibilidad real.
 *
 * @param calendarId - google_calendar_id del profesional
 * @param accessToken - OAuth2 access token del profesional
 * @param desde - inicio del rango de búsqueda
 * @param hasta - fin del rango de búsqueda
 * @returns array de slots ocupados { inicio, fin }
 */
export async function getBusySlots(
  calendarId: string,
  accessToken: string,
  desde: Date,
  hasta: Date,
): Promise<GoogleSlot[]> {
  try {
    const body = {
      timeMin: desde.toISOString(),
      timeMax: hasta.toISOString(),
      items: [{ id: calendarId }],
    };

    const res = await fetch(`${GOOGLE_API_BASE}/freeBusy`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error("[getBusySlots] Error HTTP", res.status);
      return [];
    }

    const data = (await res.json()) as {
      calendars: Record<string, { busy: { start: string; end: string }[] }>;
    };

    const busy = data.calendars[calendarId]?.busy ?? [];
    return busy.map((b) => ({
      inicio: new Date(b.start),
      fin: new Date(b.end),
    }));
  } catch (error) {
    console.error("[getBusySlots]", error);
    return [];
  }
}

/**
 * Crea un evento en Google Calendar al confirmar una reserva.
 *
 * @param accessToken - OAuth2 access token del profesional
 * @param input - datos del evento
 * @returns ID del evento creado, o null si falla
 */
export async function createCalendarEvent(
  accessToken: string,
  input: GoogleEventInput,
): Promise<string | null> {
  try {
    const event = {
      summary: input.summary,
      description: input.description,
      start: { dateTime: input.inicio.toISOString(), timeZone: "America/Santiago" },
      end: { dateTime: input.fin.toISOString(), timeZone: "America/Santiago" },
      ...(input.attendeeEmail
        ? { attendees: [{ email: input.attendeeEmail }] }
        : {}),
    };

    const res = await fetch(
      `${GOOGLE_API_BASE}/calendars/${encodeURIComponent(input.calendarId)}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      },
    );

    if (!res.ok) {
      console.error("[createCalendarEvent] Error HTTP", res.status);
      return null;
    }

    const data = (await res.json()) as { id: string };
    return data.id;
  } catch (error) {
    console.error("[createCalendarEvent]", error);
    return null;
  }
}

/**
 * Elimina un evento de Google Calendar al cancelar una cita.
 *
 * @param accessToken - OAuth2 access token del profesional
 * @param calendarId - google_calendar_id del profesional
 * @param eventId - ID del evento a eliminar
 */
export async function deleteCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
): Promise<boolean> {
  try {
    const res = await fetch(
      `${GOOGLE_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (res.status === 204 || res.ok) return true;
    console.error("[deleteCalendarEvent] Error HTTP", res.status);
    return false;
  } catch (error) {
    console.error("[deleteCalendarEvent]", error);
    return false;
  }
}

/**
 * Genera slots de tiempo disponibles dado un rango y duración del servicio,
 * filtrando los que solapan con los bloques ocupados.
 *
 * @param desde - hora de inicio de la jornada laboral
 * @param hasta - hora de fin de la jornada laboral
 * @param duracionMinutos - duración del servicio
 * @param ocupados - slots ocupados obtenidos de Google Calendar
 * @returns array de slots libres
 */
export function getAvailableSlots(
  desde: Date,
  hasta: Date,
  duracionMinutos: number,
  ocupados: GoogleSlot[],
): GoogleSlot[] {
  const slots: GoogleSlot[] = [];
  const step = duracionMinutos * 60 * 1000;
  let current = desde.getTime();

  while (current + step <= hasta.getTime()) {
    const slotInicio = new Date(current);
    const slotFin = new Date(current + step);

    const solapado = ocupados.some(
      (o) => slotInicio < o.fin && slotFin > o.inicio,
    );

    if (!solapado) {
      slots.push({ inicio: slotInicio, fin: slotFin });
    }

    current += step;
  }

  return slots;
}
