// Flujo 4: Reserva B2C pública — acceso por slug de la sucursal
// Fuerza renderizado dinámico (slug de sucursal es dinámico; requiere BD).
export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { BookingForm } from "@/components/booking/booking-form";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const sucursal = await prisma.sucursal.findUnique({
    where: { slug },
    include: { local: { select: { nombre: true } } },
  });

  if (!sucursal) return { title: "Sucursal no encontrada" };

  return {
    title: `Reservar en ${sucursal.nombre} — NexReserva`,
    description: `Agenda tu cita en ${sucursal.nombre} (${sucursal.local.nombre}) de forma rápida y sin llamadas.`,
  };
}

export default async function ReservaPage({ params }: Props) {
  const { slug } = await params;

  const sucursal = await prisma.sucursal.findUnique({
    where: { slug },
    include: {
      local: { select: { nombre: true } },
      servicios: {
        orderBy: { nombre: "asc" },
        select: { id: true, nombre: true, duracion_minutos: true, precio: true },
      },
      profesionales: {
        orderBy: { nombre: "asc" },
        select: { id: true, nombre: true, foto_url: true },
      },
    },
  });

  if (!sucursal) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-5">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-1 font-semibold">
            {sucursal.local.nombre}
          </p>
          <h1 className="text-2xl font-extrabold text-gray-900">{sucursal.nombre}</h1>
          <p className="text-sm text-gray-400 mt-1">
            Reserva tu cita en segundos, sin llamadas.
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {sucursal.servicios.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
            Este negocio aún no tiene servicios disponibles.
          </div>
        ) : sucursal.profesionales.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
            No hay profesionales disponibles en este momento.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-8">
            <BookingForm
              sucursalId={sucursal.id}
              sucursalSlug={sucursal.slug}
              servicios={sucursal.servicios}
              profesionales={sucursal.profesionales}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-xs text-gray-300">
        Powered by{" "}
        <a href="/" className="text-cyan-400 hover:underline">
          NexReserva
        </a>
      </footer>
    </div>
  );
}
