"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function OnboardingPage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/subscription/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Código inválido o ya utilizado.");
      } else {
        router.push("/admin");
      }
    } catch {
      setError("Error de conexión. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <span className="text-3xl font-extrabold text-gray-900">
            Nex<span className="text-cyan-500">Reserva</span>
          </span>
        </div>

        <div className="border border-gray-200 rounded-2xl p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-1">
            Activa tu cuenta
          </h1>
          <p className="text-sm text-gray-400 mb-8">
            Ingresa tu código de acceso o adquiere un plan para comenzar.
          </p>

          {/* Formulario key */}
          <form onSubmit={handleRedeem} className="space-y-3">
            <input
              type="text"
              placeholder="XXXXXXXX-XXXX"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono tracking-widest uppercase placeholder:normal-case placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              maxLength={20}
            />
            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading || code.length < 6}>
              {loading ? "Verificando..." : "Activar código"}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-gray-300">o</span>
            </div>
          </div>

          {/* Planes */}
          <div className="space-y-3">
            <a
              href="/api/checkout/basico"
              className="flex items-center justify-between w-full border border-gray-200 rounded-xl px-5 py-4 hover:border-cyan-500 hover:bg-cyan-50 transition-colors group"
            >
              <div>
                <p className="text-sm font-semibold text-gray-900 group-hover:text-cyan-700">
                  Plan Básico
                </p>
                <p className="text-xs text-gray-400">1 sucursal · hasta 6 profesionales</p>
              </div>
              <span className="text-sm font-bold text-gray-900">$14.990<span className="text-xs font-normal text-gray-400">/mes</span></span>
            </a>
            <a
              href="/api/checkout/avanzado"
              className="flex items-center justify-between w-full border border-gray-200 rounded-xl px-5 py-4 hover:border-cyan-500 hover:bg-cyan-50 transition-colors group"
            >
              <div>
                <p className="text-sm font-semibold text-gray-900 group-hover:text-cyan-700">
                  Plan Avanzado
                </p>
                <p className="text-xs text-gray-400">1 sucursal · hasta 10 profesionales</p>
              </div>
              <span className="text-sm font-bold text-gray-900">$22.990<span className="text-xs font-normal text-gray-400">/mes</span></span>
            </a>
            <a
              href="/api/checkout/multi_basico"
              className="flex items-center justify-between w-full border-2 border-cyan-500 rounded-xl px-5 py-4 hover:bg-cyan-50 transition-colors group relative"
            >
              <span className="absolute -top-2.5 left-4 bg-cyan-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                Más popular
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Plan Multi-Básico
                </p>
                <p className="text-xs text-gray-400">Sucursales ilimitadas · 6 profesionales c/u</p>
              </div>
              <span className="text-sm font-bold text-gray-900">$27.990<span className="text-xs font-normal text-gray-400">/mes</span></span>
            </a>
            <a
              href="/api/checkout/multi_avanzado"
              className="flex items-center justify-between w-full border border-gray-200 rounded-xl px-5 py-4 hover:border-cyan-500 hover:bg-cyan-50 transition-colors group"
            >
              <div>
                <p className="text-sm font-semibold text-gray-900 group-hover:text-cyan-700">
                  Plan Multi-Avanzado
                </p>
                <p className="text-xs text-gray-400">Sucursales ilimitadas · 10 profesionales c/u</p>
              </div>
              <span className="text-sm font-bold text-gray-900">$36.990<span className="text-xs font-normal text-gray-400">/mes</span></span>
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
