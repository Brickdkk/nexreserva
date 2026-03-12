// Flujo 3: Panel del Profesional — Agenda del día + métricas + acciones en citas
// Fuerza renderizado dinámico (requiere BD en tiempo real; no pre-renderizar).
export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { sendWhatsApp } from "@/lib/evolution-api";
import { formatFechaHora, formatHora, formatPrice } from "@/lib/utils";
import Link from "next/link";

// ─── Server Actions ────────────────────────────────────────────────────────────

async function marcarCitaPagada(formData: FormData) {
  "use server";
  try {
    const citaId = formData.get("cita_id") as string;
    const profesionalId = formData.get("profesional_id") as string;
    if (!citaId) return;

    await prisma.cita.update({
      where: { id: citaId },
      data: { estado: "pagada" },
    });

    revalidatePath(`/profesional/${profesionalId}`);
  } catch (error) {
    console.error("[marcarCitaPagada]", error);
  }
}

async function cancelarCitaBarbero(formData: FormData) {
  "use server";
  try {
    const citaId = formData.get("cita_id") as string;
    const profesionalId = formData.get("profesional_id") as string;
    if (!citaId) return;

    // Obtener datos de la cita antes de cancelar
    const cita = await prisma.cita.findUnique({
      where: { id: citaId },
      include: {
        sucursal: {
          include: { local: { select: { evolution_token: true } } },
        },
      },
    });

    if (!cita || cita.estado !== "activa") return;

    // Cambiar estado a cancelada_barbero
    await prisma.cita.update({
      where: { id: citaId },
      data: { estado: "cancelada_barbero" },
    });

    // Notificar al cliente por WhatsApp (mensaje exacto del PRD)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://nexreserva.cl";
    const mensaje =
      `Hola. Por motivos de fuerza mayor, su hora ha sido cancelada y deberá reagendar. ` +
      `Lamentamos las molestias. Por favor, reserve su nueva hora aquí: ` +
      `${baseUrl}/${cita.sucursal.slug}`;

    await sendWhatsApp(
      cita.sucursal.local.evolution_token,
      cita.cliente_telefono,
      mensaje,
    );

    revalidatePath(`/profesional/${profesionalId}`);
  } catch (error) {
    console.error("[cancelarCitaBarbero]", error);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOf(offsetDays: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOf(offsetDays: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(23, 59, 59, 999);
  return d;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PanelProfesional({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const profesional = await prisma.profesional.findUnique({
    where: { id },
    include: {
      sucursal: {
        select: { nombre: true, slug: true },
      },
    },
  });

  if (!profesional) notFound();

  const hoyInicio = startOf(0);
  const hoyFin = endOf(0);
  const semanaInicio = startOf(-7);
  const mesInicio = startOf(-30);

  const [citasHoy, serviciosSemana, serviciosMes] = await Promise.all([
    prisma.cita.findMany({
      where: {
        profesional_id: id,
        fecha_hora_inicio: { gte: hoyInicio, lte: hoyFin },
        estado: { in: ["activa", "pagada"] },
      },
      include: { servicio: true },
      orderBy: { fecha_hora_inicio: "asc" },
    }),
    prisma.cita.count({
      where: {
        profesional_id: id,
        estado: "pagada",
        fecha_hora_inicio: { gte: semanaInicio },
      },
    }),
    prisma.cita.count({
      where: {
        profesional_id: id,
        estado: "pagada",
        fecha_hora_inicio: { gte: mesInicio },
      },
    }),
  ]);

  const estadoBadge = (estado: string) => {
    switch (estado) {
      case "activa":
        return "bg-cyan-50 text-cyan-700 border border-cyan-200";
      case "pagada":
        return "bg-green-50 text-green-700 border border-green-200";
      default:
        return "bg-gray-100 text-gray-500";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-xl font-bold text-gray-900">
              Nex<span className="text-cyan-500">Reserva</span>
            </span>
            <span className="ml-2 text-sm text-gray-400">
              · {profesional.sucursal.nombre}
            </span>
          </div>
          <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900">
            ← Admin
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Info profesional */}
        <div className="flex items-center gap-4 mb-8">
          {profesional.foto_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profesional.foto_url}
              alt={profesional.nombre}
              className="w-16 h-16 rounded-full object-cover border-2 border-cyan-200"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600 text-2xl font-bold border-2 border-cyan-200">
              {profesional.nombre.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{profesional.nombre}</h1>
            <p className="text-sm text-gray-400">{profesional.sucursal.nombre}</p>
          </div>
        </div>

        {/* Métricas personales */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5 text-center shadow-sm">
            <p className="text-3xl font-extrabold text-gray-900">{citasHoy.length}</p>
            <p className="text-xs text-gray-400 mt-1">Citas hoy</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 text-center shadow-sm">
            <p className="text-3xl font-extrabold text-gray-900">{serviciosSemana}</p>
            <p className="text-xs text-gray-400 mt-1">Servicios esta semana</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 text-center shadow-sm col-span-2 sm:col-span-1">
            <p className="text-3xl font-extrabold text-gray-900">{serviciosMes}</p>
            <p className="text-xs text-gray-400 mt-1">Servicios este mes</p>
          </div>
        </div>

        {/* Agenda del día */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Agenda de hoy —{" "}
            <span className="text-gray-400 font-normal text-base">
              {new Date().toLocaleDateString("es-CL", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </span>
          </h2>

          {citasHoy.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400 shadow-sm">
              Sin citas para hoy 🎉
            </div>
          ) : (
            <div className="space-y-4">
              {citasHoy.map((cita: {
                id: string;
                fecha_hora_inicio: Date;
                fecha_hora_fin: Date;
                estado: string;
                cliente_telefono: string;
                servicio: { nombre: string; precio: number; duracion_minutos: number };
              }) => (
                <div
                  key={cita.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    {/* Info cita */}
                    <div className="flex gap-4">
                      <div className="text-center min-w-[52px]">
                        <p className="text-xl font-bold text-cyan-600">
                          {formatHora(cita.fecha_hora_inicio)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatHora(cita.fecha_hora_fin)}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{cita.servicio.nombre}</p>
                        <p className="text-sm text-gray-500">
                          {cita.servicio.duracion_minutos} min · {formatPrice(cita.servicio.precio)}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Cliente: +{cita.cliente_telefono}
                        </p>
                        <span
                          className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${estadoBadge(cita.estado)}`}
                        >
                          {cita.estado}
                        </span>
                      </div>
                    </div>

                    {/* Acciones (solo si activa) */}
                    {cita.estado === "activa" && (
                      <div className="flex gap-2 flex-wrap">
                        {/* Servicio Pagado */}
                        <form action={marcarCitaPagada}>
                          <input type="hidden" name="cita_id" value={cita.id} />
                          <input type="hidden" name="profesional_id" value={profesional.id} />
                          <button
                            type="submit"
                            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-semibold rounded-lg transition-colors"
                          >
                            Servicio Pagado ✓
                          </button>
                        </form>

                        {/* Cancelar Hora (Imprevisto) */}
                        <form action={cancelarCitaBarbero}>
                          <input type="hidden" name="cita_id" value={cita.id} />
                          <input type="hidden" name="profesional_id" value={profesional.id} />
                          <button
                            type="submit"
                            className="px-4 py-2 bg-white border border-red-300 hover:bg-red-50 text-red-600 text-sm font-semibold rounded-lg transition-colors"
                            onClick={(e) => {
                              if (!confirm("¿Cancelar esta cita? Se notificará al cliente por WhatsApp.")) {
                                e.preventDefault();
                              }
                            }}
                          >
                            Cancelar Hora ✕
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
