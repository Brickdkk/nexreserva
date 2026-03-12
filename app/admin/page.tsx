// Flujo 2: Dashboard del Administrador — Finanzas, Reportes y Métricas
// Fuerza renderizado dinámico (requiere BD en tiempo real; no pre-renderizar).
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { StatCard } from "@/components/ui/card";
import Link from "next/link";

async function getDashboardData() {
  const [ingresosSemana, ingresosMes, ingresosAnio, totalCanceladas, clientesFrecuentes] =
    await Promise.all([
      // Ingresos semana (últimos 7 días, citas pagadas)
      prisma.cita.findMany({
        where: {
          estado: "pagada",
          fecha_hora_inicio: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        include: { servicio: true },
      }),
      // Ingresos mes (últimos 30 días)
      prisma.cita.findMany({
        where: {
          estado: "pagada",
          fecha_hora_inicio: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        include: { servicio: true },
      }),
      // Ingresos año
      prisma.cita.findMany({
        where: {
          estado: "pagada",
          fecha_hora_inicio: {
            gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
          },
        },
        include: { servicio: true },
      }),
      // Total canceladas
      prisma.cita.count({
        where: {
          estado: { in: ["cancelada_cliente", "cancelada_barbero"] },
        },
      }),
      // Clientes frecuentes (top 10 por número telefónico)
      prisma.cita.groupBy({
        by: ["cliente_telefono"],
        _count: { cliente_telefono: true },
        orderBy: { _count: { cliente_telefono: "desc" } },
        take: 10,
      }),
    ]);

  const sumaPrecios = (citas: { servicio: { precio: number } }[]) =>
    citas.reduce((acc, c) => acc + c.servicio.precio, 0);

  return {
    ingresosSemana: sumaPrecios(ingresosSemana),
    serviciosSemana: ingresosSemana.length,
    ingresosMes: sumaPrecios(ingresosMes),
    serviciosMes: ingresosMes.length,
    ingresosAnio: sumaPrecios(ingresosAnio),
    serviciosAnio: ingresosAnio.length,
    totalCanceladas,
    clientesFrecuentes,
  };
}

export default async function AdminDashboard() {
  const data = await getDashboardData();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-xl font-bold text-gray-900">
              Nex<span className="text-cyan-500">Reserva</span>
            </span>
            <span className="ml-3 text-sm text-gray-400">Panel Administrador</span>
          </div>
          <nav className="flex items-center gap-4 text-sm font-medium text-gray-600">
            <Link href="/admin/sucursales" className="hover:text-cyan-600 transition-colors">
              Sucursales
            </Link>
            <Link href="/admin/profesionales" className="hover:text-cyan-600 transition-colors">
              Profesionales
            </Link>
            <Link href="/admin/servicios" className="hover:text-cyan-600 transition-colors">
              Servicios
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">
          Finanzas y Reportes
        </h1>

        {/* Stats semana */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Esta semana
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StatCard
              label="Ingresos semana"
              value={formatPrice(data.ingresosSemana)}
              sub="citas pagadas"
            />
            <StatCard
              label="Servicios realizados"
              value={data.serviciosSemana}
              sub="últimos 7 días"
            />
            <StatCard
              label="Cancelaciones"
              value={data.totalCanceladas}
              sub="total histórico"
            />
          </div>
        </section>

        {/* Stats mes */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Este mes
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StatCard
              label="Ingresos mes"
              value={formatPrice(data.ingresosMes)}
              sub="citas pagadas"
            />
            <StatCard
              label="Servicios realizados"
              value={data.serviciosMes}
              sub="últimos 30 días"
            />
            <StatCard
              label="Ingresos año"
              value={formatPrice(data.ingresosAnio)}
              sub="últimos 12 meses"
            />
          </div>
        </section>

        {/* Clientes frecuentes */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Clientes frecuentes (Top 10)
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    #
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Teléfono WhatsApp
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Visitas
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.clientesFrecuentes.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-400">
                      Aún no hay datos de clientes.
                    </td>
                  </tr>
                ) : (
                  data.clientesFrecuentes.map((c: { cliente_telefono: string; _count: { cliente_telefono: number } }, i: number) => (
                    <tr key={c.cliente_telefono} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-400 font-mono">{i + 1}</td>
                      <td className="px-6 py-4 text-gray-900 font-medium">
                        +{c.cliente_telefono}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-700 font-semibold">
                        {c._count.cliente_telefono}
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
