// Flujo 2 — CRUD de Sucursales con generación automática de slug
// Fuerza renderizado dinámico (requiere BD en tiempo real; no pre-renderizar).
export const dynamic = "force-dynamic";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// ─── Server Actions ────────────────────────────────────────────────────────────

async function crearSucursal(formData: FormData) {
  "use server";
  try {
    const nombre = formData.get("nombre") as string;
    const localId = formData.get("local_id") as string;

    if (!nombre?.trim() || !localId?.trim()) return;

    const slug = slugify(nombre);

    await prisma.sucursal.create({
      data: {
        nombre: nombre.trim(),
        slug,
        local_id: localId,
        limite_profesionales: 10,
      },
    });

    revalidatePath("/admin/sucursales");
  } catch (error) {
    console.error("[crearSucursal]", error);
  }
}

async function eliminarSucursal(formData: FormData) {
  "use server";
  try {
    const id = formData.get("id") as string;
    if (!id) return;

    await prisma.sucursal.delete({ where: { id } });
    revalidatePath("/admin/sucursales");
  } catch (error) {
    console.error("[eliminarSucursal]", error);
  }
}

async function crearLocal(formData: FormData) {
  "use server";
  try {
    const nombre = formData.get("nombre") as string;
    const evolution_token = formData.get("evolution_token") as string;

    if (!nombre?.trim()) return;

    await prisma.local.create({
      data: {
        nombre: nombre.trim(),
        evolution_token: evolution_token?.trim() ?? "",
      },
    });

    revalidatePath("/admin/sucursales");
  } catch (error) {
    console.error("[crearLocal]", error);
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SucursalesPage() {
  const [locales, sucursales] = await Promise.all([
    prisma.local.findMany({ orderBy: { nombre: "asc" } }),
    prisma.sucursal.findMany({
      orderBy: { nombre: "asc" },
      include: {
        local: { select: { nombre: true } },
        _count: { select: { profesionales: true, citas: true } },
      },
    }),
  ]);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://nexreserva.cl";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/admin" className="text-xl font-bold text-gray-900">
            Nex<span className="text-cyan-500">Reserva</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-gray-600">
            <Link href="/admin/sucursales" className="text-cyan-600">Sucursales</Link>
            <Link href="/admin/profesionales" className="hover:text-cyan-600">Profesionales</Link>
            <Link href="/admin/servicios" className="hover:text-cyan-600">Servicios</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Crear Local */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Crear Local (Marca)</h2>
          <form action={crearLocal} className="grid sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Nombre del Local *</label>
              <input
                name="nombre"
                required
                placeholder="Ej: Studio Nova"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Evolution Token</label>
              <input
                name="evolution_token"
                placeholder="Token de instancia WhatsApp"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full">Crear Local</Button>
            </div>
          </form>
        </section>

        {/* Crear Sucursal */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Agregar Sucursal</h2>
          {locales.length === 0 ? (
            <p className="text-sm text-gray-400">Primero crea un local para poder agregar sucursales.</p>
          ) : (
            <form action={crearSucursal} className="grid sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Nombre de Sucursal *</label>
                <input
                  name="nombre"
                  required
                  placeholder="Ej: Studio Nova - Providencia"
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Local *</label>
                <select
                  name="local_id"
                  required
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                >
                  <option value="">Seleccionar local…</option>
                  {locales.map((l: { id: string; nombre: string }) => (
                    <option key={l.id} value={l.id}>{l.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <Button type="submit" className="w-full">Agregar Sucursal</Button>
              </div>
            </form>
          )}
        </section>

        {/* Listado de Sucursales */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Sucursales Registradas</h2>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Local</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">URL Pública</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Profesionales</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sucursales.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                      No hay sucursales aún.
                    </td>
                  </tr>
                ) : (
                  sucursales.map((s: { id: string; nombre: string; slug: string; limite_profesionales: number; local: { nombre: string }; _count: { profesionales: number; citas: number } }) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{s.nombre}</td>
                      <td className="px-6 py-4 text-gray-500">{s.local.nombre}</td>
                      <td className="px-6 py-4">
                        <a
                          href={`${baseUrl}/${s.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan-600 hover:underline font-mono text-xs"
                        >
                          /{s.slug}
                        </a>
                      </td>
                      <td className="px-6 py-4 text-right text-gray-700">
                        {s._count.profesionales} / {s.limite_profesionales}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <form action={eliminarSucursal}>
                          <input type="hidden" name="id" value={s.id} />
                          <button
                            type="submit"
                            className="text-xs text-red-500 hover:text-red-700 font-medium"
                            onClick={(e) => {
                              if (!confirm("¿Eliminar esta sucursal?")) e.preventDefault();
                            }}
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
