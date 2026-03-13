/**
 * auth.ts — configuración completa de NextAuth (Node.js runtime).
 * Usa PrismaAdapter + session callback que consulta la BD.
 * Importado SOLO en Server Components y Route Handlers, nunca en middleware.
 */
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  // Sobrescribir session strategy a "jwt" (necesario con PrismaAdapter en v5 beta)
  session: { strategy: "jwt" },
  adapter: PrismaAdapter(prisma),
  callbacks: {
    ...authConfig.callbacks,
    // Enriquecer el JWT con datos de suscripción desde la BD
    async jwt({ token, user, trigger, account }) {
      // En login inicial o cuando se hace update(), refrescar desde BD
      if (user) {
        token.id = user.id;
      }
      if (token.id && (trigger === "signIn" || trigger === "update" || !token.subscriptionPlan)) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { subscriptionPlan: true, subscriptionUntil: true },
        });
        token.subscriptionPlan = dbUser?.subscriptionPlan ?? null;
        token.subscriptionUntil = dbUser?.subscriptionUntil?.toISOString() ?? null;
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
});
