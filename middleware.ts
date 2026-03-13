/**
 * middleware.ts — Edge runtime.
 * Importa NextAuth con la config Edge-safe (sin Prisma/pg).
 * La sesión viene del JWT (no consulta la BD).
 */
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Rutas públicas: landing, login, booking B2C, API
  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/disponibilidad") ||
    pathname.startsWith("/api/reservas") ||
    pathname.startsWith("/api/checkout") ||
    // slug del negocio B2C — cualquier ruta de un solo segmento sin /admin ni /profesional
    (pathname.split("/").length === 2 &&
      !pathname.startsWith("/admin") &&
      !pathname.startsWith("/profesional") &&
      !pathname.startsWith("/onboarding"));

  if (isPublic) return NextResponse.next();

  // Sin sesión → login
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Con sesión pero sin suscripción activa → onboarding
  const until = session.user.subscriptionUntil
    ? new Date(session.user.subscriptionUntil)
    : null;
  const hasActiveSub = until && until > new Date();

  if (!hasActiveSub && !pathname.startsWith("/onboarding")) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
