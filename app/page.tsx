// Flujo 1: Landing Page B2B — Captación del dueño del local
// Hero + sección de precios con dos planes en CLP

import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* ───────── NAV ───────── */}
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <span className="text-xl font-bold text-gray-900">
            Nex<span className="text-cyan-500">Reserva</span>
          </span>
          <div className="flex items-center gap-3">
            <a
              href="/admin"
              className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Acceder
            </a>
            <a href="#planes">
              <Button size="sm">Ver Planes</Button>
            </a>
          </div>
        </div>
      </nav>

      {/* ───────── HERO ───────── */}
      <section className="bg-white pt-20 pb-24 px-4 sm:px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <span className="inline-block bg-cyan-50 text-cyan-600 text-xs font-semibold px-3 py-1 rounded-full mb-6 tracking-wide uppercase">
            Micro-SaaS para Chile 🇨🇱
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight">
            Tu negocio atiende, agenda y{" "}
            <span className="text-cyan-500">recuerda citas</span> en piloto
            automático
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Conectamos tu barbería, salón o clínica veterinaria con WhatsApp y
            Google Calendar. Cero inasistencias, cero llamadas perdidas.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#planes">
              <Button size="lg" className="w-full sm:w-auto">
                Ver Planes
              </Button>
            </a>
            <a
              href="#como-funciona"
              className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              ¿Cómo funciona? →
            </a>
          </div>
        </div>
      </section>

      {/* ───────── CÓMO FUNCIONA ───────── */}
      <section
        id="como-funciona"
        className="bg-gray-50 py-20 px-4 sm:px-6"
      >
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            Todo en un solo sistema
          </h2>
          <p className="text-center text-gray-500 mb-14 max-w-xl mx-auto">
            Tus clientes reservan online, reciben recordatorios y tú gestionas
            todo desde el panel.
          </p>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                icon: "📅",
                title: "Reserva en segundos",
                desc: "El cliente elige servicio, profesional, día y hora desde su celular sin llamar.",
              },
              {
                icon: "🤖",
                title: "IA por WhatsApp",
                desc: "El bot responde 24/7, guía al cliente y envía recordatorios 24h antes.",
              },
              {
                icon: "📊",
                title: "Finanzas en tiempo real",
                desc: "Ve ingresos, servicios pagados y clientes frecuentes en tu dashboard.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm text-center"
              >
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── PLANES / PRICING ───────── */}
      <section id="planes" className="bg-white py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            Planes simples, sin sorpresas
          </h2>
          <p className="text-center text-gray-500 mb-14">
            Paga mensual. Cancela cuando quieras.
          </p>
          <div className="grid sm:grid-cols-2 gap-8">
            {/* Plan 1 Sucursal */}
            <div className="rounded-2xl border-2 border-gray-200 p-8 flex flex-col">
              <h3 className="text-xl font-bold text-gray-900">1 Sucursal</h3>
              <p className="text-gray-500 text-sm mt-1">
                Ideal para negocios con una sola ubicación.
              </p>
              <div className="mt-6 mb-8">
                <span className="text-4xl font-extrabold text-gray-900">
                  $15.990
                </span>
                <span className="text-gray-400 text-sm ml-1">CLP / mes</span>
              </div>
              <ul className="space-y-3 text-sm text-gray-600 mb-8 flex-1">
                {[
                  "Hasta 10 profesionales",
                  "Reserva B2C por link único",
                  "Bot WhatsApp con IA",
                  "Recordatorios 24h automáticos",
                  "Integración Google Calendar",
                  "Dashboard de finanzas",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="text-cyan-500">✓</span> {f}
                  </li>
                ))}
              </ul>
              <a href="/admin">
                <Button className="w-full">Comenzar ahora</Button>
              </a>
            </div>

            {/* Plan Multi-Sucursal */}
            <div className="rounded-2xl border-2 border-cyan-500 p-8 flex flex-col relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-500 text-white text-xs font-semibold px-4 py-1 rounded-full">
                Más popular
              </span>
              <h3 className="text-xl font-bold text-gray-900">
                Multi-Sucursal
              </h3>
              <p className="text-gray-500 text-sm mt-1">
                Para cadenas con 2 o más locales.
              </p>
              <div className="mt-6 mb-8">
                <span className="text-4xl font-extrabold text-gray-900">
                  $27.990
                </span>
                <span className="text-gray-400 text-sm ml-1">CLP / mes</span>
              </div>
              <ul className="space-y-3 text-sm text-gray-600 mb-8 flex-1">
                {[
                  "Sucursales ilimitadas",
                  "Hasta 10 profesionales por sucursal",
                  "Link único por sucursal",
                  "Bot WhatsApp con IA multilocal",
                  "Recordatorios 24h automáticos",
                  "Integración Google Calendar",
                  "Dashboard consolidado global",
                  "Reportes por sucursal",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="text-cyan-500">✓</span> {f}
                  </li>
                ))}
              </ul>
              <a href="/admin">
                <Button className="w-full">Comenzar ahora</Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── FOOTER ───────── */}
      <footer className="bg-gray-50 border-t border-gray-200 py-10 px-4 sm:px-6 text-center">
        <p className="text-sm text-gray-400">
          © {new Date().getFullYear()} NexReserva · nexreserva.cl · Hecho en Chile 🇨🇱
        </p>
      </footer>
    </main>
  );
}
