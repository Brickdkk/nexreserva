/**
 * auth.ts — configuración completa de NextAuth (Node.js runtime).
 * SIN PrismaAdapter — usa JWT puro + upsert manual en signIn callback.
 * Importado en Server Components y Route Handlers, nunca en middleware.
 */
import NextAuth from "next-auth";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  callbacks: {
    // Al hacer login con Google: crear o actualizar el usuario en BD
    async signIn({ user, account, profile }) {
      if (!user.email) return false;
      try {
        await prisma.user.upsert({
          where: { email: user.email },
          update: {
            name: user.name ?? undefined,
            image: user.image ?? undefined,
          },
          create: {
            email: user.email,
            name: user.name ?? null,
            image: user.image ?? null,
          },
        });
        return true;
      } catch (err) {
        console.error("[signIn callback]", err);
        return false;
      }
    },

    // Construir el JWT con id + datos de suscripción desde BD
    async jwt({ token, user, trigger, account }) {
      // En login inicial: buscar el usuario en BD por email
      if (user?.email && !token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { id: true, subscriptionPlan: true, subscriptionUntil: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.subscriptionPlan = dbUser.subscriptionPlan ?? null;
          token.subscriptionUntil = dbUser.subscriptionUntil?.toISOString() ?? null;
        }
      }

      // En update() (después de activar suscripción): refrescar desde BD
      if (token.id && trigger === "update") {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { subscriptionPlan: true, subscriptionUntil: true },
        });
        if (dbUser) {
          token.subscriptionPlan = dbUser.subscriptionPlan ?? null;
          token.subscriptionUntil = dbUser.subscriptionUntil?.toISOString() ?? null;
        }
      }

      return token;
    },

    // Exponer datos del JWT en la sesión del cliente
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
