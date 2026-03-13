/**
 * auth.config.ts — configuración Edge-safe de NextAuth.
 * NO importa Prisma, pg, ni ningún módulo Node.js.
 * Usado exclusivamente por middleware.ts (Edge runtime).
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
  session: { strategy: "jwt" },
  callbacks: {
    // El middleware usa esto para leer la sesión del JWT sin tocar la BD
    session({ session, token }) {
      if (token) {
        session.user.id = (token.id as string) ?? "";
        session.user.subscriptionPlan = (token.subscriptionPlan as string) ?? null;
        session.user.subscriptionUntil = token.subscriptionUntil
          ? new Date(token.subscriptionUntil as string)
          : null;
      }
      return session;
    },
  },
};
