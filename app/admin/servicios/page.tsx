// Flujo 2 — CRUD de Servicios (nombre, duración en minutos, precio CLP)
// Fuerza renderizado dinámico (requiere BD en tiempo real; no pre-renderizar).
export const dynamic = "force-dynamic";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// ─── Server Actions ────────────────────────────────────────────────────────────

async function crearServicio(formData: FormData) {
  "use server";
  try {
    const nombre = formData.get("nombre") as string;
    const sucursal_id = formData.get("sucursal_id") as string;
    const duracion_minutos = parseInt(formData.get("duracion_minutos") as string, 10);
    const precio = parseInt(formData.get("precio") as string, 10);

    if (!nombre?.trim() || !sucursal_id || isNaN(duracion_minutos) || isNaN(precio)) return;

    await prisma.servicio.create({
      data: {
        nombre: nombre.trim(),
        sucursal_id,
        duracion_minutos,
        precio,
      },
    });

    revalidatePath("/admin/servicios");
  } catch (error) {
    console.error("[crearServicio]", error);
  }
}

async function eliminarServicio(formData: FormData) {
  "use server";
  try {
    const id = formData.get("id") as string;
    if (!id) return;
    await prisma.servicio.delete({ where: { id } });
    revalidatePath("/admin/servicios");
  } catch (error) {
    console.error("[eliminarServicio]", error);
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ServiciosPage() {
  const [sucursales, servicios] = await Promise.all([
    prisma.sucursal.findMany({
      orderBy: { nombre: "asc" },
      include: { local: { select: { nombre: true } } },
    }),
    prisma.servicio.findMany({
      orderBy: { nombre: "asc" },
      include: {
        sucursal: { select: { nombre: true } },
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
            <Link href="/admin/profesionales" className="hover:text-cyan-600">Profesionales</Link>
            <Link href="/admin/servicios" className="text-cyan-600">Servicios</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Formulario agregar servicio */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Agregar Servicio</h2>
          {sucursales.length === 0 ? (
            <p className="text-sm text-gray-400">
              Primero crea una sucursal.{" "}
              <Link href="/admin/sucursales" className="text-cyan-600 underline">Ir a Sucursales</Link>
            </p>
          ) : (
            <form action={crearServicio} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Sucursal *</label>
                <select
                  name="sucursal_id"
                  required
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                >
                  <option value="">Seleccionar…</option>
                  {sucursales.map((s: { id: string; nombre: string; local: { nombre: string } }) => (
                    <option key={s.id} value={s.id}>
                      {s.local.nombre} — {s.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Nombre del Servicio *</label>
                <input
                  name="nombre"
                  required
                  placeholder="Ej: Corte clásico"
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Duración (minutos) *</label>
                <input
                  name="duracion_minutos"
                  type="number"
                  required
                  min={5}
                  step={5}
                  defaultValue={30}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Precio CLP *</label>
                <input
                  name="precio"
                  type="number"
                  required
                  min={0}
                  step={100}
                  placeholder="Ej: 12000"
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>
              <div className="flex items-end sm:col-span-2 lg:col-span-4">
                <Button type="submit">Agregar Servicio</Button>
              </div>
            </form>
          )}
        </section>

        {/* Listado de servicios */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Servicios Registrados</h2>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Sucursal</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Duración</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Precio</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {servicios.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                      No hay servicios registrados.
                    </td>
                  </tr>
                ) : (
                  servicios.map((s: { id: string; nombre: string; duracion_minutos: number; precio: number; sucursal: { nombre: string } }) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{s.nombre}</td>
                      <td className="px-6 py-4 text-gray-500">{s.sucursal.nombre}</td>
                      <td className="px-6 py-4 text-right text-gray-700">{s.duracion_minutos} min</td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900">{formatPrice(s.precio)}</td>
                      <td className="px-6 py-4 text-right">
                        <form action={eliminarServicio}>
                          <input type="hidden" name="id" value={s.id} />
                          <button type="submit" className="text-xs text-red-500 hover:text-red-700 font-medium">
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
