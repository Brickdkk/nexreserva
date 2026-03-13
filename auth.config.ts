/**
 * auth.config.ts — configuración Edge-safe de NextAuth.
 * NO importa Prisma, pg, ni ningún módulo Node.js.
 * Usado exclusivamente por middleware.ts (Edge runtime).
 * El auth.ts completo (con PrismaAdapter) es usado en Server Components / Route Handlers.
 */
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    // Este callback corre en Edge: solo lee el JWT, no toca la BD.
    authorized({ auth, request: { nextUrl } }) {
      // Retornar true/false no es suficiente para nuestro flujo complejo;
      // lo manejamos manualmente en middleware.ts usando auth() como función.
      return true;
    },
    jwt({ token, user, account }) {
      // Persistir id y datos de suscripción en el JWT
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.subscriptionPlan = (token.subscriptionPlan as string) ?? null;
        session.user.subscriptionUntil = token.subscriptionUntil
          ? new Date(token.subscriptionUntil as string)
          : null;
      }
      return session;
    },
  },
  // JWT session: necesario para que el middleware pueda leer la sesión sin BD
  session: { strategy: "jwt" },
};
