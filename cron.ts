/**
 * cron.ts — Recordatorios automáticos de citas por WhatsApp.
 *
 * Ejecutar con: npx ts-node cron.ts  (o ts-node-esm según configuración)
 * En producción: process manager (PM2) lo levanta junto al servidor Next.js.
 *
 * Regla de negocio (PRD Sección 6, ítem 5):
 *  - Corre cada hora.
 *  - Filtra citas con:
 *      estado == activa
 *      AND recordatorio_enviado == false
 *      AND fecha_hora_inicio BETWEEN NOW() AND NOW()+25h
 *  - Envía recordatorio WhatsApp al cliente.
 *  - Marca recordatorio_enviado = true en BD.
 */

import "dotenv/config";
import cron from "node-cron";

import { prisma } from "@/lib/prisma";
import { sendWhatsApp } from "@/lib/evolution-api";
import { formatFechaHora } from "@/lib/utils";

const VENTANA_HORAS = 25; // buscar citas en las próximas 25 horas

/**
 * Envía recordatorios a todos los clientes con citas activas en la ventana de tiempo.
 */
async function enviarRecordatorios(): Promise<void> {
  const ahora = new Date();
  const limite = new Date(ahora.getTime() + VENTANA_HORAS * 60 * 60 * 1000);

  console.log(
    `[cron] ${ahora.toISOString()} — Buscando citas entre ${ahora.toISOString()} y ${limite.toISOString()}`,
  );

  try {
    const citas = await prisma.cita.findMany({
      where: {
        estado: "activa",
        recordatorio_enviado: false,
        fecha_hora_inicio: {
          gte: ahora,
          lte: limite,
        },
      },
      include: {
        profesional: { select: { nombre: true } },
        servicio: { select: { nombre: true } },
        sucursal: {
          select: {
            slug: true,
            local: { select: { evolution_token: true } },
          },
        },
      },
    });

    console.log(`[cron] Encontradas ${citas.length} cita(s) para recordatorio.`);

    for (const cita of citas) {
      const instanceName = cita.sucursal.local.evolution_token;
      const fechaTexto = formatFechaHora(cita.fecha_hora_inicio);
      const slug = cita.sucursal.slug;
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://nexreserva.cl";

      const mensaje =
        `⏰ Recordatorio NexReserva\n\n` +
        `Tienes una cita mañana:\n` +
        `📅 ${fechaTexto}\n` +
        `👤 Profesional: ${cita.profesional.nombre}\n` +
        `✂️ Servicio: ${cita.servicio.nombre}\n\n` +
        `Si necesitas cancelar, responde con la palabra *Cancelar*.\n` +
        `Para reagendar visita: ${baseUrl}/${slug}`;

      const result = await sendWhatsApp(instanceName, cita.cliente_telefono, mensaje);

      if (result) {
        await prisma.cita.update({
          where: { id: cita.id },
          data: { recordatorio_enviado: true },
        });
        console.log(`[cron] Recordatorio enviado y marcado — citaId: ${cita.id}`);
      } else {
        console.error(`[cron] Fallo al enviar recordatorio — citaId: ${cita.id}`);
      }
    }
  } catch (error) {
    console.error("[cron] Error en enviarRecordatorios:", error);
  }
}

// ── Iniciar cron ──────────────────────────────────────────────────────────────
// Expresión: "0 * * * *" → ejecutar al inicio de cada hora.
cron.schedule("0 * * * *", () => {
  void enviarRecordatorios();
});

console.log("[cron] Iniciado. Recordatorios se enviarán cada hora.");

// Ejecutar inmediatamente al arrancar (útil al reiniciar el proceso).
void enviarRecordatorios();
