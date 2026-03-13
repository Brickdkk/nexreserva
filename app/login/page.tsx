"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        {/* Logo */}
        <div className="mb-10">
          <span className="text-3xl font-extrabold text-gray-900">
            Nex<span className="text-cyan-500">Reserva</span>
          </span>
        </div>

        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Accede a tu panel
        </h1>
        <p className="text-sm text-gray-400 mb-8">
          Inicia sesión con tu cuenta de Google para continuar.
        </p>

        <button
          onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
          className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {/* Google icon SVG */}
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
            <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continuar con Google
        </button>

        <p className="mt-8 text-xs text-gray-300">
          Solo usuarios con suscripción activa pueden acceder.
        </p>
      </div>
    </main>
  );
}
