"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatHora, formatPrice } from "@/lib/utils";

interface Servicio {
  id: string;
  nombre: string;
  duracion_minutos: number;
  precio: number;
}

interface Profesional {
  id: string;
  nombre: string;
  foto_url: string;
}

interface Slot {
  inicio: string; // ISO string
  fin: string;
}

interface BookingFormProps {
  sucursalId: string;
  sucursalSlug: string;
  servicios: Servicio[];
  profesionales: Profesional[];
}

type Step = "servicio" | "profesional" | "horario" | "contacto" | "confirmado";

export function BookingForm({
  sucursalId,
  servicios,
  profesionales,
}: BookingFormProps) {
  const [step, setStep] = useState<Step>("servicio");
  const [servicioId, setServicioId] = useState<string>("");
  const [profesionalId, setProfesionalId] = useState<string>("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotSeleccionado, setSlotSeleccionado] = useState<Slot | null>(null);
  const [telefono, setTelefono] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const servicio = servicios.find((s) => s.id === servicioId);
  const profesional = profesionales.find((p) => p.id === profesionalId);

  async function cargarSlots(profId: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/disponibilidad?profesional_id=${profId}&servicio_id=${servicioId}`,
      );
      if (!res.ok) throw new Error("No se pudo cargar disponibilidad.");
      const data = (await res.json()) as { slots: Slot[] };
      setSlots(data.slots);
    } catch {
      setError("Error al cargar horarios disponibles. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmarReserva() {
    if (!slotSeleccionado || !telefono.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sucursal_id: sucursalId,
          profesional_id: profesionalId,
          servicio_id: servicioId,
          cliente_telefono: telefono.trim(),
          fecha_hora_inicio: slotSeleccionado.inicio,
          fecha_hora_fin: slotSeleccionado.fin,
        }),
      });
      if (!res.ok) throw new Error("No se pudo confirmar la reserva.");
      setStep("confirmado");
    } catch {
      setError("Error al confirmar la reserva. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  // ── Step: Servicio ──
  if (step === "servicio") {
    return (
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          1. Selecciona un servicio
        </h2>
        <div className="grid gap-3">
          {servicios.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setServicioId(s.id);
                setStep("profesional");
              }}
              className="w-full text-left bg-white border-2 border-gray-200 hover:border-cyan-400 rounded-xl p-4 transition-colors group"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-gray-900 group-hover:text-cyan-700">
                    {s.nombre}
                  </p>
                  <p className="text-sm text-gray-400">{s.duracion_minutos} min</p>
                </div>
                <span className="text-lg font-bold text-cyan-600">
                  {formatPrice(s.precio)}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Step: Profesional ──
  if (step === "profesional") {
    return (
      <div>
        <button
          onClick={() => setStep("servicio")}
          className="text-sm text-gray-400 hover:text-gray-700 mb-4 flex items-center gap-1"
        >
          ← Volver
        </button>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          2. Elige a tu profesional
        </h2>
        <p className="text-sm text-gray-400 mb-6">
          Servicio: <strong>{servicio?.nombre}</strong>
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {profesionales.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setProfesionalId(p.id);
                cargarSlots(p.id);
                setStep("horario");
              }}
              className="flex flex-col items-center gap-3 bg-white border-2 border-gray-200 hover:border-cyan-400 rounded-xl p-5 transition-colors group"
            >
              {p.foto_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.foto_url}
                  alt={p.nombre}
                  className="w-16 h-16 rounded-full object-cover border-2 border-cyan-100"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600 text-2xl font-bold">
                  {p.nombre.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm font-semibold text-gray-900 group-hover:text-cyan-700 text-center">
                {p.nombre}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Step: Horario ──
  if (step === "horario") {
    return (
      <div>
        <button
          onClick={() => setStep("profesional")}
          className="text-sm text-gray-400 hover:text-gray-700 mb-4 flex items-center gap-1"
        >
          ← Volver
        </button>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          3. Elige tu horario
        </h2>
        <p className="text-sm text-gray-400 mb-6">
          Con <strong>{profesional?.nombre}</strong> — {servicio?.nombre}
        </p>

        {loading && (
          <p className="text-center text-gray-400 py-10">Cargando horarios disponibles…</p>
        )}
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        {!loading && slots.length === 0 && !error && (
          <p className="text-gray-400 text-center py-10">
            No hay horarios disponibles para hoy. Selecciona otro profesional.
          </p>
        )}

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {slots.map((slot) => (
            <button
              key={slot.inicio}
              onClick={() => {
                setSlotSeleccionado(slot);
                setStep("contacto");
              }}
              className="bg-white border-2 border-gray-200 hover:border-cyan-400 hover:bg-cyan-50 rounded-lg px-3 py-3 text-sm font-semibold text-gray-700 hover:text-cyan-700 transition-colors"
            >
              {formatHora(new Date(slot.inicio))}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Step: Contacto ──
  if (step === "contacto") {
    return (
      <div>
        <button
          onClick={() => setStep("horario")}
          className="text-sm text-gray-400 hover:text-gray-700 mb-4 flex items-center gap-1"
        >
          ← Volver
        </button>
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          4. Confirma tu reserva
        </h2>

        {/* Resumen */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Servicio</span>
            <span className="font-semibold">{servicio?.nombre}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Profesional</span>
            <span className="font-semibold">{profesional?.nombre}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Horario</span>
            <span className="font-semibold">
              {slotSeleccionado
                ? `${formatHora(new Date(slotSeleccionado.inicio))} — ${formatHora(new Date(slotSeleccionado.fin))}`
                : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Precio</span>
            <span className="font-bold text-cyan-600">{formatPrice(servicio?.precio ?? 0)}</span>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tu número de WhatsApp *
          </label>
          <input
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="56912345678 (sin +)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          />
          <p className="text-xs text-gray-400 mt-1">
            Recibirás confirmación y recordatorio por WhatsApp.
          </p>
        </div>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <Button
          onClick={confirmarReserva}
          loading={loading}
          disabled={!telefono.trim()}
          size="lg"
          className="w-full"
        >
          Confirmar Reserva
        </Button>
      </div>
    );
  }

  // ── Step: Confirmado ──
  return (
    <div className="text-center py-10">
      <div className="text-5xl mb-4">🎉</div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Reserva Confirmada!</h2>
      <p className="text-gray-500 mb-1">
        <strong>{servicio?.nombre}</strong> con <strong>{profesional?.nombre}</strong>
      </p>
      <p className="text-gray-500 mb-6">
        {slotSeleccionado && formatHora(new Date(slotSeleccionado.inicio))} —{" "}
        Recibirás un recordatorio 24h antes por WhatsApp.
      </p>
      <Button onClick={() => setStep("servicio")} variant="secondary">
        Hacer otra reserva
      </Button>
    </div>
  );
}
