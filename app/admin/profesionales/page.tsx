// Flujo 2 — CRUD de Profesionales (valida límite 10 por sucursal)
// Fuerza renderizado dinámico (requiere BD en tiempo real; no pre-renderizar).
export const dynamic = "force-dynamic";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const MAX_PROFESIONALES_POR_SUCURSAL = 10;

// ─── Server Actions ────────────────────────────────────────────────────────────

async function crearProfesional(formData: FormData) {
  "use server";
  try {
    const sucursal_id = formData.get("sucursal_id") as string;
    const nombre = formData.get("nombre") as string;
    const foto_url = formData.get("foto_url") as string;
    const telefono = formData.get("telefono") as string;
    const google_calendar_id = formData.get("google_calendar_id") as string;

    if (!sucursal_id || !nombre?.trim() || !telefono?.trim()) return;

    // Validar límite estricto de 10 profesionales por sucursal
    const count = await prisma.profesional.count({
      where: { sucursal_id },
    });

    if (count >= MAX_PROFESIONALES_POR_SUCURSAL) {
      // El error se manejará con un redirect con mensaje de error
      // En producción usar searchParams o un toast
      console.error("[crearProfesional] Límite de profesionales alcanzado");
      return;
    }

    await prisma.profesional.create({
      data: {
        nombre: nombre.trim(),
        foto_url: foto_url?.trim() ?? "",
        telefono: telefono.trim(),
        google_calendar_id: google_calendar_id?.trim() ?? "",
        sucursal_id,
      },
    });

    revalidatePath("/admin/profesionales");
  } catch (error) {
    console.error("[crearProfesional]", error);
  }
}

async function eliminarProfesional(formData: FormData) {
  "use server";
  try {
    const id = formData.get("id") as string;
    if (!id) return;
    await prisma.profesional.delete({ where: { id } });
    revalidatePath("/admin/profesionales");
  } catch (error) {
    console.error("[eliminarProfesional]", error);
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ProfesionalesPage() {
  const [sucursales, profesionales] = await Promise.all([
    prisma.sucursal.findMany({
      orderBy: { nombre: "asc" },
      include: {
        local: { select: { nombre: true } },
        _count: { select: { profesionales: true } },
      },
    }),
    prisma.profesional.findMany({
      orderBy: { nombre: "asc" },
      include: {
        sucursal: {
          select: { nombre: true, slug: true },
        },
      },
    }),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/admin" className="text-xl font-bold text-gray-900">
            Nex<span className="text-cyan-500">Reserva</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-gray-600">
            <Link href="/admin/sucursales" className="hover:text-cyan-600">Sucursales</Link>
            <Link href="/admin/profesionales" className="text-cyan-600">Profesionales</Link>
            <Link href="/admin/servicios" className="hover:text-cyan-600">Servicios</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Formulario agregar profesional */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Agregar Profesional</h2>
          <p className="text-xs text-gray-400 mb-5">
            Máximo {MAX_PROFESIONALES_POR_SUCURSAL} profesionales por sucursal.
          </p>
          {sucursales.length === 0 ? (
            <p className="text-sm text-gray-400">
              Primero crea al menos una sucursal.{" "}
              <Link href="/admin/sucursales" className="text-cyan-600 underline">Ir a Sucursales</Link>
            </p>
          ) : (
            <form action={crearProfesional} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Sucursal *</label>
                <select
                  name="sucursal_id"
                  required
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                >
                  <option value="">Seleccionar sucursal…</option>
                  {sucursales.map((s: { id: string; nombre: string; local: { nombre: string }; _count: { profesionales: number } }) => (
                    <option
                      key={s.id}
                      value={s.id}
                      disabled={s._count.profesionales >= MAX_PROFESIONALES_POR_SUCURSAL}
                    >
                      {s.local.nombre} — {s.nombre}
                      {s._count.profesionales >= MAX_PROFESIONALES_POR_SUCURSAL ? " (lleno)" : ` (${s._count.profesionales}/${MAX_PROFESIONALES_POR_SUCURSAL})`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Nombre *</label>
                <input
                  name="nombre"
                  required
                  placeholder="Ej: Carlos Gómez"
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Teléfono WhatsApp *</label>
                <input
                  name="telefono"
                  required
                  placeholder="56912345678 (sin +)"
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">URL Foto de Perfil</label>
                <input
                  name="foto_url"
                  type="url"
                  placeholder="https://…/foto.jpg"
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">ID Google Calendar</label>
                <input
                  name="google_calendar_id"
                  placeholder="carlos@gmail.com o ID del calendario"
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" className="w-full">Agregar Profesional</Button>
              </div>
            </form>
          )}
        </section>

        {/* Listado de profesionales */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Equipo Registrado</h2>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Profesional</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Sucursal</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Teléfono</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Calendar ID</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {profesionales.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                      No hay profesionales registrados.
                    </td>
                  </tr>
                ) : (
                  profesionales.map((p: { id: string; nombre: string; foto_url: string; telefono: string; google_calendar_id: string; sucursal: { nombre: string; slug: string } }) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {p.foto_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.foto_url}
                              alt={p.nombre}
                              className="w-8 h-8 rounded-full object-cover bg-gray-200"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600 text-xs font-bold">
                              {p.nombre.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{p.nombre}</p>
                            <Link
                              href={`/profesional/${p.id}`}
                              className="text-xs text-cyan-600 hover:underline"
                            >
                              Ver panel →
                            </Link>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{p.sucursal.nombre}</td>
                      <td className="px-6 py-4 text-gray-700 font-mono text-xs">+{p.telefono}</td>
                      <td className="px-6 py-4 text-gray-400 text-xs font-mono truncate max-w-[160px]">
                        {p.google_calendar_id || "—"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <form action={eliminarProfesional}>
                          <input type="hidden" name="id" value={p.id} />
                          <button
                            type="submit"
                            className="text-xs text-red-500 hover:text-red-700 font-medium"
                          >
                            Eliminar
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
